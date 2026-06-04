import React, { useMemo } from 'react';
import { NormalizedSeat } from "./seat";

import availableSeater from "../components/assest/greensingle seat.png";
import availableSleeper from "../components/assest/greensleeper seat.png";
import availableMaleSeater from "../components/assest/bluemaleseatsingle.png";
import availableMaleSleeper from "../components/assest/bluemaleseatsleeper.png";
import bookedSeater from "../components/assest/alreadybooksingle.png";
import bookedSleeper from "../components/assest/alreadybooksleeper.png";
import selectedSeater from "../components/assest/selectedSingle.png";
import selectedSleeper from "../components/assest/selectedSleeper.png";
import availableFemaleSeater from "../components/assest/femaleseatsingle.png";
import availableFemaleSleeper from "../components/assest/femaleseatsleeper.png";
import bookedFemaleSeater from "../components/assest/bookedfemalesingle.png";
import bookedFemaleSleeper from "../components/assest/bookedfemalesleeper.png";
import bookedMaleSeater from "../components/assest/bookedbymalesingle.png";
import bookedMaleSleeper from "../components/assest/bookedbymalesleeper.png";
import restroomIcon from "../components/assest/restroomSleeper.png";

const TIME_REGEX = /\b((1[0-2]|0?[1-9]):([0-5][0-9])\s*([AaPp][Mm])?|(?:[01]?[0-9]|2[0-3]):[0-5][0-9])\b/g;
const TIME_REGEX_SINGLE = /\b((1[0-2]|0?[1-9]):([0-5][0-9])\s*([AaPp][Mm])?|(?:[01]?[0-9]|2[0-3]):[0-5][0-9])\b/;

const cleanLocationName = (name: string) => {
  if (!name) return "";

  let cleaned = name.replace(
    /(?:Ph|Mob|Phone|Contact|M)?\s*:?\s*(?:\+?91[\-\s]?)?[6-9]\d{9}\b/gi,
    ""
  );

  cleaned = cleaned.replace(/\b0\d{2,4}[\-\s]?\d{6,8}\b/g, "");
  cleaned = cleaned.replace(TIME_REGEX, "");
  cleaned = cleaned
    .replace(/[,|-]\s*[,|-]/g, ",")
    .replace(/\s*-\s*$/, "")
    .replace(/,\s*$/, "")
    .replace(/\(\s*\)/g, "")
    .trim();

  return cleaned || "Location Details Unavailable";
};

const extractTime = (timeStr: string, fallback: string): string => {
  if (!timeStr) return fallback;
  const match = timeStr.match(TIME_REGEX_SINGLE);
  return match ? match[0] : fallback;
};

interface Step1Props {
  isLoading: boolean;
  seats: NormalizedSeat[];
  lowerDeckSeats: NormalizedSeat[];
  upperDeckSeats: NormalizedSeat[];
  absoluteMaxRow: number;
  totalCols: number;
  selectedSeats: NormalizedSeat[];
  handleSeatClick: (seat: NormalizedSeat) => void;
  operatorName: string;
  departureTime: string;
  arrivalTime: string;
  journeyDateShort: string;
  busType: string;
  rating: string;
  activeTab: "why" | "route" | "boarding" | "dropping";
  setActiveTab: (tab: "why" | "route" | "boarding" | "dropping") => void;
  boardingPoints: any[];
  droppingPoints: any[];
  sourceCity: string;
  destinationCity: string;
  firstBpName: string;
  lastDpName: string;
  expandedAccordion: string | null;
  toggleAccordion: (id: string) => void;
  provider: string;
  lastSeats: string[];
}

type SeatWithGrid = NormalizedSeat & {
  gridRow?: number;
  allSleeperRow?: boolean;
  shouldAlignToBottom?: boolean;
  shouldCenterInSleeperSlot?: boolean;
  totalSeatsInRow?: number;
  isLastRow?: boolean;
  isInMixedEzeeColumn?: boolean;
  ezeeNeedsSleeperSlot?: boolean;
  ezeeAlignToBottom?: boolean;
  isEzeeThreeRowSeaterLayout?: boolean;
};

interface RenderSeatProps {
  seat: SeatWithGrid;
  isLegend?: boolean;
  forceSelected?: boolean;
  isSelected: boolean;
  handleSeatClick: (seat: NormalizedSeat) => void;
  operatorName?: string;
  busType?: string;
  provider?: string;
  lastSeats?: string[];
}

