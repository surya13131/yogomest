import {
  fetchSrsSeatLayout,
  fetchVrlSeatLayout,
  fetchEzeeSeatLayout,
  fetchCitySuggestions,
  blockSrsSeat,
  blockVrlSeat,
  blockEzeeSeat,
} from "../components/api";

export interface NormalizedSeat {
  id: string;
  row: number;
  col: number;
  isUpper: boolean;
  isAvailable: boolean;
  isLadies: boolean;
  isMale?: boolean;
  isSleeper: boolean;
  fare: number;
  isRotated?: boolean;
}
const fullDecodeBusType = (raw: string): string => {
  if (!raw || raw === "undefined" || raw === "null") return "";
  let s = String(raw);
  try { s = decodeURIComponent(s); } catch (_) {}
  try { s = decodeURIComponent(s); } catch (_) {}
  return s.trim();
};

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT META
// ─────────────────────────────────────────────────────────────────────────────
export const analyzeLayoutMeta = (deck: NormalizedSeat[], busTypeRaw?: string) => {
  const defaults = {
    hasPreSpacedRows: false,
    hasSleeper:       false,
    maxRow:           0,
    maxCol:           3,
    totalCols:        4,
    aisleAfterCol:    0,
    spacedRows:       [] as number[],
  };

  if (!deck || deck.length === 0) return defaults;

  const rows      = Array.from(new Set(deck.map(s => s.row || 0))).sort((a, b) => a - b);
  const spacedRows: number[] = [];
  let   hasGaps   = false;

  for (let i = 0; i < rows.length - 1; i++) {
    if (rows[i + 1] - rows[i] > 1) { hasGaps = true; spacedRows.push(rows[i]); }
  }

  const definedMaxCol = deck.length > 0 ? Math.max(...deck.map(s => s.col || 0)) : defaults.maxCol;
  const definedMinCol = deck.length > 0 ? Math.min(...deck.map(s => s.col || 0)) : 0;
  const totalCols     = definedMaxCol - definedMinCol + 1;

  return {
    hasPreSpacedRows: hasGaps,
    hasSleeper:       deck.some(s => s.isSleeper),
    maxRow:           deck.length > 0 ? Math.max(...rows) : defaults.maxRow,
    maxCol:           definedMaxCol,
    totalCols,
    aisleAfterCol:    0,
    spacedRows,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: parse boarding / dropping stage strings
// ─────────────────────────────────────────────────────────────────────────────
const parseStages = (stageString: string | any[] | Record<string, any>) => {
  if (!stageString) return [];

  if (typeof stageString === "string") {
    const items = stageString
      .split(/[~#;]+/)
      .map(item => String(item).trim())
      .filter(Boolean);

    return items
      .map((item: string) => {
        const parts  = item.split("|").map(p => String(p).trim());
        const first  = parts[0] || "";
        const second = parts[1] || "";
        const third  = parts[2] || "";
        const fourth = parts[3] || "";
        const looksLikeTime = /\d{1,2}:\d{2}\s?(AM|PM)?/i.test(second);
        return {
          stage_id: first,
          id:       first,
          time:     looksLikeTime ? second : third,
          stage:    looksLikeTime ? third  : second,
          name:     looksLikeTime ? third  : second,
          location: fourth,
        };
      })
      .filter(item => Boolean(item.stage_id || item.id || item.stage || item.name));
  }

  const stageArray = Array.isArray(stageString) ? stageString : Object.values(stageString);

  if (Array.isArray(stageArray) && stageArray.length > 0) {
    return stageArray.map((item: any) => ({
      stage_id:
        item.PickupID    || item.PickupId    || item.Value       || item.value      ||
        item.Id          || item.pickupId    || item.DropID      || item.DropId     ||
        item.dropId      || item.id          || item.code        || item.stationCode ||
        item.pointCode   || item.stageId     || item.bpId        || item.dpId       ||
        item.LocationId  || item.cityPointId || item.pointId,
      id:
        item.PickupID    || item.PickupId    || item.Value       || item.value      ||
        item.Id          || item.pickupId    || item.DropID      || item.DropId     ||
        item.dropId      || item.id          || item.code        || item.stationCode ||
        item.pointCode   || item.stageId     || item.bpId        || item.dpId       ||
        item.LocationId  || item.cityPointId || item.pointId,
      time:
        item.PickupTime  || item.pickupTime  || item.DropTime    || item.dropTime   ||
        item.time        || item.departureTime || item.bpTime    || item.dpTime     ||
        item.Time        || item.pointTime   || "",
      stage:
        item.PickupName  || item.pickupName  || item.DropName    || item.dropName   ||
        item.name        || item.stage       || item.location    || item.bpName     ||
        item.dpName      || item.locationName || item.LocationName || item.pointName || "",
      name:
        item.PickupName  || item.pickupName  || item.DropName    || item.dropName   ||
        item.name        || item.stage       || item.location    || item.bpName     ||
        item.dpName      || item.locationName || item.LocationName || item.pointName || "",
      location:
        item.location    || item.address     || item.landmark    ||
        item.Address     || item.Landmark    || "",
    }));
  }

  return [];
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: deep-search a nested object for boarding/dropping point arrays
// ─────────────────────────────────────────────────────────────────────────────
const findPointsArray = (obj: any, keywords: string[]): any => {
  if (!obj || typeof obj !== "object") return [];
  if (!Array.isArray(obj)) {
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      if (keywords.some(k => lowerKey.includes(k))) {
        const val = obj[key];
        if (Array.isArray(val) && val.length > 0) {
          const firstItem = val[0];
          if (firstItem && typeof firstItem === "object") {
            if (
              !firstItem.hasOwnProperty("seatCode") &&
              !firstItem.hasOwnProperty("SeatNo") &&
              !firstItem.hasOwnProperty("seatName")
            ) return val;
          } else if (typeof firstItem === "string") {
            return val;
          }
        } else if (
          typeof val === "string" &&
          (val.includes("|") || val.includes("~") || val.includes("#") || val.includes(";"))
        ) {
          return val;
        }
      }
    }
  }
  const valuesToSearch = Array.isArray(obj) ? obj : Object.values(obj);
  for (const val of valuesToSearch) {
    if (typeof val === "object" && val !== null) {
      const res = findPointsArray(val, keywords);
      if (
        (Array.isArray(res) && res.length > 0) ||
        (typeof res === "string" && res.length > 0)
      ) return res;
    }
  }
  return [];
};

const extractEzeePointsSource = (
  rawData: any,
  directKeys: string[],
  type: "bp" | "dp"
) => {
  if (type === "bp") {
    const bp =
      rawData?.data?.fromStation?.stationPoint ||
      rawData?.data?.fromStation?.points       ||
      rawData?.data?.fromStation?.routePoints  ||
      rawData?.data?.fromStation;
    if (bp !== undefined && bp !== null) return bp;
  }

  if (type === "dp") {
    const dp =
      rawData?.data?.toStation?.stationPoint ||
      rawData?.data?.toStation?.points       ||
      rawData?.data?.toStation?.routePoints  ||
      rawData?.data?.toStation;
    if (dp !== undefined && dp !== null) return dp;
  }

  const scopes = [
    rawData?.data?.bus,
    rawData?.data?.trip,
    rawData?.data,
    rawData?.bus,
    rawData,
  ];

  for (const scope of scopes) {
    if (!scope || typeof scope !== "object") continue;
    for (const key of directKeys) {
      if (scope[key] !== undefined && scope[key] !== null) return scope[key];
    }
  }

  return findPointsArray(rawData, directKeys.map(k => k.toLowerCase()));
};

// ═════════════════════════════════════════════════════════════════════════════
// ███████████████████  TRUST-BUT-VERIFY PIPELINE  ████████████████████████████
// ═════════════════════════════════════════════════════════════════════════════

/**
 * STEP 1 — Detect if the coordinate grid looks broken.
 *
 * Broken signals:
 *  • maxCol > 7          → columns clearly shifted/sparse (no bus has 8+ cols)
 *  • minCol < 0          → negative indices
 *  • uniqueCols > 7      → far too many distinct column values
 *  • row gap > 3         → large unexplained hole between consecutive rows
 *  • all seats same col  → API sent col=0 for everything (flat list bug)
 *  • occupancy < 40%     → grid is too sparse with ghost holes
 */
const isBrokenLayout = (seats: NormalizedSeat[]): boolean => {
  if (!seats || seats.length < 2) return false;

  const cols       = seats.map(s => s.col);
  const rows       = seats.map(s => s.row);
  const maxCol     = Math.max(...cols);
  const minCol     = Math.min(...cols);
  const uniqueCols = new Set(cols).size;
  const uniqueRows = new Set(rows).size;

  if (maxCol > 7)     { console.warn("[Layout] BROKEN: maxCol =", maxCol); return true; }
  if (minCol < 0)     { console.warn("[Layout] BROKEN: negative col"); return true; }
  if (uniqueCols > 7) { console.warn("[Layout] BROKEN: uniqueCols =", uniqueCols); return true; }

  // All seats crammed into a single column — API sent col=0 for all
  if (uniqueCols === 1 && seats.length > 4) {
    console.warn("[Layout] BROKEN: all seats in col 0");
    return true;
  }

  // Large unexplained row gaps (> 3 consecutive row numbers missing)
  const sortedRows = [...new Set(rows)].sort((a, b) => a - b);
  for (let i = 1; i < sortedRows.length; i++) {
    if (sortedRows[i] - sortedRows[i - 1] > 3) {
      console.warn("[Layout] BROKEN: row gap", sortedRows[i - 1], "→", sortedRows[i]);
      return true;
    }
  }

  // Sparsity: if grid occupancy < 40% it is too gappy
  const expectedSlots = uniqueRows * uniqueCols;
  const occupancy     = seats.length / expectedSlots;
  if (expectedSlots > 8 && occupancy < 0.40) {
    console.warn("[Layout] BROKEN: sparse occupancy", (occupancy * 100).toFixed(1) + "%");
    return true;
  }

  return false;
};

/**
 * STEP 2a — Compress sparse column indices to a compact 0-based sequence.
 *
 * Example:  cols [0, 1, 5, 6]  →  [0, 1, 2, 3]
 * Preserves ONE aisle gap when a natural jump of > 1 exists between
 * consecutive column values, so the visual aisle still renders.
 */
const compressColumns = (seats: NormalizedSeat[]): NormalizedSeat[] => {
  const sortedUniqueCols = [...new Set(seats.map(s => s.col))].sort((a, b) => a - b);

  let compressedIdx = 0;
  const colMap      = new Map<number, number>();

  for (let i = 0; i < sortedUniqueCols.length; i++) {
    const prev = sortedUniqueCols[i - 1] ?? sortedUniqueCols[0];
    const curr = sortedUniqueCols[i];
    if (i > 0 && curr - prev > 1) compressedIdx++; // preserve ONE aisle slot
    colMap.set(curr, compressedIdx);
    compressedIdx++;
  }

  return seats.map(seat => ({ ...seat, col: colMap.get(seat.col) ?? seat.col }));
};

const extractSeatNumber = (seatId: string): number => {
  const match = String(seatId || "").toUpperCase().match(/(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};

const force21SleeperColumns = (seats: NormalizedSeat[]): NormalizedSeat[] => {
  if (!seats || seats.length === 0) return seats;

  const sortedSeats = [...seats].sort((a, b) => {
    const aNum = extractSeatNumber(a.id);
    const bNum = extractSeatNumber(b.id);
    if (aNum !== bNum) return aNum - bNum;
    return String(a.id).localeCompare(String(b.id), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  const result: NormalizedSeat[] = [];
  let row = 0;

  for (let i = 0; i < sortedSeats.length; i += 3) {
    const group = sortedSeats.slice(i, i + 3);

    if (group[0]) result.push({ ...group[0], row, col: 0 });
    if (group[1]) result.push({ ...group[1], row, col: 2 });
    if (group[2]) result.push({ ...group[2], row, col: 3 });

    row++;
  }

  return result;
};

const is21SleeperBus = (busType: string): boolean => {
  const normalized = String(busType || "").toLowerCase();
  return (
    /(^|\s)(2\+1|1\+2|2-1|1-2)(\s|$)/.test(normalized) ||
    (normalized.includes("sleeper") && !normalized.includes("seater"))
  );
};

const isMixedSleeperSeaterBus = (busType: string): boolean => {
  const normalized = String(busType || "").toLowerCase();
  return (
    normalized.includes("sleeper/seater") ||
    normalized.includes("semi sleeper") ||
    normalized.includes("semi-sleeper")
  );
};

const isSriBalajiBus = (operatorName: string, provider: string): boolean => {
  return (
    provider === "SRS" &&
    String(operatorName || "").toLowerCase().includes("balaji")
  );
};

const formatSriBalajiLayout = (seats: NormalizedSeat[], busType: string): NormalizedSeat[] => {
  if (!seats || seats.length === 0) return seats;

  const normalizedType = String(busType || "").toLowerCase();
  const isSleeperOnly =
    normalizedType.includes("sleeper") &&
    !normalizedType.includes("seater");

  if (!isSleeperOnly) return seats;

  const formatDeck = (deck: NormalizedSeat[]) => {
    const sorted = [...deck].sort((a, b) => {
      const getNum = (id: string) => Number(String(id).match(/\d+/)?.[0] || 0);
      return getNum(a.id) - getNum(b.id);
    });

    const cols = 3;

    let mapped = sorted.map((seat, index) => ({
      ...seat,
      row: Math.floor(index / cols),
      col: index % cols,
    }));

    const lastRow = Math.max(...mapped.map(s => s.row));
    const lastRowSeats = mapped.filter(s => s.row === lastRow);

    if (lastRowSeats.length < cols) {
      let colCounter = 0;
      mapped = mapped.map(seat => {
        if (seat.row === lastRow) {
          return { ...seat, col: colCounter++ };
        }
        return seat;
      });
    }

    return mapped;
  };

  const lower = seats.filter(s => !s.isUpper);
  const upper = seats.filter(s => s.isUpper);

  return [...formatDeck(lower), ...formatDeck(upper)];
};

/**
 * STEP 2b — Fix last-row gap for a single leftover seat.
 *
 * If the final row only contains one seat, move it down one row so
 * it does not become a broken floating tail row.
 */
const fixLastRowGap = (seats: NormalizedSeat[], busType?: string): NormalizedSeat[] => {
  if (!seats || seats.length === 0) return seats;

  const maxRow = Math.max(...seats.map(s => s.row));
  const lastRowSeats = seats.filter(s => s.row === maxRow);

  if (lastRowSeats.length === 1) {
    if (busType) {
      const busTypeStr = String(busType).toUpperCase().replace(/\s+/g, " ").trim();
      const isMixedBus = busTypeStr.includes("SEMI SLEEPER") || (busTypeStr.includes("SLEEPER") && busTypeStr.includes("SEATER"));
      const isSleeperOnly = busTypeStr.includes("SLEEPER") && !isMixedBus;
      if (busTypeStr.includes("2+2") || busTypeStr.includes("2-2") || (!isSleeperOnly && seats.length >= 38 && seats.length <= 58)) {
        return seats; // Do not merge single seat for 2+2 layouts
      }
    }

    const prevRow = maxRow - 1;
    return seats.map(seat =>
      seat.row === maxRow ? { ...seat, row: prevRow } : seat
    );
  }

  return seats;
};

/**
 * STEP 2c — Fallback full compact grid re-assignment.
 *
 * When column/row compression alone isn't enough (e.g. completely random
 * x/y values from a broken API), rebuild the grid from scratch:
 *  1. Group seats by their original row value.
 *  2. Within each row, sort by original col.
 *  3. Assign dense 0-based row & col indices.
 */
const compactSeatGrid = (seats: NormalizedSeat[]): NormalizedSeat[] => {
  const rowGroups = new Map<number, NormalizedSeat[]>();
  for (const seat of seats) {
    const r = seat.row;
    if (!rowGroups.has(r)) rowGroups.set(r, []);
    rowGroups.get(r)!.push(seat);
  }

  const sortedRowKeys = [...rowGroups.keys()].sort((a, b) => a - b);
  const result: NormalizedSeat[] = [];
  let newRow = 0;

  for (const rk of sortedRowKeys) {
    const rowSeats = rowGroups.get(rk)!.sort((a, b) => a.col - b.col);
    let newCol = 0;
    for (const seat of rowSeats) {
      result.push({ ...seat, row: newRow, col: newCol });
      newCol++;
    }
    newRow++;
  }

  return result;
};

/**
 * STEP 3 — Detect & fix upper/lower deck confusion.
 *
 * Some APIs set isUpper=false for all seats even on double-deckers.
 * When seat IDs clearly split into L/U or LB/UB groups but flags
 * are all false, re-derive from ID.
 */
const fixUpperLowerMix = (seats: NormalizedSeat[]): NormalizedSeat[] => {
  const hasUpperByFlag = seats.some(s => s.isUpper);
  const hasUpperById   = seats.some(s => /^(U|UB|USL|USU)\d+/i.test(s.id));
  const hasLowerById   = seats.some(s => /^(L|LB|LSL)\d+/i.test(s.id));

  if (!hasUpperByFlag && hasUpperById && hasLowerById) {
    console.warn("[Layout] Fixing upper/lower from seat IDs");
    return seats.map(seat => ({
      ...seat,
      isUpper: /^(U|UB|USL|USU)\d+/i.test(seat.id),
    }));
  }

  return seats;
};

/**
 * STEP 4 — Remove stray outlier seats far outside the main grid.
 *
 * A single seat at col=9 when every other seat is col 0–3 is a data error.
 * We remove seats whose col or row > median + safety margin.
 */
const removeOutlierSeats = (seats: NormalizedSeat[]): NormalizedSeat[] => {
  if (seats.length < 4) return seats;

  const cols = seats.map(s => s.col).sort((a, b) => a - b);
  const rows = seats.map(s => s.row).sort((a, b) => a - b);

  const medianCol = cols[Math.floor(cols.length / 2)];
  const medianRow = rows[Math.floor(rows.length / 2)];

  const maxAllowedCol = medianCol + 5;
  const maxAllowedRow = medianRow + 20; // buses can be long

  const filtered = seats.filter(s => s.col <= maxAllowedCol && s.row <= maxAllowedRow);

  if (filtered.length < seats.length) {
    console.warn(
      `[Layout] Removed ${seats.length - filtered.length} outlier seat(s):`,
      seats.filter(s => s.col > maxAllowedCol || s.row > maxAllowedRow).map(s => s.id)
    );
  }

  return filtered;
};
export const fixBrokenSeatLayout = (
  provider: string,
  seats: NormalizedSeat[],
  busType: string
): NormalizedSeat[] => {
  if (!seats || seats.length === 0) return seats;
  if (!["VRL", "SRS", "EZEE_V2", "EZEE_V3"].includes(provider)) return seats;

  if (provider === "VRL") {
    const normalizedBusType = String(busType || "").toLowerCase();
    const isMixedBus =
      isMixedSleeperSeaterBus(busType) ||
      (normalizedBusType.includes("sleeper") && normalizedBusType.includes("seater"));

    if (isMixedBus) {
      const normalizeRows = (deck: NormalizedSeat[]) => {
        const uniqueRows = [...new Set(deck.map(s => s.row))].sort((a, b) => a - b);

        const rowMap = new Map<number, number>();

        uniqueRows.forEach((r, idx) => {
          rowMap.set(r, idx);
        });

        return deck.map(seat => ({
          ...seat,
          row: rowMap.get(seat.row) ?? seat.row,
        }));
      };

      const lower = seats.filter(s => !s.isUpper);
      const upper = seats.filter(s => s.isUpper);

      return [
        ...normalizeRows(lower), // ✅ Only apply to lower deck
        ...upper,                // ❌ DO NOT change upper deck
      ];
    }

    // Restore original logic for non-mixed VRL buses (pure sleeper, 2+2, 2+1, etc.)
    return seats;
  }

  // ✅ PERFECT SRS 2+2 PARSER FIX: Use First Letter for Row
  if (provider === "SRS") {
    const busTypeStr = String(busType || "").toUpperCase().replace(/\s+/g, " ").trim();
    let is22Bus = busTypeStr.includes("2+2") || busTypeStr.includes("2-2");
    
    const isMixedBus = busTypeStr.includes("SEMI SLEEPER") || (busTypeStr.includes("SLEEPER") && busTypeStr.includes("SEATER"));
    const isSleeperBus = busTypeStr.includes("SLEEPER") && !isMixedBus && !is22Bus;
    
    if (!isSleeperBus && seats.length >= 38 && seats.length <= 58) {
      is22Bus = true;
    }

    if (is22Bus && !isMixedBus && seats.some(s => /^[A-Z]\d+/.test(s.id))) {
      console.log("[Layout] SRS 2+2 layout detected. Enforcing deterministic grid from seat letters.");
      const formattedSeats = seats.map(seat => {
        const seatId = String(seat.id).trim().toUpperCase();
        const rowLetter = seatId.charAt(0);
        const row = rowLetter.charCodeAt(0) - 65;

        const seatNum = parseInt(seatId.match(/\d+/)?.[0] || "1", 10);

        const colMap: Record<number, number> = {
          4: 0,
          3: 1,
          5: 2, // middle back seat
          2: 3,
          1: 4,
        };

        const col = colMap[seatNum] ?? seat.col;

        return {
          ...seat,
          row: (row >= 0 && row <= 26) ? row : seat.row,
          col,
        };
      });
      return normalizeSeatCoordinates(formattedSeats);
    }
  }

// ─────────────────────────────────────────────
// Fix: bottom floating seats
// ─────────────────────────────────────────────
const fixBottomMisalignedSeats = (seats: NormalizedSeat[]): NormalizedSeat[] => {
  if (!seats || seats.length === 0) return seats;

  const maxRow = Math.max(...seats.map(s => s.row));
  const lastRowSeats = seats.filter(s => s.row === maxRow);

  if (lastRowSeats.length > 0 && lastRowSeats.length <= 2) {
    console.warn("[Layout] Fixing bottom misaligned seats");

    return seats.map(seat =>
      seat.row === maxRow
        ? { ...seat, row: maxRow - 1 }
        : seat
    );
  }

  return seats;
};

// ─────────────────────────────────────────────
// STRICT FIX: ONLY for 2 seats → force [0,2]
// ─────────────────────────────────────────────
const fixLastRowTwoSeatLayout = (seats: NormalizedSeat[]): NormalizedSeat[] => {
  if (!seats || seats.length === 0) return seats;

  const maxRow = Math.max(...seats.map(s => s.row));
  const lastRowSeats = seats.filter(s => s.row === maxRow);

  // ❌ ONLY apply if exactly 2 seats
  if (lastRowSeats.length !== 2) return seats;

  const sorted = [...lastRowSeats].sort((a, b) => a.col - b.col);

  console.warn("[Layout] Fixing last row → forcing cols [0,2]");

  return seats.map(seat => {
    if (seat.row !== maxRow) return seat;

    if (seat.id === sorted[0].id) {
      return { ...seat, col: 0 };
    }

    if (seat.id === sorted[1].id) {
      return { ...seat, col: 2 };
    }

    return seat;
  });
};

// ─────────────────────────────────────────────
// MAIN CONDITION: Mixed sleeper + seater
// ─────────────────────────────────────────────
if (isMixedSleeperSeaterBus(busType)) {
  console.log(
    "[Layout] Mixed sleeper/seater detected — applying LIGHT repair",
    "COLS:",
    [...new Set(seats.map(s => s.col))].sort((a, b) => a - b)
  );

  const lower = seats.filter(s => !s.isUpper);
  const upper = seats.filter(s => s.isUpper);

  const fixDeck = (deck: NormalizedSeat[]) => {
    let result = deck;

    // Step 1
    result = compressColumns(result);

    // Step 2
    result = fixLastRowGap(result, busType);

    // Step 3
    result = fixBottomMisalignedSeats(result);

    // ✅ ONLY affects 2-seat last rows
    result = fixLastRowTwoSeatLayout(result);

    return result;
  };

  return [
    ...fixDeck(lower),
    ...fixDeck(upper),
  ];
}

  console.log(`[Layout] fixBrokenSeatLayout called for ${provider}, ${seats.length} seats`);

  // 1. Remove clear outliers
  let fixed = removeOutlierSeats(seats);

  // 2. Fix upper/lower confusion from seat IDs
  fixed = fixUpperLowerMix(fixed);

  // 3. Process each deck independently
  const lowerSeats = fixed.filter(s => !s.isUpper);
  const upperSeats = fixed.filter(s =>  s.isUpper);

  const repairDeck = (deckSeats: NormalizedSeat[], label: string): NormalizedSeat[] => {
    if (deckSeats.length === 0) return deckSeats;

    if (provider === "SRS") {
      console.warn(`[Layout] ${label} deck is SRS; preserving row positions and using parser coordinates`);
      return compressColumns(deckSeats);
    }

if (is21SleeperBus(busType))  {
      console.warn(`[Layout] ${label} deck appears to be 2+1 sleeper; enforcing 21 column template`);
      return force21SleeperColumns(deckSeats);
    }

    if (!isBrokenLayout(deckSeats)) {
      console.log(`[Layout] ${label} deck OK — no repair needed`);
      return deckSeats;
    }

    console.warn(`[Layout] ${label} deck BROKEN — running repair`);

    // Attempt 1: column compression only
    let repaired = compressColumns(deckSeats);

    if (!isBrokenLayout(repaired)) {
      console.log(`[Layout] ${label} deck repaired by compression`);
      return repaired;
    }

    // Attempt 2: full compact grid rebuild
    repaired = compactSeatGrid(deckSeats);
    console.log(`[Layout] ${label} deck rebuilt via compactSeatGrid`);
    return repaired;
  };

  const repairedLower = fixLastRowGap(repairDeck(lowerSeats, "Lower"), busType);
  const repairedUpper = fixLastRowGap(repairDeck(upperSeats, "Upper"), busType);

  // 4. Re-normalize each deck to 0-based coords
  const reLower = normalizeSeatCoordinates(repairedLower);
  const reUpper = normalizeSeatCoordinates(repairedUpper);

  console.log(`[Layout] Final — lower: ${reLower.length} seats, upper: ${reUpper.length} seats`);

  return [...reLower, ...reUpper];
};

// ─────────────────────────────────────────────────────────────────────────────
// GHOST SEAT FILTER + BUS TYPE RULES
// ─────────────────────────────────────────────────────────────────────────────
const applyBusTypeRules = (
  seats: NormalizedSeat[],
  busType: string
): NormalizedSeat[] => {
  if (!seats || seats.length === 0) return seats;

  const validSeats = seats.filter(
    s => s && s.id && !/DRIVER|TV|SPACE|EMPTY|DOOR|GY|^\.$/i.test(String(s.id))
  );

  const busTypeStr = fullDecodeBusType(busType)
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

  let is22Bus =
    busTypeStr.startsWith("2+2") || busTypeStr.startsWith("2-2") ||
    busTypeStr.includes(" 2+2") || busTypeStr.includes(" 2-2");

  const isMixedBus =
    busTypeStr.includes("SEMI SLEEPER") ||
    (busTypeStr.includes("SLEEPER") && busTypeStr.includes("SEATER"));

  const isSleeperBus =
    busTypeStr.includes("SLEEPER") && !isMixedBus && !is22Bus;

  if (!isSleeperBus && validSeats.length >= 38 && validSeats.length <= 58) {
    is22Bus = true;
  }

  return validSeats.map(seat => {
    const seatName = String(seat.id || "").toUpperCase();

    const width  = Number((seat as any).width  || 0);
    const height = Number((seat as any).height || 0);
    const length = Number((seat as any).length || 0);

    const isUpper =
      seat.isUpper || /^U\d|^UB\d|UPPER|USL|SU/i.test(seatName);

    const isSleeperByName =
      /^L\d+|^U\d+|LB|UB|SL|SU|USL|LSL|LOWER|UPPER|BERTH/i.test(seatName);

    const isSleeperBySize = width > 1 || height > 1 || length > 1;

    let isSleeper =
      seat.isSleeper === true ||
      isSleeperByName ||
      isSleeperBySize;

    // ✅ FIX: Force all seats in a 2+2 normal bus to be seaters
    const isTrueMixedLayout = busTypeStr.includes("SLEEPER") && busTypeStr.includes("SEATER");
    if (is22Bus && !isTrueMixedLayout) {
      isSleeper = false;
    }

    return { ...seat, isSleeper, isUpper };
  });
};

const normalizeSeatCoordinates = (seats: NormalizedSeat[]): NormalizedSeat[] => {
  if (!seats || seats.length === 0) return seats;
  const rows = seats.map(s => Number(s.row)).filter(n => !Number.isNaN(n));
  const cols = seats.map(s => Number(s.col)).filter(n => !Number.isNaN(n));
  if (rows.length === 0 || cols.length === 0) return seats;
  const minRow = Math.min(...rows);
  const minCol = Math.min(...cols);
  return seats.map(seat => ({
    ...seat,
    row: Number(seat.row) - minRow,
    col: Number(seat.col) - minCol,
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FETCH: fetchSeatLayoutData
// ─────────────────────────────────────────────────────────────────────────────
export const fetchSeatLayoutData = async ({
  provider, sourceCity, destinationCity, doj,
  urlSourceId, urlDestId, refNum, scheduleId, tripCode,
  ezeeSourceId, ezeeDestId, basePrice, busType,
  operatorName,
}: any) => {
  let fetchedSeats: NormalizedSeat[] = [];
  let lastSeats: string[] = [];
  let sId = urlSourceId;
  let dId = urlDestId;
  let tripOriginId       = "";
  let tripDestId         = "";
  let extractedBp: any[] = [];
  let extractedDp: any[] = [];
  let rawLayoutStorage: any = null;
  let detectedBusType: string = busType || "2+1";

  const getGridVal = (keys: string[], obj: any, defaultVal: number) => {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") {
        const parsed = parseInt(String(obj[k]), 10);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return defaultVal;
  };

  if (!sId || !dId) {
    const [sRes, dRes] = await Promise.all([
      fetchCitySuggestions(sourceCity),
      fetchCitySuggestions(destinationCity),
    ]);
    const sMatch: any =
      sRes.find((c: any) => c.name.toLowerCase() === sourceCity.toLowerCase()) || sRes;
    const dMatch: any =
      dRes.find((c: any) => c.name.toLowerCase() === destinationCity.toLowerCase()) || dRes;

    if (provider === "SRS") {
      sId = sMatch?.srsCityId || sMatch?.id || "";
      dId = dMatch?.srsCityId || dMatch?.id || "";
    } else {
      sId = sMatch?.vrlCityId || sMatch?.id || "";
      dId = dMatch?.vrlCityId || dMatch?.id || "";
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EZEE API
  // ═══════════════════════════════════════════════════════════════════════════
  if ((provider === "EZEE_V2" || provider === "EZEE_V3") && tripCode) {
    const rawData = await fetchEzeeSeatLayout(
      tripCode,
      ezeeSourceId || sId,
      ezeeDestId   || dId,
      doj
    );

    console.log("[EZEE seat.ts] EZEE seat API response:", rawData);
    rawLayoutStorage = rawData;

    const isInvalidPayload =
      rawData === null ||
      rawData?.success === false ||
      (rawData && typeof rawData?.data === "string");

    if (isInvalidPayload) {
      console.warn("[EZEE seat.ts] No valid seat data — backend decompression pending or API error.");
    } else {
      console.log("[EZEE seat.ts] FULL EZEE RESPONSE:", rawData);
      console.log("[EZEE seat.ts] ALL ROOT KEYS:", Object.keys(rawData || {}));
      console.log("[EZEE seat.ts] DATA KEYS:", Object.keys(rawData?.data || {}));
      console.log("[EZEE seat.ts] BUS KEYS:", Object.keys(rawData?.data?.bus || {}));

      // ── Boarding / dropping points ───────────────────────────────────────
      const ezeeBpSource = extractEzeePointsSource(rawData, [
        "boardingPoints","boardingPointList","boardingList","pickupPoints","pickupList",
        "bpList","boarding","pickup","boardingStages","pickupStages",
        "boardingDetails","pickupDetails","bpDetails","routePoints","points","pointsList",
      ], "bp");

      const ezeeDpSource = extractEzeePointsSource(rawData, [
        "droppingPoints","droppingPointList","dropPoints","dropList","dpList",
        "dropping","drop","dropStages","droppingStages","dropDetails",
        "dpDetails","routePoints","points","pointsList",
      ], "dp");

      extractedBp = parseStages(ezeeBpSource);
      extractedDp = parseStages(ezeeDpSource);

      if (extractedBp.length === 0 && rawData?.data?.fromStation) {
        extractedBp = [{
          stage_id: rawData.data.fromStation.code,
          id:       rawData.data.fromStation.code,
          time:     rawData.data.fromStation.dateTime || "",
          stage:    rawData.data.fromStation.name     || "",
          name:     rawData.data.fromStation.name     || "",
          location: rawData.data.fromStation.name     || "",
        }];
      }

      if (extractedDp.length === 0 && rawData?.data?.toStation) {
        extractedDp = [{
          stage_id: rawData.data.toStation.code,
          id:       rawData.data.toStation.code,
          time:     rawData.data.toStation.dateTime || "",
          stage:    rawData.data.toStation.name     || "",
          name:     rawData.data.toStation.name     || "",
          location: rawData.data.toStation.name     || "",
        }];
      }

      // ── Raw seat array ───────────────────────────────────────────────────
      let rawSeatArray: any[] =
        rawData?.data?.bus?.seatLayoutList ||
        rawData?.data?.seatLayoutList      ||
        rawData?.data?.seatLayout          ||
        rawData?.data?.seats               ||
        rawData?.data?.seatMap             ||
        rawData?.data?.layout              ||
        rawData?.seatLayoutList            ||
        rawData?.seatLayout                ||
        rawData?.seats                     ||
        rawData?.seatMap                   ||
        rawData?.layout                    ||
        [];

      if (!Array.isArray(rawSeatArray) || rawSeatArray.length === 0) {
        const deepSeatSearch = (obj: any, depth = 0): any[] => {
          if (!obj || typeof obj !== "object" || depth > 6) return [];
          for (const key in obj) {
            const val = obj[key];
            if (Array.isArray(val) && val.length > 0) {
              const first = val[0];
              if (
                first && typeof first === "object" &&
                (
                  first.seatNo     !== undefined || first.seatName   !== undefined ||
                  first.seatCode   !== undefined || first.seatNumber !== undefined ||
                  first.row        !== undefined || first.column     !== undefined ||
                  first.x          !== undefined || first.y          !== undefined
                )
              ) return val;
            }
            if (val && typeof val === "object") {
              const found = deepSeatSearch(val, depth + 1);
              if (found.length > 5) return found;
            }
          }
          return [];
        };
        rawSeatArray = deepSeatSearch(rawData);
      }

      console.log("[EZEE seat.ts] Raw seat count:", rawSeatArray.length);

      const validRawSeats = rawSeatArray.filter((seat: any) => {
        if (!seat || typeof seat !== "object") return false;
        const status = String(seat.seatStatus || seat.status || "").toUpperCase();
        const type   = String(seat.seatType   || seat.type   || "").toUpperCase();
        if (status === "NA" || type === "NA") return false;
        if (/DRIVER|CABIN|DOOR|SPACE|TOILET/i.test(
          String(seat.seatCode || seat.seatName || seat.seatNo || "")
        )) return false;
        return true;
      });

      const fareKeys = [
        "seatFare","seatRate","fare","price","Fare","Price",
        "ticketFare","baseFare","amount","cost",
      ];
      const extractSeatFare = (seat: any): number => {
        for (const k of fareKeys) {
          const v = Number(seat[k]);
          if (!isNaN(v) && v > 0) return v;
        }
        return 0;
      };
      const fareFreq: Record<number, number> = {};
      for (const s of validRawSeats) {
        const f = extractSeatFare(s);
        if (f > 0) fareFreq[f] = (fareFreq[f] || 0) + 1;
      }
      const fallbackFare =
        Object.entries(fareFreq).sort((a, b) => b[1] - a[1])[0]
          ? Number(Object.entries(fareFreq).sort((a, b) => b[1] - a[1])[0][0])
          : (Number(basePrice) || 0);

      console.log("[EZEE seat.ts] Fallback fare:", fallbackFare);

      fetchedSeats = validRawSeats.map((seat: any, index: number) => {
        const seatId =
          seat.seatCode   || seat.seatName   || seat.seatNo ||
          seat.seatNumber || seat.id         || `S${index + 1}`;

        const seatName = String(seatId).toUpperCase().trim();
        const seatCode = seatName.replace(/[0-9]/g, "");

        const rawRow = Number(
          seat.colPos ?? seat.col    ?? seat.Column ?? seat.colNo  ??
          seat.colNum ?? seat.x      ?? seat.posX   ?? 0
        );
        const rawCol = Number(
          seat.rowPos ?? seat.row    ?? seat.Row    ?? seat.rowNo  ??
          seat.rowNum ?? seat.y      ?? seat.posY   ?? 0
        );

        const isUpperDeck =
          seat.deckType  === "UPPER" || seat.deck      === "UPPER" ||
          seat.isUpper   === true    || seat.upperDeck === true    ||
          seat.level     === 2       || seat.floor     === 2       ||
          seat.berthType === "UPPER" ||
          /^U\d+|^UB\d+|^USU\d+/i.test(seatName);

        const isSleeperByCode = [
          "DLB","DUB","SLB","SUB",
          "LB","UB","SL","SU",
          "USL","LSL","USU",
          "BERTH",
        ].includes(seatCode);

        const isSleeperById =
          /^[0-9]+$/.test(seatName) ||
          /^[A-Z]$/.test(seatName) ||
          isSleeperByCode ||
          seatName.length > 2;

        const isAvailable =
          seat.isAvailable !== false &&
          seat.available   !== false &&
          seat.available   !== 0     &&
          String(seat.seatStatus || seat.status || "A").toUpperCase() !== "B" &&
          String(seat.seatStatus || seat.status || "A").toUpperCase() !== "BOOKED";

        const fare = extractSeatFare(seat) || fallbackFare;

        const isLadiesSeat =
          seat.isLadies === true ||
          String(seat.isLadies).toLowerCase() === "true" ||
          ["F", "FEMALE", "LADIES"].includes(String(seat.gender).trim().toUpperCase()) ||
          ["F", "FEMALE", "LADIES"].includes(String(seat.seatGender).trim().toUpperCase()) ||
          ["F", "FEMALE", "LADIES"].includes(String(seat.passengerSex).trim().toUpperCase());

        const isMaleSeat =
          seat.isMale === true ||
          String(seat.isMale).toLowerCase() === "true" ||
          ["M", "MALE", "GENTS"].includes(String(seat.gender).trim().toUpperCase()) ||
          ["M", "MALE", "GENTS"].includes(String(seat.seatGender).trim().toUpperCase()) ||
          ["M", "MALE", "GENTS"].includes(String(seat.passengerSex).trim().toUpperCase()) ||
          (!isAvailable && !isLadiesSeat);

        return {
          id:          String(seatId),
          row:         Number.isNaN(rawRow) ? 0 : rawRow,
          col:         Number.isNaN(rawCol) ? 0 : rawCol,
          isUpper:     isUpperDeck,
          isAvailable,
          isLadies:    isLadiesSeat,
          isMale:      isMaleSeat,
          isSleeper:   seat.isSleeper === true || isSleeperById,
          fare,
        } as NormalizedSeat;
      });

      // ── Trust-But-Verify pipeline ────────────────────────────────────────
      fetchedSeats = normalizeSeatCoordinates(fetchedSeats);
      fetchedSeats = fixBrokenSeatLayout(provider, fetchedSeats, detectedBusType);
      fetchedSeats = applyBusTypeRules(fetchedSeats, detectedBusType);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VRL API
  // ═══════════════════════════════════════════════════════════════════════════
  else if (provider === "VRL" && refNum) {
    const rawData = await fetchVrlSeatLayout(refNum);
    rawLayoutStorage = rawData;

    detectedBusType = fullDecodeBusType(
      rawData?.data?.BusType || rawData?.data?.busType ||
      rawData?.busType       || busType || "2+1 Sleeper"
    );

    const rawVrlData = rawData?.data || rawData;

    const bpSource =
      rawVrlData?.PickupPoints || rawVrlData?.BoardingPoints ||
      rawVrlData?.pickupPoints || rawVrlData?.boardingPoints ||
      rawVrlData?.Boarding     || rawVrlData?.pickup         ||
      findPointsArray(rawData, ["pickup","boarding","pick","bp","PickupPoints","BoardingPoints"]);

    const dpSource =
      rawVrlData?.DropPoints   || rawVrlData?.DroppingPoints ||
      rawVrlData?.dropPoints   || rawVrlData?.droppingPoints ||
      rawVrlData?.Dropping     || rawVrlData?.drop           ||
      findPointsArray(rawData, ["drop","dropping","droping","dp","DropPoints","DroppingPoints"]);

    extractedBp = parseStages(bpSource).filter(x => x.stage_id && x.stage);
    extractedDp = parseStages(dpSource).filter(x => x.stage_id && x.stage);

    if (rawData?.data?.ITSSeatDetails) {
      const firstSeat = rawData.data.ITSSeatDetails[0];
      if (firstSeat) {
        if (extractedBp.length === 0 && firstSeat.BoardingPoints)
          extractedBp = parseStages(firstSeat.BoardingPoints).filter(x => x.stage_id && x.stage);
        if (extractedDp.length === 0 && firstSeat.DroppingPoints)
          extractedDp = parseStages(firstSeat.DroppingPoints).filter(x => x.stage_id && x.stage);
      }

      fetchedSeats = rawData.data.ITSSeatDetails
        .filter((seat: any) => {
          const seatName = String(seat.SeatName || seat.SeatNo || "").trim().toUpperCase();
          if (!seatName) return false;
          if (/DRIVER|TV|SPACE|EMPTY|DOOR|GY/i.test(seatName)) return false;
          if (Number(seat.BlockType) === 3) return false;
          if (!/[A-Z0-9]/i.test(seatName)) return false;
          return true;
        })
        .map((seat: any) => {
          const seatName = String(seat.SeatName || seat.SeatNo || "").trim().toUpperCase();
          const rowVal   = getGridVal(["Row","row","Y","y"], seat, 0);
          const colVal   = getGridVal(["Column","column","X","x"], seat, 0);
          const upLow    = String(seat.UpLowBerth || seat.upLowBerth || "").trim().toUpperCase();
          const isUpper  =
            upLow === "U" || upLow === "UPPER" ||
            /^U\d{1,3}$/.test(seatName) || /^UB\d{1,3}$/.test(seatName);

          const rawType     = String(seat.SeatType ?? seat.seatType ?? seat.type ?? "").toUpperCase();
          const numericType = Number(rawType);

          // VRL SeatType: 1=Seater, 2=Lower berth, 3=Upper berth, 4=Semi-sleeper
          const colSpan = Number(seat.ColumnSpan ?? seat.columnSpan ?? 1);
          const rowSpan = Number(seat.RowSpan ?? seat.rowSpan ?? 1);

          // VRL sleeper detection MUST rely mainly on berth geometry
          const isSleeperByType = [2, 3].includes(numericType);
          const isSleeperBySpan = colSpan > 1 || rowSpan > 1;

          // Only explicit berth names
          const isSleeperByName = /^LB\d+|^UB\d+|BERTH/i.test(seatName);

          // FINAL
          const isSleeper = isSleeperByType || isSleeperBySpan || isSleeperByName;

          const isAvailable =
            seat.Available    === "Y" || seat.IsAvailable === "Y" ||
            String(seat.Available).toLowerCase() === "true";

          const isLadiesSeat =
            seat.IsLadiesSeat === "Y" ||
            String(seat.IsLadiesSeat).toLowerCase() === "true" ||
            ["F", "FEMALE", "LADIES"].includes(String(seat.Gender).trim().toUpperCase()) ||
            ["F", "FEMALE", "LADIES"].includes(String(seat.PassengerGender).trim().toUpperCase()) ||
            ["F", "FEMALE", "LADIES"].includes(String(seat.PassengerSex).trim().toUpperCase());

          const isMaleSeat =
            seat.IsMaleSeat   === "Y" ||
            String(seat.IsMaleSeat).toLowerCase() === "true" ||
            ["M", "MALE", "GENTS"].includes(String(seat.Gender).trim().toUpperCase()) ||
            ["M", "MALE", "GENTS"].includes(String(seat.PassengerGender).trim().toUpperCase()) ||
            ["M", "MALE", "GENTS"].includes(String(seat.PassengerSex).trim().toUpperCase()) ||
            (!isAvailable && !isLadiesSeat);

          return {
            id:          seatName,
            row:         rowVal,
            col:         colVal,
            isUpper,
            isAvailable,
            isLadies:    isLadiesSeat,
            isMale:      isMaleSeat,
            isSleeper,
            fare: parseFloat(seat.SeatRate || seat.fare || String(basePrice) || "0"),
          } as NormalizedSeat;
        });

      const seen = new Set<string>();
      fetchedSeats = fetchedSeats.filter(seat => {
        if (seen.has(seat.id)) return false;
        seen.add(seat.id);
        return true;
      });

      // ── Trust-But-Verify pipeline ────────────────────────────────────────
      fetchedSeats = normalizeSeatCoordinates(fetchedSeats);
      fetchedSeats = fixBrokenSeatLayout(provider, fetchedSeats, detectedBusType);
      fetchedSeats = applyBusTypeRules(fetchedSeats, detectedBusType);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SRS API
  // ═══════════════════════════════════════════════════════════════════════════
  else if (provider === "SRS" && scheduleId) {
    const rawData = await fetchSrsSeatLayout(scheduleId);
    rawLayoutStorage = rawData;
    const srsResult = rawData?.result || rawData?.data || rawData;

    detectedBusType = fullDecodeBusType(
      busType || srsResult?.bus_layout?.bus_type || srsResult?.busType || "2+1"
    );
    if (!detectedBusType || detectedBusType === "undefined")
      detectedBusType = fullDecodeBusType(busType || "2+1");

    if (srsResult?.origin_id)      tripOriginId = String(srsResult.origin_id);
    if (srsResult?.destination_id) tripDestId   = String(srsResult.destination_id);

    const layoutData = srsResult?.bus_layout || srsResult;

    const srsLastSeats = (layoutData?.last_seats || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    console.log(
      "[API] last_seats from response:",
      srsLastSeats
    );
    lastSeats = srsLastSeats;

    const decodeStageStr = (s: any): any => {
      if (typeof s !== "string") return s;
      try {
        let d = decodeURIComponent(s);
        try { d = decodeURIComponent(d); } catch (_) {}
        return d;
      } catch (_) { return s; }
    };

    extractedBp = parseStages(decodeStageStr(layoutData?.boarding_stages));
    extractedDp = parseStages(decodeStageStr(layoutData?.dropoff_stages));

    if (layoutData?.coach_details) {
      const availableMap = new Map<string, number>();
      if (layoutData.available) {
        layoutData.available.split(",").forEach((pair: string) => {
          const [id, price] = pair.split("|");
          if (id) availableMap.set(id.trim(), parseFloat(price));
        });
      }
      const ladiesSet = new Set(
        (layoutData.ladies_seats || "").split(",").map((s: string) => s.trim()).filter(Boolean)
      );
      const maleSet = new Set(
        (layoutData.gents_seats || "").split(",").map((s: string) => s.trim()).filter(Boolean)
      );
      const ladiesBookedSet = new Set(
        (layoutData.ladies_booked_seats || "").split(",").map((s: string) => s.trim()).filter(Boolean)
      );
      const maleBookedSet = new Set(
        (layoutData.gents_booked_seats || "").split(",").map((s: string) => s.trim()).filter(Boolean)
      );
      
      const lastSeatsSet = new Set(
        (layoutData.last_seats || "").split(",").map((s: string) => s.trim()).filter(Boolean)
      );

      const parseCoachString = (
        coachStr: any,
        isForcedUpperDeck: boolean,
        rowOffset = 0
      ): NormalizedSeat[] => {
        if (!coachStr) return [];
        const parsed: NormalizedSeat[] = [];
        const isGarula = String(operatorName || "")
          .toLowerCase()
          .includes("garula");

        if (Array.isArray(coachStr)) {
          return coachStr
            .map((seat: any) => {
              const seatId = String(
                seat.SeatName || seat.SeatNo || seat.id || seat.seatCode || ""
              ).trim();
              if (!seatId) return null;
              const row = Number(seat.Row    ?? seat.row ?? seat.Y ?? seat.y ?? 0);
              const col = Number(seat.Column ?? seat.col ?? seat.X ?? seat.x ?? 0);
              if (Number.isNaN(row) || Number.isNaN(col)) return null;

              const upLow = String(seat.UpLowBerth || seat.upLowBerth || "").trim().toUpperCase();
              const isUpper = isGarula
                ? seatId.toUpperCase().startsWith("U")
                : (
                    isForcedUpperDeck ||
                    upLow === "U" ||
                    upLow === "UPPER" ||
                    /UB$/i.test(seatId) ||
                    /U\d+/i.test(seatId)
                  );

              return {
                id:          seatId,
                row:         row + rowOffset,
                col,
                isUpper,
                isAvailable: seat.IsAvailable === "Y" || seat.Available === "Y" ||
                  String(seat.isAvailable).toLowerCase() === "true",
                isLadies:    seat.IsLadiesSeat === "Y" ||
                  String(seat.IsLadiesSeat).toLowerCase() === "true" || ladiesSet.has(seatId) || ladiesBookedSet.has(seatId),
                isMale:      seat.IsMaleSeat   === "Y" ||
                  String(seat.IsMaleSeat).toLowerCase() === "true" || maleSet.has(seatId) || maleBookedSet.has(seatId),
                isSleeper:   seat.SeatType === 2 || /L\d|U\d|LB\d|UB\d/i.test(seatId),
                fare:        Number(seat.SeatRate || seat.fare || basePrice || 0),
                isRotated:   lastSeatsSet.has(seatId),
              } as NormalizedSeat;
            })
            .filter(Boolean) as NormalizedSeat[];
        }

        const allRowsRaw = String(coachStr).split(",");
        let actualRow = 0;

        allRowsRaw.forEach((rowStr: string) => {
          const rawCols    = rowStr.split("-").map(c => c.trim());
          const isEmptyRow =
            !rowStr || rowStr.trim() === "" ||
            rawCols.every(c => !c || c === "--" || c === "GY" || c.includes(".GY"));

          if (isEmptyRow) {
            actualRow++; // preserve intentional empty row spacing from the API
            return;
          }

          let visualCol = 0;
          rawCols.forEach((colStr) => {
            const cleanCol = colStr.trim();
            if (!cleanCol || cleanCol === "--" || cleanCol === "GY" || cleanCol.includes(".GY")) {
              visualCol++;
              return;
            }

            const parts    = cleanCol.split("|");
            const seatId   = parts?.[0]?.trim() || "";
            const typeCode = parts?.[1]?.trim() || "";

            if (seatId) {
              const isAvailable = availableMap.has(seatId);
              const price       = isAvailable ? availableMap.get(seatId)! : (basePrice || 0);
              const isSleeper   =
                typeCode.includes("L") || typeCode.includes("U") ||
                typeCode.includes("Sleeper") || typeCode.includes("SL");
              const isUpper = isGarula
                ? seatId.toUpperCase().startsWith("U")
                : (
                    isForcedUpperDeck ||
                    /UB|DUL|DUB|SUB|SU|USL|UPPER/i.test(typeCode) ||
                    /UB$/i.test(seatId) ||
                    /U\d+/i.test(seatId)
                  );

              parsed.push({
                id:          seatId,
                row:         actualRow + rowOffset,
                col:         visualCol,
                isUpper,
                isAvailable,
                isLadies:    ladiesSet.has(seatId) || ladiesBookedSet.has(seatId),
                isMale:      maleSet.has(seatId) || maleBookedSet.has(seatId),
                isSleeper:   !!isSleeper,
                fare:        Number(price),
                isRotated:   lastSeatsSet.has(seatId),
              });
            }

            visualCol++;
          });

          actualRow++;
        });

        return parsed;
      };

      const rawLower = parseCoachString(layoutData.coach_details,       false, 0);
      const rawUpper = parseCoachString(layoutData.upper_coach_details, true,  0);

      fetchedSeats = [...rawLower, ...rawUpper];

      // ── Trust-But-Verify pipeline ────────────────────────────────────────
      fetchedSeats = normalizeSeatCoordinates(fetchedSeats);
      fetchedSeats = fixBrokenSeatLayout(provider, fetchedSeats, detectedBusType);
      const isPureSleeper =
        String(detectedBusType || "").toLowerCase().includes("sleeper") &&
        !String(detectedBusType || "").toLowerCase().includes("seater");
      if (isSriBalajiBus(operatorName, provider) && isPureSleeper) {
        console.log("[Layout] Applying Sri Balaji sleeper fix");
        fetchedSeats = formatSriBalajiLayout(fetchedSeats, detectedBusType);
      }
      fetchedSeats = applyBusTypeRules(fetchedSeats, detectedBusType);
    }
  }

  const lowerDeckSeats = fetchedSeats.filter(s => !s.isUpper);
  const upperDeckSeats = fetchedSeats.filter(s =>  s.isUpper);

  const layoutMeta = {
    lower: analyzeLayoutMeta(lowerDeckSeats, detectedBusType),
    upper: analyzeLayoutMeta(upperDeckSeats, detectedBusType),
  };

  return {
    seats:          fetchedSeats,
    lowerDeckSeats,
    upperDeckSeats,
    layoutMeta,
    boardingPoints: extractedBp,
    droppingPoints: extractedDp,
    actualSourceId: sId,
    actualDestId:   dId,
    tripOriginId,
    tripDestId,
    rawLayout:      rawLayoutStorage,
    busType:        detectedBusType,
    lastSeats,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING LOGIC: blockSeatLogic
// ─────────────────────────────────────────────────────────────────────────────
let bookingInProgress = false;

export const blockSeatLogic = async ({
  provider, refNum, scheduleId, tripCode,
  sourceCity, destinationCity, doj,
  operatorName, busType,
  selectedSeats, selectedBp, selectedDp,
  passengers, contactEmail, contactPhone,
  hasGst, gstDetails,
  finalAmount, totalFare,
  tripOriginId, tripDestId, actualSourceId, actualDestId,
  departureTime, arrivalTime, insurance,
  boardingPoints, droppingPoints,
}: any) => {
  if (bookingInProgress)
    throw new Error("Booking is already processing. Please wait.");

  if (!selectedSeats || !passengers || selectedSeats.length !== passengers.length)
    throw new Error("Passenger count must match selected seat count.");

  bookingInProgress = true;

  try {
    let blockKey      = "";
    let finalSourceId = "";
    let finalDestId   = "";

    let cleanDoj = String(doj || "").trim();
    if (cleanDoj.includes("T")) cleanDoj = cleanDoj.split("T")[0];

    if (provider === "SRS") {
      finalSourceId = String(tripOriginId || actualSourceId || "").replace(/\D/g, "");
      finalDestId   = String(tripDestId   || actualDestId   || "").replace(/\D/g, "");
    } else {
      finalSourceId = String(actualSourceId || "");
      finalDestId   = String(actualDestId   || "");
    }

    if (!selectedBp?.stage_id) throw new Error("❌ Boarding point must come from seat API (Missing stage_id)");
    if (!selectedDp?.stage_id) throw new Error("❌ Dropping point must come from seat API (Missing stage_id)");

    let finalBpId = String(selectedBp.stage_id);
    let finalDpId = String(selectedDp.stage_id);

    if (provider === "SRS") {
      finalBpId = finalBpId.replace(/\D/g, "");
      finalDpId = finalDpId.replace(/\D/g, "");
      if (!/^\d{4,}$/.test(finalBpId)) throw new Error("❌ INVALID BOARDING ID: " + finalBpId);
      if (!/^\d{4,}$/.test(finalDpId)) throw new Error("❌ INVALID DROP ID: "     + finalDpId);
    }

    if (finalBpId.includes(":") || finalDpId.includes(":"))
      throw new Error("Invalid boarding/dropping point selected. A time value was parsed instead of an ID.");

    const safeTotalAmount = Number(finalAmount) || 0;
    const safeTotalFare   = Number(totalFare)   || 0;
    const safeServiceTax  = Number(Math.max(0, safeTotalAmount - safeTotalFare).toFixed(2));

    let vrlPayload:  any = null;
    let srsPayload:  any = null;
    let ezeePayload: any = null;

    if (provider === "VRL") {
      let cleanRefNum = decodeURIComponent(String(refNum)).replace(/\+/g, ' ').trim();

      const safePickupId = Number(finalBpId);
      if (!safePickupId || isNaN(safePickupId) || safePickupId < 1000)
        throw new Error("Pickup mismatch or expired. Please reselect your boarding point.");

      vrlPayload = {
        referenceNumber: cleanRefNum,
        passengerName:   String(passengers?.[0]?.name || "Customer")
          .replace(/[^a-zA-Z\s]/g, "").trim(),
        seatNames: selectedSeats.map((s: any, i: number) =>
          `${String(s.id).trim()},${passengers[i]?.gender?.charAt(0).toUpperCase() || "M"}`
        ).join(","),
        email:           String(contactEmail),
        phone:           String(contactPhone).replace(/\D/g, "").substring(0, 10) || "9999999999",
        pickupID:        safePickupId,
        payableAmount:   safeTotalFare,
        totalPassengers: Number(selectedSeats.length),
      };

      const data   = await blockVrlSeat(vrlPayload);
      if (!Array.isArray(data?.data) || !data.data.length)
        throw new Error(`Invalid VRL response: ${JSON.stringify(data)}`);
      
      const vrlRes = data.data[0]; // Fix: Extract the first object from the array
      
      if (vrlRes?.Status === 18)
        throw new Error(vrlRes?.Message || "Pickup is currently not available. Please choose another boarding point.");
      
      if (vrlRes?.BlockID && vrlRes.BlockID !== 0) {
        blockKey = String(vrlRes.BlockID);
      } else {
        throw new Error(`VRL Block Failed: ${vrlRes?.Message || JSON.stringify(data)}`);
      }

    } else if (provider === "SRS") {
      const srsUserId =
        localStorage.getItem("userId") || localStorage.getItem("_id") || "69412e89e1e82ea2792a99bb";

      const mappedSeats = selectedSeats.map((s: any, i: number) => {
        const isFemale = passengers[i]?.gender?.toLowerCase() === "female";
        return {
          seat_number:       String(s.id).trim(),
          fare:              Number(s.fare || 0).toFixed(2),
          title:             isFemale ? "Ms" : "Mr",
          name:              String(passengers[i]?.name || "Customer").replace(/[^a-zA-Z\s]/g, "").trim(),
          age:               String(passengers[i]?.age  || "25").replace(/\D/g, ""),
          sex:               isFemale ? "F" : "M",
          is_primary:        i === 0 ? "true" : "false",
          id_card_type:      "1",
          id_card_number:    "111111111",
          id_card_issued_by: "oneone",
        };
      });

      srsPayload = {
        book_ticket: {
          seat_details:   { seat_detail: mappedSeats },
          contact_detail: {
            mobile_number:  String(contactPhone || "9999999999").replace(/\D/g, "").substring(0, 10),
            emergency_name: String(passengers?.[0]?.name || "Customer")
              .replace(/[^a-zA-Z\s]/g, "").trim(),
            email:          String(contactEmail || "testw@yesgobus.com"),
          },
        },
        origin_id:      finalSourceId,
        destination_id: finalDestId,
        boarding_at:    finalBpId,
        drop_of:        finalDpId,
        no_of_seats:    String(selectedSeats.length),
        travel_date:    cleanDoj,
        userId:         srsUserId,
        isLoyatyUser:   true,
        serviceTax:     safeServiceTax,
        discountValue:  0,
        customer_company_gst: hasGst
          ? { name: gstDetails?.name || "Yesgobus", gst_id: gstDetails?.gstId || "T123DT", address: gstDetails?.address || "Test" }
          : { name: "Yesgobus", gst_id: "T123DT", address: "Test" },
      };

      const data = await blockSrsSeat(scheduleId as string, srsPayload);
      const pnr  =
        data?.result?.ticket_details?.pnr_number || data?.data?.pnr_number ||
        data?.pnr_number || data?.result?.pnr_number;

      if (pnr) blockKey = String(pnr);
      else throw new Error(`API Error Response: ${
        data?.message || data?.error || data?.result?.message ||
        data?.result?.error || data?.response?.message || JSON.stringify(data)
      }`);

    } else if (provider === "EZEE_V2" || provider === "EZEE_V3") {
      const tempBookingId = "BOOK" + Date.now() + Math.floor(Math.random() * 1000);
      ezeePayload = {
        bookingId:      tempBookingId,
        ticketDetails:  selectedSeats.map((s: any, i: number) => ({
          seatCode:        s.id,
          seatName:        s.id,
          passengerGender: passengers[i]?.gender?.charAt(0).toUpperCase() || "M",
          passengerName:   passengers[i]?.name || "Customer",
          passengerAge:    String(passengers[i]?.age || "25"),
          seatFare:        String(s.fare),
        })),
        passengerEmail:  contactEmail,
        passengerMobile: contactPhone,
        travelDate:      cleanDoj,
      };

      const data = await blockEzeeSeat(ezeePayload);
      if (data?.status === false || data?.error)
        throw new Error(`API Error Response: ${data?.message || JSON.stringify(data)}`);
      blockKey = tempBookingId;
    }

    const loggedInUserId = localStorage.getItem("userId") || localStorage.getItem("_id") || "";
    const validUserId    = loggedInUserId.length === 24 ? loggedInUserId : "69412e89e1e82ea2792a99bb";

    const fullName          = String(passengers?.[0]?.name || "Customer");
    const nameParts         = fullName.trim().split(" ");
    const customerFirstName = nameParts[0] || "Customer";
    const customerLastName  = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    const bookingPayloadData: any = {
      blockKey:          String(blockKey),
      userId:            validUserId,
      totalAmount:       safeTotalAmount,
      busOperator:       String(operatorName),
      busType:           String(busType),
      selectedSeats:     selectedSeats.map((s: any) => String(s.id).trim()).join(","),
      pickUpTime:        String(selectedBp?.time || departureTime),
      reachTime:         String(selectedDp?.time || arrivalTime),
      sourceCity:        String(sourceCity),
      destinationCity:   String(destinationCity),
      doj:               cleanDoj,
      customerName:      customerFirstName,
      customerLastName,
      customerEmail:     String(contactEmail),
      customerPhone:     String(contactPhone),
      customerAddress:   "",
      boardingPoint:     String(selectedBp?.stage || selectedBp?.name || ""),
      droppingPoint:     String(selectedDp?.stage || selectedDp?.name || ""),
      serviceTax:        safeServiceTax,
      loyaltyPointsUsed: 0,
      isLoyatyUser:      true,
      isSrs:             provider === "SRS",
      isVrl:             provider === "VRL",
      isEzee:            provider === "EZEE_V2" || provider === "EZEE_V3",
    };

    if (provider === "SRS") {
      bookingPayloadData.srsBlockSeatDetails = srsPayload;

    } else if (provider === "VRL") {
      bookingPayloadData.reservationSchema = {
        referenceNumber: vrlPayload.referenceNumber,
        passengerName:   vrlPayload.passengerName,
        seatNames:       vrlPayload.seatNames,
        email:           vrlPayload.email,
        phone:           vrlPayload.phone,
        pickUpID:        String(vrlPayload.pickupID),
        dropID:          finalDpId,
        payableAmount:   vrlPayload.payableAmount,
        totalPassengers: vrlPayload.totalPassengers,
        seatDetails:     selectedSeats.map((s: any, i: number) =>
          `${String(s.id).trim()},${passengers[i]?.name || "Customer"},${contactPhone},${passengers[i]?.age || "25"}`
        ).join("|"),
        discount:   0,
        paxDetails: selectedSeats.map((s: any, i: number) => ({
          seatName:       `${String(s.id).trim()},${passengers[i]?.gender?.charAt(0).toUpperCase() || "M"}`,
          paxName:        passengers[i]?.name || "Customer",
          mobileNo:       contactPhone,
          paxAge:         String(passengers[i]?.age || "25"),
          baseFare:       Number(s.fare),
          gstFare:        0.0,
          totalFare:      Number(s.fare),
          idProofId:      0,
          idProofDetails: "",
        })),
        gstState:       0,
        gstCompanyName: hasGst ? gstDetails.name  : "",
        gstRegNo:       hasGst ? gstDetails.gstId : "",
        apipnrNo:       Number(blockKey),
        BlockID:        Number(blockKey),
        blockId:        Number(blockKey),
      };
    } else if (provider === "EZEE_V2" || provider === "EZEE_V3") {
      bookingPayloadData.ezeeBlockSeatDetails = {
        fromStationCode: finalSourceId,
        tripCode,
        toStationCode:   finalDestId,
        totalSeats:      String(selectedSeats.length),
        boardingPoint:   { code: finalBpId, name: String(selectedBp?.stage || selectedBp?.name || "") },
        droppingPoint:   { code: finalDpId, name: String(selectedDp?.stage || selectedDp?.name || "") },
      };
    }

    sessionStorage.setItem("currentBookingPayload", JSON.stringify(bookingPayloadData));
    localStorage.setItem("currentBookingPayload", JSON.stringify(bookingPayloadData));

    return { 
      blockKey, 
      bookingId: provider === "VRL" ? String(blockKey) : "PENDING_CHECKOUT", 
      finalAmount 
    };

  } finally {
    bookingInProgress = false;
  }
};