const RenderSeat = React.memo(function RenderSeat({
  seat,
  isLegend = false,
  forceSelected = false,
  isSelected,
  handleSeatClick,
  operatorName = "",
  busType = "", // This `busType` refers to the overall bus type, not necessarily a seat's type.
  provider = "", // Provider from Step1Props
  lastSeats = [],
}: RenderSeatProps) {
  const isSeatSelected = forceSelected || isSelected;

  const isDurgamba = operatorName?.toLowerCase().includes("durgamba");
  const isVrl = provider?.toLowerCase().includes("vrl");

  const lastSeatsFromApi = lastSeats || [];

  const isForcedRotateSeat = lastSeatsFromApi.includes(seat.id);

  if (isForcedRotateSeat) {
    console.log(
      `[ROTATE] Seat ${seat.id} rotated because API last_seats contains it`,
      {
        seatId: seat.id,
        lastSeats: lastSeatsFromApi,
      }
    );
  }

  const normalizedBusType = String(busType || "").toLowerCase();
  const isMixedBus =
    normalizedBusType.includes("sleeper/seater") ||
    normalizedBusType.includes("semi sleeper") ||
    normalizedBusType.includes("semi-sleeper") ||
    (normalizedBusType.includes("sleeper") && normalizedBusType.includes("seater"));

  const isHorizontalSeat =
    !isVrl &&
    (seat.isRotated || isForcedRotateSeat);
  
  const isInMixedEzeeColumn = (seat as any).isInMixedEzeeColumn;
  const ezeeNeedsSleeperSlot = (seat as any).ezeeNeedsSleeperSlot;
  const ezeeAlignToBottom = (seat as any).ezeeAlignToBottom;
  const isEzeeThreeRowSeaterLayout = (seat as any).isEzeeThreeRowSeaterLayout;
  const shouldUseSleeperSlot = (seat.isSleeper || seat.shouldCenterInSleeperSlot || ezeeNeedsSleeperSlot);

  const upperId = String(seat.id).toUpperCase();
  const isRestRoom = ["RRM", "REME", "RM", "RESTROOM", "WASHROOM"].includes(upperId) || (seat as any).isRestRoom || (seat as any).seatType === "RRM";
  const isEmptySpace = ["FRS", "EMPTY"].includes(upperId);
  const isPantry = ["PTY", "PANTRY"].includes(upperId);

  const gridRowValue = isLegend
    ? "auto"
    : isHorizontalSeat && isMixedBus
    ? `${seat.gridRow}`
    : isHorizontalSeat
    ? `${seat.gridRow} / span 1`
    : shouldUseSleeperSlot
    ? `${seat.gridRow} / span 2`
    : seat.shouldAlignToBottom
    ? `${seat.gridRow! + 1}`
    : `${seat.gridRow}`;
  let seatImg: any = null;
  if (isRestRoom) {
    seatImg = restroomIcon;
  } else if (isEmptySpace || isPantry) {
    seatImg = null;
  } else if (seat.isSleeper) {
    if (isSeatSelected) {
      seatImg = selectedSleeper;
    } else if (!seat.isAvailable) {
      if (seat.isLadies) seatImg = bookedFemaleSleeper;
      else if (seat.isMale) seatImg = bookedMaleSleeper;
      else seatImg = bookedSleeper;
    } else {
      if (seat.isLadies) seatImg = availableFemaleSleeper;
      else if (seat.isMale) seatImg = availableMaleSleeper;
      else seatImg = availableSleeper;
    }
  } else {
    if (isSeatSelected) {
      seatImg = selectedSeater;
    } else if (!seat.isAvailable) {
      if (seat.isLadies) seatImg = bookedFemaleSeater;
      else if (seat.isMale) seatImg = bookedMaleSeater;
      else seatImg = bookedSeater;
    } else {
      if (seat.isLadies) seatImg = availableFemaleSeater;
      else if (seat.isMale) seatImg = availableMaleSeater;
      else seatImg = availableSeater;
    }
  }

  return (
    <div
      onClick={() => {
        if (!isRestRoom && !isEmptySpace && !isPantry) handleSeatClick(seat);
      }}
      className="seat-wrapper position-relative d-flex flex-column"
      style={{
        gridRow: gridRowValue,
        gridColumn: isLegend ? "auto" : seat.col + 1,
        cursor: (seat.isAvailable && !isRestRoom && !isEmptySpace && !isPantry) || isLegend ? "pointer" : "not-allowed",
        opacity: 1,
        position: "relative",
        width: isLegend
          ? "32px"
          : isHorizontalSeat
          ? "72px"
          : "42px",
        height: isLegend
          ? (seat.isSleeper ? "64px" : "32px")
          : isHorizontalSeat
          ? "42px"
          : shouldUseSleeperSlot
          ? "82px"
          : "42px",
        display: "flex",
        flexDirection: "column",
        justifyContent: ezeeAlignToBottom ? "flex-end" : (seat.shouldCenterInSleeperSlot || ezeeNeedsSleeperSlot) ? "center" : (seat.isSleeper || isLegend ? "center" : "flex-end"),
        gap: "2px",
        transition: "all 0.2s ease-in-out",
        margin: isLegend ? "0 auto" : "0",
      }}
      title={!isLegend ? (isRestRoom ? "Restroom" : (isEmptySpace || isPantry ? seat.id : `Seat ${seat.id} | ₹${seat.fare}`)) : ""}
    >
      {seatImg && (
        <div
          style={{
            width: isHorizontalSeat ? "72px" : "100%",
            height: isRestRoom ? "100%" : (seat.shouldCenterInSleeperSlot || ezeeNeedsSleeperSlot) ? "42px" : (isHorizontalSeat ? "42px" : "100%"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={seatImg.src || seatImg}
            alt={`Seat ${seat.id}`}
            style={{
              width: isHorizontalSeat ? "42px" : "100%",
              height: isHorizontalSeat ? "82px" : "100%",
              objectFit: "contain",
              transform: isHorizontalSeat ? "rotate(90deg)" : "none",
            }}
          />
        </div>
      )}

      {!isLegend && (
        <div
          style={{
            fontSize: "9px",
            color: "#6B7280",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 2,

            position: isHorizontalSeat ? "absolute" : "static",

            // 👉 LEFT SIDE
            left: isHorizontalSeat ? "-20px" : "0",
            top: isHorizontalSeat ? "50%" : "auto",

            // 👉 CENTER vertically
            transform: isHorizontalSeat ? "translateY(-50%)" : "none",

            // 🔥 THIS IS THE MAGIC
            writingMode: isHorizontalSeat ? "vertical-rl" : "horizontal-tb",
            textOrientation: "mixed",

            textAlign: "center",
            visibility: (seat.isAvailable && !isSeatSelected && !isRestRoom && !isEmptySpace && !isPantry) ? "visible" : "hidden"
          }}
        >
          ₹{seat.fare}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => (
  prevProps.seat.id === nextProps.seat.id &&
  prevProps.isSelected === nextProps.isSelected &&
  prevProps.isLegend === nextProps.isLegend &&
  prevProps.forceSelected === nextProps.forceSelected &&
  prevProps.seat.isAvailable === nextProps.seat.isAvailable &&
  prevProps.seat.isLadies === nextProps.seat.isLadies &&
  prevProps.seat.isMale === nextProps.seat.isMale &&
  prevProps.seat.shouldAlignToBottom === nextProps.seat.shouldAlignToBottom &&
  prevProps.seat.shouldCenterInSleeperSlot === nextProps.seat.shouldCenterInSleeperSlot &&
  (prevProps.seat as any).isInMixedEzeeColumn === (nextProps.seat as any).isInMixedEzeeColumn &&
  (prevProps.seat as any).ezeeNeedsSleeperSlot === (nextProps.seat as any).ezeeNeedsSleeperSlot &&
  (prevProps.seat as any).ezeeAlignToBottom === (nextProps.seat as any).ezeeAlignToBottom &&
  prevProps.operatorName === nextProps.operatorName &&
  prevProps.provider === nextProps.provider &&
  prevProps.busType === nextProps.busType
));

export default function Step1SeatSelection({
  isLoading,
  seats,
  lowerDeckSeats,
  upperDeckSeats,
  absoluteMaxRow,
  totalCols,
  selectedSeats,
  handleSeatClick,
  operatorName,
  departureTime,
  arrivalTime,
  journeyDateShort,
  busType,
  rating,
  activeTab,
  setActiveTab,
  boardingPoints,
  droppingPoints,
  sourceCity,
  destinationCity,
  firstBpName,
  lastDpName,
  expandedAccordion,
  toggleAccordion,
  provider,
  lastSeats,
}: Step1Props) {
  const isVrl = provider?.toLowerCase() === "vrl";
  
  const preprocessDeck = (deck: NormalizedSeat[]) => {
    const isBusSemiSleeper = String(busType).toLowerCase().includes("semi sleeper");
    return deck.map((seat: any) => {
const isSS =
  seat.seatType === "SS" ||
  seat.seatType === "Semi Sleeper" ||
  String(seat.id).toUpperCase().includes("SEMI");
      const upperId = String(seat.id).toUpperCase();
      const isRestRoom = ["RRM", "REME", "RM", "RESTROOM", "WASHROOM"].includes(upperId) || seat.isRestRoom || seat.seatType === "RRM";
      const isSpecial = ["FRS", "EMPTY", "PTY", "PANTRY"].includes(upperId);
      
      return {
        ...seat,
        isSleeper: isRestRoom ? true : (isSpecial ? false : (isSS ? true : seat.isSleeper)),
        isRestRoom,
      };
    });
  };

  const correctedLowerDeckSeats = useMemo(() => preprocessDeck(lowerDeckSeats), [lowerDeckSeats]);
  const correctedUpperDeckSeats = useMemo(() => preprocessDeck(upperDeckSeats), [upperDeckSeats]);

  // FINAL LOGIC: 2+2, allow semi sleeper, but NOT mixed sleeper/seater
  const isHard49SeaterBus = useMemo(() => {
    if (!busType) return false;
    const lower = busType.toLowerCase();
    const is2Plus2 = lower.includes("2+2") || lower.includes("2-2");
    const isMixed =
      lower.includes("sleeper/seater") ||
      (lower.includes("sleeper") && lower.includes("seater"));
    // ✅ ALLOW semi sleeper
    return is2Plus2 && !isMixed;
  }, [busType]);

  // Detect if it's any 2+2 bus type (seater or sleeper) for forced layout handling
  const is2Plus2Bus = useMemo(() => {
    if (!busType) return false;
    const lower = busType.toLowerCase();
    return lower.includes("2+2") || lower.includes("2-2");
  }, [busType]);

const normalizeColumns = (deckSeats: NormalizedSeat[]) => {
  if (!deckSeats || deckSeats.length === 0) return [];

  const isAllSleeper = deckSeats.every(s => s.isSleeper);

  if (isAllSleeper) {
    // Step 1: group seats by row
    const rowGroups = new Map<number, NormalizedSeat[]>();
    deckSeats.forEach(seat => {
      if (!rowGroups.has(seat.row)) rowGroups.set(seat.row, []);
      rowGroups.get(seat.row)!.push(seat);
    });

    // Step 2: find the dominant "single side" col from rows that have 3 seats
    // (the full rows tell us exactly which col is the single side)
    const singleColVotes: Record<number, number> = {};
    const pairColVotes:   Record<number, number> = {};

    rowGroups.forEach(rowSeats => {
      if (rowSeats.length === 3) {
        // In a full 2+1 row: the col that appears once = single side
        // Sort by col, the outlier (min or max distance from others) is the single
        const sorted = [...rowSeats].sort((a, b) => a.col - b.col);
        // Gap between [0]→[1] vs [1]→[2]: bigger gap side = aisle
        const gap01 = sorted[1].col - sorted[0].col;
        const gap12 = sorted[2].col - sorted[1].col;
        if (gap01 > gap12) {
          // single is on the left (sorted[0])
          singleColVotes[sorted[0].col] = (singleColVotes[sorted[0].col] || 0) + 1;
          pairColVotes[sorted[1].col]   = (pairColVotes[sorted[1].col]   || 0) + 1;
          pairColVotes[sorted[2].col]   = (pairColVotes[sorted[2].col]   || 0) + 1;
        } else {
          // single is on the right (sorted[2])
          singleColVotes[sorted[2].col] = (singleColVotes[sorted[2].col] || 0) + 1;
          pairColVotes[sorted[0].col]   = (pairColVotes[sorted[0].col]   || 0) + 1;
          pairColVotes[sorted[1].col]   = (pairColVotes[sorted[1].col]   || 0) + 1;
        }
      }
    });

    // The dominant single col = highest vote in singleColVotes
    const usedCols   = [...new Set(deckSeats.map(s => s.col))].sort((a, b) => a - b);
    const singleCol  = Object.keys(singleColVotes).length > 0
      ? Number(Object.entries(singleColVotes).sort((a, b) => b[1] - a[1])[0][0])
      : usedCols[0]; // fallback

    const pairCols = [...new Set(
      Object.keys(pairColVotes).map(Number)
    )].sort((a, b) => a - b);

    // Any col that is neither the known singleCol nor a known pairCol
    // (e.g. L16's col:2, U16's col:1) → treat as single side too
    const knownCols = new Set([singleCol, ...pairCols]);
    const unknownCols = usedCols.filter(c => !knownCols.has(c));

    // Build target map
    // singleCol + any unknowns that appear in single-seat rows → 0
    // pairCols[0] → 2, pairCols[1] → 3
    const colTargetMap: Record<number, number> = {};

    colTargetMap[singleCol] = 0;

    // Map unknown cols: check if they appear in single-seat rows → col 0
    // otherwise append after pair cols
    unknownCols.forEach(col => {
      let appearsInSingleRow = false;
      rowGroups.forEach(rowSeats => {
        if (rowSeats.length === 1 && rowSeats[0].col === col) {
          appearsInSingleRow = true;
        }
      });
      colTargetMap[col] = appearsInSingleRow ? 0 : 3 + pairCols.length;
    });

    pairCols.forEach((col, i) => {
      colTargetMap[col] = 2 + i;
    });

    return deckSeats.map(seat => ({
      ...seat,
      col: colTargetMap[seat.col] ?? seat.col,
    }));
  }

  // Non-sleeper fallback — preserve one aisle gap when column values skip.
  const usedCols = [...new Set(deckSeats.map(s => s.col))].sort((a, b) => a - b);
  const colMap   = new Map<number, number>();
  let compressedIdx = 0;

  for (let i = 0; i < usedCols.length; i++) {
    const prev = usedCols[i - 1] ?? usedCols[0];
    const curr = usedCols[i];
    if (i > 0 && curr - prev > 1) compressedIdx++; // keep one blank column for aisle spacing
    colMap.set(curr, compressedIdx);
    compressedIdx++;
  }

  return deckSeats.map(seat => ({ ...seat, col: colMap.get(seat.col)! }));
};

  const format2Plus2Layout = (deckSeats: NormalizedSeat[]) => {
    if (!deckSeats || deckSeats.length === 0) return [];

    const rowGroups = new Map<number, NormalizedSeat[]>();
    deckSeats.forEach((seat) => {
      if (!rowGroups.has(seat.row)) rowGroups.set(seat.row, []);
      rowGroups.get(seat.row)!.push(seat);
    });

    return Array.from(rowGroups.entries()).flatMap(([, seatsInRow]) => {
      const sorted = [...seatsInRow].sort((a, b) => a.col - b.col);

      if (sorted.length >= 5) {
        return sorted.map((seat, index) => ({
          ...seat,
          col: index < 5 ? index : 4,
        }));
      }

      if (sorted.length === 4) {
        return sorted; // ✅ API ALREADY CORRECT, DO NOT OVERRIDE
      }

      if (sorted.length === 3) {
        const gap01 = sorted[1].col - sorted[0].col;
        const gap12 = sorted[2].col - sorted[1].col;
        if (gap01 > gap12) {
          return [
            { ...sorted[0], col: 0 },
            { ...sorted[1], col: 3 },
            { ...sorted[2], col: 4 },
          ];
        }
        return [
          { ...sorted[0], col: 0 },
          { ...sorted[1], col: 1 },
          { ...sorted[2], col: 3 },
        ];
      }

      if (sorted.length === 2) {
        if (sorted[1].col - sorted[0].col <= 1) {
          return sorted[0].col <= 1
            ? [
                { ...sorted[0], col: 0 },
                { ...sorted[1], col: 1 },
              ]
            : [
                { ...sorted[0], col: 3 },
                { ...sorted[1], col: 4 },
              ];
        }
        return [
          { ...sorted[0], col: 0 },
          { ...sorted[1], col: 3 },
        ];
      }

      if (sorted.length === 1) {
        return [
          { ...sorted[0], col: sorted[0].col <= 1 ? 0 : 3 },
        ];
      }

      return sorted;
    });
  };

  // ✅ FIX: Compute safe CSS Grid Rows based on sleeper height
  const computeVisualGrid = (deckSeats: NormalizedSeat[], isVrl: boolean = false): SeatWithGrid[] => {
    if (!deckSeats || deckSeats.length === 0) return [];

    const isSrsSleeperSeater =
      provider === "SRS" &&
      busType?.toLowerCase().includes("sleeper") &&
      busType?.toLowerCase().includes("seater");

    if (isSrsSleeperSeater) {
      const upperDeck = deckSeats.every(s => s.isUpper);

      if (upperDeck) {
        const uniqueRows = [...new Set(deckSeats.map(s => s.row))].sort((a, b) => a - b);
        const rowMap = new Map<number, number>();
        uniqueRows.forEach((row, idx) => {
          rowMap.set(row, idx);
        });
        deckSeats = deckSeats.map(seat => ({
          ...seat,
          row: rowMap.get(seat.row) ?? seat.row,
        }));
      }
    }

    // Check if the deck has exactly one seater and the rest are sleepers.
    const seaterCount = deckSeats.filter(s => !s.isSleeper).length;
    const sleeperCount = deckSeats.filter(s => s.isSleeper).length;
    const isSingleSeaterMixedBus = seaterCount === 1 && sleeperCount > 0;

    if (isVrl) {
      // For VRL, we trust API coordinates but must compress them to avoid large visual gaps.
      // 1. Compress columns to create a standard aisle.
      const colNormalized = normalizeColumns(deckSeats);
      return colNormalized
        .filter((s: any) => Number(s.BlockType) !== 3)
        .map(seat => {
          const isMixedVrl =
            busType?.toLowerCase().includes("sleeper") &&
            busType?.toLowerCase().includes("seater");

          // shift ONLY seater-side columns down
          const shouldShiftDown =
            isMixedVrl &&
            !seat.isSleeper &&
            seat.col >= 2;

          return {
            ...seat,
            gridRow: seat.row + 1 + (shouldShiftDown ? 1 : 0),
            allSleeperRow: false,
            totalSeatsInRow: 0,
            isLastRow: false,
          };
        });
    }

    let axisMappedSeats = deckSeats;

    if (provider === "EZEE_V2" || provider === "EZEE_V3") {
      const minRow = deckSeats.length > 0 ? Math.min(...deckSeats.map(s => s.row)) : 0;
      const deckMaxCol = deckSeats.length > 0 ? Math.max(...deckSeats.map(s => s.col)) : 3;

      axisMappedSeats = deckSeats.map(seat => ({
        ...seat,
        // Make it 0-indexed for the formula to work correctly
        row: seat.row - minRow,
        // EZEE API assigns columns in reverse (right to left). 
        // We flip them so deckMaxCol becomes 0 (left side).
        col: deckMaxCol - seat.col,
      }));

      // Compress columns to avoid giant aisle gaps
      const usedCols = [...new Set(axisMappedSeats.map(s => s.col))].sort((a, b) => a - b);
      const uniqueCols = [...new Set(axisMappedSeats.map(s => s.col))].sort((a, b) => a - b);
      const rotatedSeats = axisMappedSeats.filter(s => lastSeats.includes(s.id) || s.isRotated);

      const needsAisleGap = rotatedSeats.length === 0;

      const colMap = new Map<number, number>();
      usedCols.forEach((c, i) => {
        colMap.set(c, i);
      });

      if (needsAisleGap) {
        let compressedIdx = 0;
        for (let i = 0; i < uniqueCols.length; i++) {
          const prev = uniqueCols[i - 1] ?? uniqueCols[0];
          const curr = uniqueCols[i];
          if (i > 0 && curr - prev > 1) compressedIdx++; // keep one blank column for aisle spacing
          colMap.set(curr, compressedIdx);
          compressedIdx++;
        }
      } else {
        uniqueCols.forEach((c, i) => {
          colMap.set(c, i);
        });
      }

      axisMappedSeats = axisMappedSeats.map(seat => {
        let mappedCol = colMap.get(seat.col)!;
        const upperId = String(seat.id).toUpperCase();
        const isRestRoom = ["RRM", "REME", "RM", "RESTROOM", "WASHROOM"].includes(upperId) || (seat as any).isRestRoom || (seat as any).seatType === "RRM";
        const isRotated = lastSeats.includes(seat.id) || seat.isRotated;

        if (isRestRoom) {
          mappedCol = 0; // Force restroom to left column
        } else if (isRotated) {
          mappedCol = 1; // Force horizontal sleepers to center aisle column
        }

        return {
          ...seat,
          col: mappedCol,
        };
      });

    }

    const isPureSriBalajiSleeper =
      operatorName?.toLowerCase().includes("balaji") &&
      busType?.toLowerCase().includes("sleeper") &&
      !busType?.toLowerCase().includes("seater");

    const is21SleeperBus =
      /(^|\s)(2\+1|1\+2|2-1|1-2)(\s|$)/i.test(busType || "") ||
      (busType?.toLowerCase().includes("sleeper") && !busType?.toLowerCase().includes("seater"));

    // ✅ Check if this is a strict SRS 2+2 layout that uses perfect seat-letter rows
    const isSRS2Plus2 = provider === "SRS" && is2Plus2Bus &&
      !busType?.toLowerCase().includes("semi sleeper") &&
      !(busType?.toLowerCase().includes("sleeper") && busType?.toLowerCase().includes("seater"));

    const shouldSkipColumnNormalization =
      isPureSriBalajiSleeper || isVrl || isSRS2Plus2 || provider === "EZEE_V2" || provider === "EZEE_V3";

    // 1. Enforce 2+2 layout only for true 2+2 buses.
    //    For VRL normal buses, trust the API coordinates instead of forcing compression.
    let colNormalized = axisMappedSeats;
    
    // ✅ Bypass format2Plus2Layout for SRS 2+2, preserving exact seat parser coordinates
    if (is2Plus2Bus && !isVrl && !isSRS2Plus2) {
      colNormalized = format2Plus2Layout(axisMappedSeats);
    } else if (!shouldSkipColumnNormalization) {
      colNormalized = normalizeColumns(axisMappedSeats);
    }

    // FIX: normalize sparse 2+1 sleeper columns
    if (
      is21SleeperBus &&
      !isVrl &&
      provider === "SRS"
    ) {
      colNormalized = normalizeColumns(axisMappedSeats);
    }

    if (isPureSriBalajiSleeper) {
      const rowGroups = new Map<number, typeof axisMappedSeats>();
      colNormalized.forEach((seat) => {
        if (!rowGroups.has(seat.row)) rowGroups.set(seat.row, []);
        rowGroups.get(seat.row)!.push(seat);
      });

      colNormalized = Array.from(rowGroups.entries()).flatMap(([, seatsInRow]) => {
        const sorted = [...seatsInRow].sort((a, b) => a.col - b.col);
        return sorted.map((seat, index) => {
          const targetCols = [0, 2, 3];
          return {
            ...seat,
            col: targetCols[index] ?? targetCols[targetCols.length - 1] + index - targetCols.length + 1,
          };
        });
      });
    }

    const normalizedTypeGrid = String(busType || "").toLowerCase();
    const isMixedGrid =
      normalizedTypeGrid.includes("sleeper/seater") ||
      normalizedTypeGrid.includes("semi sleeper") ||
      normalizedTypeGrid.includes("semi-sleeper") ||
      (normalizedTypeGrid.includes("sleeper") && normalizedTypeGrid.includes("seater"));

    const isDurgamba = operatorName?.toLowerCase().includes("durgamba");

    // Fix collision in last row by moving to next row if there is a collision
    const currentMaxRow = Math.max(...colNormalized.map(s => s.row));
    const lastRowSeatsToCheck = colNormalized.filter(s => s.row === currentMaxRow);
    
    const colCounts = new Map<number, number>();
    let hasCollision = false;
    lastRowSeatsToCheck.forEach(s => {
      const count = (colCounts.get(s.col) || 0) + 1;
      colCounts.set(s.col, count);
      if (count > 1) hasCollision = true;
    });

    if (hasCollision) {
        const colOccurrences = new Map<number, number>();
        colNormalized = colNormalized.map(seat => {
          if (seat.row === currentMaxRow) {
              const count = colOccurrences.get(seat.col) || 0;
              colOccurrences.set(seat.col, count + 1);
              if (count === 0) { // First seat in this col, keep it in the original row
                return seat;
              }
              if (count > 0) {
                return { ...seat, row: currentMaxRow + count };
              }
          }
          return seat;
        });
    }

    const maxRow = Math.max(...colNormalized.map(s => s.row));
    const lastRowSeats = colNormalized.filter(s => s.row === maxRow);
    
    // ✅ ONLY sleeper seats
    const lastRowSleepers = lastRowSeats.filter(s => s.isSleeper);
    const rotatedSeats = colNormalized.filter(s => lastSeats.includes(s.id) || s.isRotated);
    
    if (provider === "EZEE_V2" || provider === "EZEE_V3") {
      console.log(
        "EZEE horizontal seats",
        rotatedSeats.map(s => ({
          id: s.id,
          row: s.row,
          col: s.col
        }))
      );
    }

    const shiftedSeatIds = new Set<string>();

    const allowCenterShift = !isVrl && provider !== "EZEE_V2" && provider !== "EZEE_V3";

    if (rotatedSeats.length > 0) {
      colNormalized = colNormalized.map(seat => {
        if (rotatedSeats.some(s => s.id === seat.id)) {
          shiftedSeatIds.add(seat.id);
          const index = rotatedSeats.findIndex(s => s.id === seat.id);

          if (provider === "EZEE_V2" || provider === "EZEE_V3") {
            console.log("EZEE horizontal seat", seat.id, "=> col", 1);
            return {
              ...seat,
              row: seat.row, // Keep original API row to avoid massive vertical gaps
              col: 1, // center in aisle column
            };
          } else if (allowCenterShift) {
            return {
              ...seat,
              row: maxRow + index + 1,
              col: 1, // center
            };
          }
        }
        return seat;
      });
    }

    const isMixedDeck = deckSeats.some(s => s.isSleeper) && deckSeats.some(s => !s.isSleeper);

    const hasLegacyLetterSeats =
      deckSeats.some(s => /^[A-Z]$/i.test(String(s.id).trim()));

    const hasDualPrefixSeats =
      deckSeats.some(s =>
        /^(DU|SU|DL|SL)\d+$/i.test(String(s.id).trim())
      );

    const patternRows = [...new Set(deckSeats.map(s => s.row))].sort((a, b) => a - b);

    const rowTypes = patternRows.map(row => {
      const seats = deckSeats.filter(s => s.row === row);

      return {
        row,
        hasSeater: seats.some(s => !s.isSleeper),
        hasSleeper: seats.some(s => s.isSleeper),
      };
    });

    const firstPureSleeperIndex = rowTypes.findIndex(
      r => r.hasSleeper && !r.hasSeater
    );

    const allBeforeAreSeaters =
      firstPureSleeperIndex > 0 &&
      rowTypes
        .slice(0, firstPureSleeperIndex)
        .every(r => r.hasSeater && !r.hasSleeper);

    const allAfterAreSleepers =
      firstPureSleeperIndex > 0 &&
      rowTypes
        .slice(firstPureSleeperIndex)
        .every(r => r.hasSleeper);

    const hasContinuousSeaterThenSleeperPattern =
      firstPureSleeperIndex >= 3 &&
      allBeforeAreSeaters &&
      allAfterAreSleepers;

    const hasRealSeaters = deckSeats.some(s => !s.isSleeper);
    const hasRealSleepers = deckSeats.some(s => s.isSleeper);

    const isEzeeThreeRowSeaterLayout =
      (provider === "EZEE_V2" || provider === "EZEE_V3") &&
      hasRealSeaters &&
      hasRealSleepers &&
      (
        hasLegacyLetterSeats ||
        hasDualPrefixSeats ||
        hasContinuousSeaterThenSleeperPattern
      );

    if (isEzeeThreeRowSeaterLayout) {
      console.log(
        "[Layout] EZEE Continuous Seater -> Sleeper layout detected",
        {
          hasLegacyLetterSeats,
          hasDualPrefixSeats,
          hasContinuousSeaterThenSleeperPattern,
        }
      );

      const seaterRows = [...new Set(
        colNormalized
          .filter(s => !s.isSleeper)
          .map(s => s.row)
      )].length;

      colNormalized = colNormalized.map(seat => {
        if (seat.isSleeper) {
          return {
            ...seat,
            row: seat.row + seaterRows
          };
        }
        return seat;
      });
    }

    // 4. Map absolute API rows → safe CSS Grid rows
    const sortedRows = [...new Set(colNormalized.map(s => s.row))].sort((a, b) => a - b);
    const rowMap = new Map<number, number>();
    const rowIsAllSleeper = new Map<number, boolean>();
    let currentGridRow = 1;

    sortedRows.forEach(apiRow => {
      const seatsInRow = colNormalized.filter(s => s.row === apiRow);
      const hasSleeperInRow = seatsInRow.some(s => s.isSleeper);
      const allSleepers =
        provider !== "VRL" &&
        seatsInRow.length > 0 &&
        seatsInRow.every(s => s.isSleeper);
      const isShiftedRow = seatsInRow.length > 0 && seatsInRow.every(s => shiftedSeatIds.has(s.id));

      let treatAsAllSleeper = allSleepers;
      const hasOnlyRotatedSeats = seatsInRow.length > 0 && seatsInRow.every(s => lastSeats.includes(s.id) || s.isRotated);

      // For EZEE mixed layouts, if ANY seat in the row is a sleeper, the entire
      // grid row must be expanded to accommodate it, otherwise the taller sleeper
      // seat will visually collide with the seater-height row below it.
      if (provider === "EZEE_V2" || provider === "EZEE_V3") {
        treatAsAllSleeper = hasSleeperInRow;
      }

      if (
        isMixedDeck &&
        allSleepers &&
        sortedRows.includes(apiRow + 1)
      ) {
        const nextRowSeats = colNormalized.filter(s => s.row === apiRow + 1);
        const nextRowHasSeaters = nextRowSeats.some(s => !s.isSleeper);
        const sleeperCols = new Set(
          seatsInRow
            .filter(s => s.isSleeper)
            .map(s => s.col)
        );
        const actualCollision = nextRowSeats.some(
          s => sleeperCols.has(s.col)
        );

        // ONLY skip expansion if next row has NO collision
        if (nextRowHasSeaters && !actualCollision) {
          treatAsAllSleeper = false;
        }
      }
      
      // For Durgamba lower deck mixed bus, the first row (door) is just a single sleeper.
      // We shouldn't jump 2 grid rows for it, otherwise it creates a huge gap to the next sleeper.
      const isLowerDeck = deckSeats.length > 0 && !deckSeats[0].isUpper;
      if (isDurgamba && busType?.toLowerCase().includes("sleeper") && busType?.toLowerCase().includes("seater")) {
        if (isLowerDeck && allSleepers && apiRow === 0) {
          treatAsAllSleeper = false;
        }
      }

      rowMap.set(apiRow, currentGridRow);
      rowIsAllSleeper.set(apiRow, treatAsAllSleeper);

      const isMixedVrl =
        isVrl &&
        busType?.toLowerCase().includes("sleeper") &&
        busType?.toLowerCase().includes("seater");

      const shouldExpandRow =
        treatAsAllSleeper &&
        !isShiftedRow &&
        provider !== "VRL";

      const isMixedEzee = (provider === "EZEE_V2" || provider === "EZEE_V3") && isMixedDeck && !isEzeeThreeRowSeaterLayout;

      if ((provider === "EZEE_V2" || provider === "EZEE_V3") && hasOnlyRotatedSeats) {
        currentGridRow += 1;
      } else if (isMixedEzee) {
        // For EZEE mixed layouts, sleepers will span 2 grid rows, but we increment
        // the grid row counter by 1 for each API row to allow seaters to stack correctly.
        currentGridRow += 1;
      } else {
        currentGridRow += shouldExpandRow ? 2 : 1;
      }
    });

    // 🔥 Add totalSeatsInRow and isLastRow for each seat
    const rowCounts: Record<number, number> = {};
    colNormalized.forEach(s => {
      rowCounts[s.row] = (rowCounts[s.row] || 0) + 1;
    });
    const maxRowVal = Math.max(...colNormalized.map(s => s.row));

    const isSrsMixed =
      provider === "SRS" &&
      busType?.toLowerCase().includes("sleeper") &&
      busType?.toLowerCase().includes("seater");

    const isEzeeProvider = provider === "EZEE_V2" || provider === "EZEE_V3";
    const mixedEzeeCols = new Set<number>();
    const ezeeGridRows = new Map<string, number>();
    const ezeeNeedsSleeperSlotSet = new Set<string>();
    const ezeeAlignToBottomSet = new Set<string>();

    if (isEzeeProvider && !isEzeeThreeRowSeaterLayout) {
      const cols = [...new Set(colNormalized.map(s => s.col))];
      cols.forEach(col => {
        const seatsInCol = colNormalized.filter(s => s.col === col).sort((a, b) => a.row - b.row);
        const hasSleeper = seatsInCol.some(s => s.isSleeper);
        const hasSeater = seatsInCol.some(s => !s.isSleeper);
        const isMixedCol = hasSleeper && hasSeater;
        const isPureSleeper = hasSleeper && !hasSeater;
        
        if (isMixedCol) mixedEzeeCols.add(col);

        let currentTrack = 1;
        let pureSleeperTrack = 1;

        seatsInCol.forEach((seat, index) => {
          const isRotated = lastSeats.includes(seat.id) || seat.isRotated;

          if (isMixedCol) {
            const prevSeat = seatsInCol[index - 1];
            const nextSeat = seatsInCol[index + 1];

            const prevIsAdjacentSleeper = prevSeat?.isSleeper && (seat.row - prevSeat.row === 1);
            const nextIsAdjacentSleeper = nextSeat?.isSleeper && (nextSeat.row - seat.row === 1);

            const sleepersAfter = seatsInCol.slice(index + 1).filter(s => s.isSleeper).length;
            const isLastSeat = index === seatsInCol.length - 1;

            const needsSleeperSlot =
              !seat.isSleeper &&
              (
                (prevIsAdjacentSleeper && nextIsAdjacentSleeper) ||
                (index === 0 && sleepersAfter >= 2) ||
                (isLastSeat && prevIsAdjacentSleeper)
              );

            if (needsSleeperSlot) {
              ezeeNeedsSleeperSlotSet.add(seat.id);
              if (isLastSeat) {
                ezeeAlignToBottomSet.add(seat.id);
              }
            }

            // Expected physical row should NOT force gaps for rotated seats
            const expectedPhysicalRow = isRotated ? currentTrack : (seat.isSleeper || needsSleeperSlot ? (seat.row * 2) + 1 : seat.row + 1);
            currentTrack = Math.max(currentTrack, expectedPhysicalRow);
            if (index === 0) {
              currentTrack += seat.row;
              if (seat.isSleeper && !isRotated && currentTrack === 1) {
                currentTrack = 2;
              }
            } else {
              const gapRows = Math.max(0, seat.row - prevSeat.row - 1);
              currentTrack += gapRows;
            }

            ezeeGridRows.set(seat.id, currentTrack);
            const spans2 = (seat.isSleeper && !isRotated) || needsSleeperSlot;
            currentTrack += spans2 ? 2 : 1;
          } else if (isPureSleeper) {
            if (index === 0) {
              pureSleeperTrack = (seat.row * 2) + 1;
              pureSleeperTrack = (seat.row * 2) + 2;
            } else {
              const prevSeat = seatsInCol[index - 1];
              const prevIsRotated = lastSeats.includes(prevSeat.id) || prevSeat.isRotated;
              const gapRows = Math.max(0, seat.row - prevSeat.row - 1);
              const prevSpan = prevIsRotated ? 1 : 2;
              pureSleeperTrack += prevSpan + (gapRows * 2);
            }
            ezeeGridRows.set(seat.id, pureSleeperTrack);
          } else {
            ezeeGridRows.set(seat.id, seat.row + 1);
          }
        });
      });
    }

    // For SRS or specific EZEE mixed layouts, the API coordinates are generally correct and should not
    // be subjected to EZEE's special seater-stacking logic. We can return early.
    if (isSrsMixed || isEzeeThreeRowSeaterLayout) {
      console.log(`[Layout] ${isSrsMixed ? "SRS" : "EZEE Three Row Seater"} mixed layout detected. Bypassing specific stacking logic.`);
      
      let sleeperOffset = 0;
      if (isEzeeThreeRowSeaterLayout) {
        const seaters = colNormalized.filter(s => !s.isSleeper);
        const sleepers = colNormalized.filter(s => s.isSleeper);
        if (seaters.length > 0 && sleepers.length > 0) {
          const seaterMaxGridRow = Math.max(...seaters.map(s => rowMap.get(s.row)!));
          const sleeperMinMappedRow = Math.min(...sleepers.map(s => rowMap.get(s.row)!));
          // First sleeper starts exactly 2 grid rows below the last seater to create a 1-row gap
          const targetFirstSleeperRow = seaterMaxGridRow + 2; 
          sleeperOffset = targetFirstSleeperRow - sleeperMinMappedRow;
        }
      }

      return colNormalized.map(seat => {
        const mappedRow = rowMap.get(seat.row)!;
        return {
          ...seat,
          gridRow: (isEzeeThreeRowSeaterLayout && seat.isSleeper) ? mappedRow + sleeperOffset : mappedRow,
          allSleeperRow: rowIsAllSleeper.get(seat.row) ?? false,
          shouldAlignToBottom: false, // SRS mixed layouts do not need seater centering.
          totalSeatsInRow: rowCounts[seat.row],
          isLastRow: shiftedSeatIds.has(seat.id) || seat.row === maxRowVal,
          isInMixedEzeeColumn: false,
          ezeeNeedsSleeperSlot: false,
          isEzeeThreeRowSeaterLayout: isEzeeThreeRowSeaterLayout,
        };
      });
    }

    const visualGridResult = colNormalized.map(seat => {
      const gridRowForApiRow = rowMap.get(seat.row)!;
      const seatsInSameRow = colNormalized.filter(s => s.row === seat.row);
      const rowHasSleeper = seatsInSameRow.some(s => s.isSleeper);

      let finalGridRow = gridRowForApiRow;
      let finalShouldAlignToBottom = false;
      let shouldCenterInSleeperSlot = false;

      if (isEzeeProvider) {
        finalGridRow = ezeeGridRows.get(seat.id) || 1;
      }

      console.log(seat.id, seat.row, finalGridRow, seat.isRotated);

      return {
        ...seat,
        gridRow: finalGridRow,
        allSleeperRow: rowIsAllSleeper.get(seat.row) ?? false,
        shouldAlignToBottom: finalShouldAlignToBottom,
        shouldCenterInSleeperSlot,
        totalSeatsInRow: rowCounts[seat.row],
        isLastRow: shiftedSeatIds.has(seat.id) || seat.row === maxRowVal,
        isInMixedEzeeColumn: mixedEzeeCols.has(seat.col),
        ezeeNeedsSleeperSlot: ezeeNeedsSleeperSlotSet.has(seat.id),
        ezeeAlignToBottom: ezeeAlignToBottomSet.has(seat.id),
      };
    });

    console.log(
      "Rotated Seats Grid Check:",
      visualGridResult
        .filter(s => lastSeats.includes(s.id) || s.isRotated)
        .map(s => ({
          id: s.id,
          row: s.row,
          gridRow: s.gridRow
        }))
    );

    return visualGridResult;
  };

  // ✅ Process both decks through the visual grid formatter
  const normalizedLowerDeckSeats = useMemo(
    () => computeVisualGrid(correctedLowerDeckSeats, isVrl), // isLowerDeck is inferred inside
    [correctedLowerDeckSeats, isVrl, busType, operatorName, provider, lastSeats]
  );

  const normalizedUpperDeckSeats = useMemo(
    () => computeVisualGrid(correctedUpperDeckSeats, isVrl), // isLowerDeck is inferred inside
    [correctedUpperDeckSeats, isVrl, busType, operatorName, provider, lastSeats]
  );

const maxCol = isHard49SeaterBus
  ? 5
  : Math.max(
      ...normalizedLowerDeckSeats.map(s => s.col),
      ...normalizedUpperDeckSeats.map(s => s.col),
      0
    ) + 1;
  // ✅ Calculate Max Row based on the new gridRow value
  const getExtraRowSpan = (s: any) => {
    const isShifted = !isVrl && s.isRotated;
    const spans2 = s.isSleeper || s.shouldCenterInSleeperSlot || s.ezeeNeedsSleeperSlot;
    return spans2 && !isShifted ? 1 : 0;
  };

  const maxLowerRow =
    normalizedLowerDeckSeats.length > 0
      ? Math.max(
          ...normalizedLowerDeckSeats.map((s: any) => s.gridRow + getExtraRowSpan(s))
        )
      : 0;

  const maxUpperRow =
    normalizedUpperDeckSeats.length > 0
      ? Math.max(
          ...normalizedUpperDeckSeats.map((s: any) => s.gridRow + getExtraRowSpan(s))
        )
      : 0;

  const finalMaxRow = Math.max(maxLowerRow, maxUpperRow);

  // ✅ Detect mixed bus for dynamic grid sizing
  const isMixedBus = useMemo(() => {
    if (!busType) return false;
    const lower = busType.toLowerCase();
    return lower.includes("seater") && lower.includes("sleeper");
  }, [busType]);

  const legendSeat = (overrides: Partial<NormalizedSeat>): NormalizedSeat => ({
    id: "",
    row: 0,
    col: 0,
    isUpper: false,
    isAvailable: true,
    isLadies: false,
    isMale: false,
    isSleeper: false,
    fare: 0,
    ...overrides,
  });

  const renderTimeline = (
    points: any[],
    defaultTime: string,
    mainCity: string,
    titleOverride?: string,
    isDrop?: boolean
  ) => {
    if (!points || points.length === 0)
      return (
        <div
          className="p-4 text-center text-muted mt-2 border rounded"
          style={{ fontSize: "13px" }}
        >
          Location details are temporarily unavailable.
        </div>
      );

    return (
      <div
        className="pt-3 w-100"
        style={{
          maxHeight: "450px",
          overflowY: "auto",
          overflowX: "hidden",
          paddingRight: "10px",
        }}
      >
        <h5 className="fw-bold mb-1 text-dark" style={{ fontSize: "16px" }}>
          {titleOverride ||
            (activeTab === "boarding" ? "Boarding point" : "Dropping point")}
        </h5>
        <p className="text-muted small mb-4" style={{ fontSize: "13px" }}>
          {mainCity}
        </p>
        {points.map((point, index) => {
          const isLast = index === points.length - 1;

          const rawTime =
            point?.time ||
            point?.Time ||
            point?.bpTime ||
            point?.dpTime ||
            point?.stage ||
            point?.name ||
            "";
          const time = extractTime(rawTime, defaultTime);

          const rawLocationName =
            point?.stage ||
            point?.locationName ||
            point?.LocationName ||
            point?.name ||
            point?.Name ||
            point?.bpName ||
            point?.dpName ||
            (typeof point === "string" ? point : "Point");
          const locationName = cleanLocationName(rawLocationName);

          const rawLandmark =
            point?.landmark ||
            point?.Landmark ||
            point?.address ||
            point?.Address ||
            "";
          const cleanedLandmark = cleanLocationName(rawLandmark);
          const finalLandmark =
            cleanedLandmark.toLowerCase() !== locationName.toLowerCase()
              ? cleanedLandmark
              : "";

          return (
            <div
              className="d-flex position-relative mb-0 w-100"
              key={index}
            >
              <div
                className="text-end pe-3 flex-shrink-0"
                style={{ width: "70px", paddingTop: "0px" }}
              >
                <div
                  className="fw-bold"
                  style={{
                    fontSize: "13px",
                    color: "#1f2937",
                    whiteSpace: "nowrap",
                  }}
                >
                  {time}
                </div>
                <div
                  className="text-muted"
                  style={{ fontSize: "11px", whiteSpace: "nowrap" }}
                >
                  {journeyDateShort}
                </div>
              </div>
              <div
                className="d-flex flex-column align-items-center position-relative flex-shrink-0"
                style={{ width: "20px" }}
              >
                {!isDrop ? (
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      border: "3px solid #0D2B4C",
                      borderRadius: "50%",
                      backgroundColor: "#fff",
                      zIndex: 1,
                      marginTop: "3px",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      backgroundColor: "#e11d48",
                      borderRadius: "2px",
                      zIndex: 1,
                      marginTop: "4px",
                      boxShadow: "0 2px 4px rgba(225, 29, 72, 0.3)",
                    }}
                  />
                )}
                {!isLast && (
                  <div
                    style={{
                      position: "absolute",
                      top: "15px",
                      bottom: "-10px",
                      width: "2px",
                      backgroundColor: "#E5E7EB",
                      left: "50%",
                      transform: "translateX(-50%)",
                    }}
                  />
                )}
              </div>
              <div
                className="ps-3 pb-4 flex-grow-1 text-start"
                style={{ minWidth: 0, paddingTop: "0px" }}
              >
                <div
                  className="fw-bold text-dark text-break"
                  style={{ fontSize: "13px", lineHeight: "1.4" }}
                >
                  {locationName}
                </div>
                {finalLandmark && (
                  <div
                    className="text-muted text-break"
                    style={{
                      fontSize: "11px",
                      marginTop: "2px",
                      lineHeight: "1.4",
                    }}
                  >
                    {finalLandmark}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const gridStyle = {
    display: "grid",
    gridTemplateRows: `repeat(
      ${finalMaxRow},
      ${
        is2Plus2Bus
          ? "44px"
          : isMixedBus
          ? "42px"
          : "38px"
      }
    )`,
    gridTemplateColumns: isHard49SeaterBus
      ? "42px 42px 42px 42px 42px"
      : `repeat(${maxCol}, ${isMixedBus ? "46px" : "42px"})`,
    columnGap: is2Plus2Bus ? "20px" : "16px",
    rowGap: is2Plus2Bus
      ? "16px"
      : isMixedBus
      ? "13px"
      : "14px",
    width: "max-content",
    justifyItems: "center",
    alignItems: "center",
  };

  return (
    <div className="row step-1-row d-flex flex-column flex-lg-row justify-content-center align-items-start gap-4 gap-lg-0">
      <div
        className="col-12 col-lg-6 col-xl-6 px-lg-3 left-section"
        style={{ overflowX: "auto" }}
      >
        {isLoading ? (
          <div
            className="d-flex justify-content-center align-items-center w-100"
            style={{ minHeight: "300px" }}
          >
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : !seats || seats.length === 0 ? (
          <div
            className="d-flex justify-content-center align-items-center w-100 text-muted fw-bold"
            style={{ minHeight: "300px" }}
          >
            No seats available or bus layout not found.
          </div>
        ) : (
          <div
            className="decks-scroll-wrapper"
            style={{ overflowX: "auto", width: "100%" }}
          >
            <div
              className="decks-container d-flex justify-content-center gap-4"
              style={{ minWidth: "max-content" }}
            >
              {normalizedLowerDeckSeats.length > 0 && (
                <div
                  className="bus-outline"
                  style={{
                    width: "fit-content",
                    minHeight: "100%",
                    height: "max-content",
                    display: "flex",
                    flexDirection: "column",
                    paddingBottom: "30px",
                    paddingTop: "62px",
                  }}
                >
                  <div className="deck-title">{normalizedUpperDeckSeats.length > 0 ? "Lower deck" : "Main deck"}</div>
                  <i className="bi bi-life-preserver steering-wheel"></i>
                  <div className="redbus-grid" style={gridStyle}>
                    {[...normalizedLowerDeckSeats]
                      .sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col)
                      .map((seat) => (
                      <RenderSeat
                        key={`${seat.row}-${seat.col}-${seat.id}`}
                        seat={seat}
                        isSelected={selectedSeats.some((s) => s.id === seat.id)} // Pass isSelected here
                        provider={provider} // Pass provider to RenderSeat
                        handleSeatClick={handleSeatClick}
                        operatorName={operatorName}
                        busType={busType}
                        lastSeats={lastSeats}
                      />
                    ))}
                  </div>
                </div>
              )}

              {normalizedUpperDeckSeats.length > 0 && (
                <div
                  className="bus-outline"
                  style={{
                    width: "fit-content",
                    minHeight: "100%",
                    height: "max-content",
                    display: "flex",
                    flexDirection: "column",
                    paddingBottom: "30px",
                    paddingTop: "62px",
                  }}
                >
                  <div className="deck-title">Upper deck</div>
                  <div className="redbus-grid" style={gridStyle}>
                    {[...normalizedUpperDeckSeats]
                      .sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col)
                      .map((seat) => (
                      <RenderSeat
                        key={`${seat.row}-${seat.col}-${seat.id}`}
                        seat={seat}
                        isSelected={selectedSeats.some((s) => s.id === seat.id)} // Pass isSelected here
                        provider={provider} // Pass provider to RenderSeat
                        handleSeatClick={handleSeatClick}
                        operatorName={operatorName}
                        busType={busType}
                        lastSeats={lastSeats}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="w-100 d-flex justify-content-center pt-4">
          <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: "16px" }}>
            Know your seat types
          </h6>
        </div>

        <div className="legend-card mt-3">
          <div className="table-responsive overflow-hidden">
            <table
              className="table-borderless legend-table w-100"
              style={{ fontSize: "14px" }}
            >
              <thead className="fw-normal">
                <tr>
                  <th className="text-start pb-2">Seat Types</th>
                  <th className="text-center pb-2">Seater</th>
                  <th className="text-center pb-2">Sleeper</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: "Available",
                    overrides: { isAvailable: true, isLadies: false, isMale: false },
                  },
                  {
                    label: "Available only for male passenger",
                    overrides: { isAvailable: true, isLadies: false, isMale: true },
                  },
                  {
                    label: "Already booked",
                    overrides: { isAvailable: false, isLadies: false, isMale: false },
                  },
                  {
                    label: "Available only for female passenger",
                    overrides: { isAvailable: true, isLadies: true, isMale: false },
                  },
                  {
                    label: "Booked by female passenger",
                    overrides: { isAvailable: false, isLadies: true, isMale: false },
                  },
                  {
                    label: "Booked by male passenger",
                    overrides: { isAvailable: false, isLadies: false, isMale: true },
                  },
                ].map(({ label, overrides }) => (
                  <tr key={label}>
                    <td className="text-start text-dark fw-medium pb-2">
                      {label}
                    </td>
                    <td className="text-center pb-2">
                      <RenderSeat
                        seat={legendSeat({ ...overrides, isSleeper: false })}
                        isLegend
                        isSelected={false}
                        handleSeatClick={handleSeatClick}
                      />
                    </td>
                    <td className="text-center pb-2">
                      <RenderSeat
                        seat={legendSeat({ ...overrides, isSleeper: true })}
                        isLegend
                        isSelected={false}
                        handleSeatClick={handleSeatClick}
                      />
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="text-start text-dark fw-medium pb-2">
                    Selected by you
                  </td>
                  <td className="text-center pb-2">
                    <RenderSeat
                      seat={legendSeat({ isSleeper: false })}
                      isLegend
                      forceSelected
                      isSelected={false}
                      handleSeatClick={handleSeatClick}
                    />
                  </td>
                  <td className="text-center pb-2">
                    <RenderSeat
                      seat={legendSeat({ isSleeper: true })}
                      isLegend
                      forceSelected
                      isSelected={false}
                      handleSeatClick={handleSeatClick}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-6 col-xl-5 px-lg-3">
        <div className="right-sidebar-container w-100">
          <div className="seat-sidebar">
            <div className="d-flex justify-content-between align-items-start mb-4">
              <div>
                <h5
                  className="fw-bold m-0 text-dark"
                  style={{ fontSize: "18px" }}
                >
                  {operatorName}
                </h5>
                <div className="text-muted mt-1" style={{ fontSize: "13px" }}>
                  {departureTime} - {arrivalTime} • {journeyDateShort}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: "13px" }}>
                  {(() => {
                    if (!busType) return "";

                    const lower = busType.toLowerCase();

                    // Mixed seater+sleeper bus — normalize the slash spacing
                    if (lower.includes("seater") && lower.includes("sleeper")) {
                      return busType
                        .replace("Seater/Sleeper", "Seater / Sleeper")
                        .replace("SeaterSleeper", "Seater / Sleeper");
                    }

                    // Pure sleeper only — return as-is
                    if (lower.includes("sleeper") && !lower.includes("seater")) {
                      return busType;
                    }

                    return busType;
                  })()}
                </div>
              </div>
              <div
                className="badge bg-success rounded px-2 py-1 d-flex align-items-center gap-1"
                style={{ fontSize: "13px" }}
              >
                ★ {rating}{" "}
                <span
                  className="fw-normal"
                  style={{ fontSize: "10px", marginLeft: "2px" }}
                >
                  1100
                </span>
              </div>
            </div>

            <div
              className="sidebar-tabs d-xl-none"
              style={{ fontSize: "14px" }}
            >
              {(
                [
                  { id: "why", label: "Why book this bus?" },
                  { id: "route", label: "Bus route" },
                  { id: "boarding", label: "Boarding point" },
                  { id: "dropping", label: "Dropping point" },
                ] as const
              ).map((tab) => (
                <span
                  key={tab.id}
                  className={activeTab === tab.id ? "active" : ""}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    paddingBottom: "10px",
                    borderBottom:
                      activeTab === tab.id ? "2px solid #000" : "none",
                    fontWeight: activeTab === tab.id ? "600" : "normal",
                    color: activeTab === tab.id ? "#000" : "#6B7280",
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </span>
              ))}
            </div>

            <div className="tab-content-area mobile-tabs d-xl-none w-100">
              {activeTab === "boarding" &&
                renderTimeline(
                  boardingPoints,
                  departureTime,
                  sourceCity,
                  undefined,
                  false
                )}
              {activeTab === "dropping" &&
                renderTimeline(
                  droppingPoints,
                  arrivalTime,
                  destinationCity,
                  undefined,
                  true
                )}
              {activeTab === "route" && (
                <div className="pt-2 w-100">
                  {boardingPoints.length > 0 && droppingPoints.length > 0 ? (
                    <>
                      <h6
                        className="fw-bold mb-3 text-dark"
                        style={{ fontSize: "15px" }}
                      >
                        Full Route Journey
                      </h6>
                      <div className="p-3 border rounded mb-3 bg-light w-100">
                        <div className="d-flex align-items-start gap-3">
                          <div className="d-flex flex-column align-items-center mt-1 flex-shrink-0">
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                border: "3px solid #0D2B4C",
                                borderRadius: "50%",
                                backgroundColor: "#fff",
                              }}
                            ></div>
                            <div
                              style={{
                                height: "30px",
                                borderLeft: "2px dashed #CBD5E1",
                                margin: "4px 0",
                              }}
                            ></div>
                            <div
                              style={{
                                width: "10px",
                                height: "10px",
                                backgroundColor: "#e11d48",
                                borderRadius: "2px",
                                boxShadow:
                                  "0 2px 4px rgba(225, 29, 72, 0.3)",
                              }}
                            ></div>
                          </div>
                          <div
                            className="d-flex flex-column justify-content-between flex-grow-1"
                            style={{ minWidth: 0 }}
                          >
                            <div className="mb-3">
                              <div
                                className="fw-bold text-dark text-break"
                                style={{ fontSize: "14px" }}
                              >
                                {sourceCity}
                              </div>
                              <div
                                className="text-muted mt-1 text-break"
                                style={{ fontSize: "12px" }}
                              >
                                {cleanLocationName(firstBpName)}
                              </div>
                            </div>
                            <div>
                              <div
                                className="fw-bold text-dark text-break"
                                style={{ fontSize: "14px" }}
                              >
                                {destinationCity}
                              </div>
                              <div
                                className="text-muted mt-1 text-break"
                                style={{ fontSize: "12px" }}
                              >
                                {cleanLocationName(lastDpName)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      className="p-4 text-center text-muted mt-4 border rounded"
                      style={{ fontSize: "13px" }}
                    >
                      Route map details are currently unavailable for this
                      journey.
                    </div>
                  )}
                </div>
              )}
              {activeTab === "why" && (
                <div className="pt-2 w-100">
                  <h6
                    className="fw-bold mb-3 text-dark"
                    style={{ fontSize: "15px" }}
                  >
                    Why book this bus?
                  </h6>
                  <div className="bg-light rounded mb-4 p-3 border w-100">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <i
                        className="bi bi-shield-check text-success"
                        style={{ fontSize: "18px" }}
                      ></i>
                      <span
                        className="fw-bold text-dark"
                        style={{ fontSize: "14px" }}
                      >
                        Safe & Secure
                      </span>
                    </div>
                    <span
                      className="text-muted"
                      style={{ fontSize: "12px" }}
                    >
                      Highly rated for safety and punctuality.
                    </span>
                  </div>
                  <div className="accordions-container w-100">
                    {[
                      {
                        id: "amenities",
                        title: "5 amenities",
                        content:
                          "WIFI, Charging Point, Blankets, Water Bottle, Reading Light.",
                      },
                      {
                        id: "reviews",
                        title: "Ratings & reviews",
                        content:
                          "4.2/5 based on 1100 reviews. Passengers loved the punctuality.",
                      },
                      {
                        id: "cancellation",
                        title: "Cancellation policy",
                        content: `0 to 12 hrs before journey: 100% deduction.\n12 to 24 hrs before journey: 50% deduction.`,
                      },
                    ].map((item) => (
                      <div
                        key={`mobile-${item.id}`}
                        className="border-bottom w-100"
                      >
                        <div
                          className="d-flex justify-content-between align-items-center py-3"
                          onClick={() =>
                            toggleAccordion(`mobile-${item.id}`)
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <span
                            className="fw-semibold text-dark"
                            style={{ fontSize: "13px" }}
                          >
                            {item.title}
                          </span>
                          <i
                            className={`bi bi-chevron-${
                              expandedAccordion === `mobile-${item.id}`
                                ? "up"
                                : "down"
                            } text-muted`}
                          ></i>
                        </div>
                        {expandedAccordion === `mobile-${item.id}` && (
                          <div
                            className="pb-3 text-muted text-wrap"
                            style={{
                              fontSize: "12px",
                              whiteSpace: "pre-line",
                            }}
                          >
                            {item.content}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="desktop-all-open d-none d-xl-block pt-2 w-100">
              <div className="mb-4 pb-2 w-100">
                <h6
                  className="fw-bold mb-3 text-dark"
                  style={{ fontSize: "15px" }}
                >
                  Why book this bus?
                </h6>
                <div className="bg-light rounded mb-4 p-3 border w-100">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i
                      className="bi bi-shield-check text-success"
                      style={{ fontSize: "18px" }}
                    ></i>
                    <span
                      className="fw-bold text-dark"
                      style={{ fontSize: "14px" }}
                    >
                      Safe & Secure
                    </span>
                  </div>
                  <span className="text-muted" style={{ fontSize: "12px" }}>
                    Highly rated for safety and punctuality.
                  </span>
                </div>
                <div className="accordions-container w-100">
                  {[
                    {
                      id: "amenities",
                      title: "5 amenities",
                      content:
                        "WIFI, Charging Point, Blankets, Water Bottle, Reading Light.",
                    },
                    {
                      id: "reviews",
                      title: "Ratings & reviews",
                      content:
                        "4.2/5 based on 1100 reviews. Passengers loved the punctuality.",
                    },
                    {
                      id: "cancellation",
                      title: "Cancellation policy",
                      content: `0 to 12 hrs before journey: 100% deduction.\n12 to 24 hrs before journey: 50% deduction.`,
                    },
                  ].map((item) => (
                    <div
                      key={`desktop-${item.id}`}
                      className="py-3 border-bottom w-100"
                    >
                      <div
                        className="fw-bold text-dark"
                        style={{ fontSize: "13px" }}
                      >
                        {item.title}
                      </div>
                      <div
                        className="text-muted mt-1 text-wrap"
                        style={{ fontSize: "12px", whiteSpace: "pre-line" }}
                      >
                        {item.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4 pb-2 border-bottom w-100">
                <h6
                  className="fw-bold mb-3 text-dark"
                  style={{ fontSize: "15px" }}
                >
                  Bus route
                </h6>
                {boardingPoints.length > 0 && droppingPoints.length > 0 ? (
                  <div className="p-3 border rounded mb-2 bg-light w-100">
                    <div className="d-flex align-items-start gap-3">
                      <div className="d-flex flex-column align-items-center mt-1 flex-shrink-0">
                        <div
                          style={{
                            width: "12px",
                            height: "12px",
                            border: "3px solid #0D2B4C",
                            borderRadius: "50%",
                            backgroundColor: "#fff",
                          }}
                        ></div>
                        <div
                          style={{
                            height: "30px",
                            borderLeft: "2px dashed #CBD5E1",
                            margin: "4px 0",
                          }}
                        ></div>
                        <div
                          style={{
                            width: "10px",
                            height: "10px",
                            backgroundColor: "#e11d48",
                            borderRadius: "2px",
                            boxShadow: "0 2px 4px rgba(225, 29, 72, 0.3)",
                          }}
                        ></div>
                      </div>
                      <div
                        className="d-flex flex-column justify-content-between flex-grow-1"
                        style={{ minWidth: 0 }}
                      >
                        <div className="mb-3">
                          <div
                            className="fw-bold text-dark text-break"
                            style={{ fontSize: "14px" }}
                          >
                            {sourceCity}
                          </div>
                          <div
                            className="text-muted mt-1 text-break"
                            style={{ fontSize: "12px" }}
                          >
                            {cleanLocationName(firstBpName)}
                          </div>
                        </div>
                        <div>
                          <div
                            className="fw-bold text-dark text-break"
                            style={{ fontSize: "14px" }}
                          >
                            {destinationCity}
                          </div>
                          <div
                            className="text-muted mt-1 text-break"
                            style={{ fontSize: "12px" }}
                          >
                            {cleanLocationName(lastDpName)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-4 text-center text-muted mt-2 border rounded w-100"
                    style={{ fontSize: "13px" }}>
                    Route map details are currently unavailable for this
                    journey.
                  </div>
                )}
              </div>

              <div className="mb-4 pb-2 border-bottom w-100">
                {renderTimeline(
                  boardingPoints,
                  departureTime,
                  sourceCity,
                  "Boarding point",
                  false
                )}
              </div>

              <div className="mb-2 w-100">
                {renderTimeline(
                  droppingPoints,
                  arrivalTime,
                  destinationCity,
                  "Dropping point",
                  true
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}