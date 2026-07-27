import { BASE_URL } from "./api";
import { getCachedData, setCachedData, CACHE_TTL_SEAT_LAYOUT } from "./api.cache";

export const fetchSrsSeatLayout = async (tripId: string) => {
  try {
    const url = `${BASE_URL}/api/busBooking/getSrsSeatDetails/${tripId}`;
    const cached = getCachedData(url);
    if (cached) return cached;
    
    const res = await fetch(url);

    if (!res.ok) {
      console.error("SRS Seat API failed:", res.status, res.statusText);
      return null;
    }

    const contentType = res.headers.get("content-type");
    
    // Check if response is JSON
    if (!contentType || !contentType.includes("application/json")) {
      console.error("SRS API returned non-JSON response (likely HTML error page):", contentType);
      return null;
    }

    const result = await res.json();
    console.log("Full SRS Seat API Response:", result);

    // ✅ 3. ADD SAFE FALLBACK FOR SRS SEAT API
    const finalData = result?.data || result?.result || result;

    if (!finalData) {
      console.error("❌ Empty SRS Seat Response");
      return null;
    }

    setCachedData(url, finalData, CACHE_TTL_SEAT_LAYOUT);

    return finalData;

  } catch (error) {
    console.error("SRS Seat Error:", error);
    return null;
  }
};

export const fetchVrlSeatLayout = async (referenceNumber: string) => {
  try {
    const url = `${BASE_URL}/api/busBooking/sendVrlRequest/GetSeatArrangementDetailsV3`;

    const cleanedRef = decodeURIComponent(referenceNumber).replace(/\+/g, ' ').trim();
    
    const cacheKey = `vrl_seat_${cleanedRef}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    console.log("FINAL VRL REF:", cleanedRef);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceNumber: cleanedRef }), 
    });

    if (!res.ok) {
      console.error("VRL Seat API failed:", res.status);
      return null;
    }

    const result = await res.json();
    console.log("Full VRL Seat API Response:", result);
    
    setCachedData(cacheKey, result, CACHE_TTL_SEAT_LAYOUT);
    // ✅ Returns the FULL object so pick/drop points can be extracted!
    return result; 

  } catch (error) {
    console.error("VRL Seat Error:", error);
    return null;
  }
};

const tryDecodeBase64Utf8 = (value: string): string | null => {
  try {
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      return window.atob(value);
    }

    const nodeBuffer = (globalThis as any).Buffer;
    if (nodeBuffer && typeof nodeBuffer.from === "function") {
      return nodeBuffer.from(value, "base64").toString("utf8");
    }

    return null;
  } catch {
    return null;
  }
};

const normalizeEzeeSeatPayload = (payload: any) => {
  if (!payload || typeof payload !== "string") return payload;

  let raw = String(payload).trim();

  if (raw.startsWith("BMAP")) {
    raw = raw.slice(4);
  }

  if (raw.endsWith("null")) {
    raw = raw.slice(0, -4);
  }

  if (!raw) return null;

  const decoded = tryDecodeBase64Utf8(raw);
  if (decoded) {
    const trimmed = decoded.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return decoded;
      }
    }

    return decoded;
  }

  return payload;
};

export const fetchEzeeSeatLayout = async (
  tripCode: string,
  sourceStationCode: string,
  destStationCode: string,
  date: string
) => {
  try {
    const cleanDate = String(date || "").includes("T") ? String(date).split("T")[0] : date;

    // 🛡️ SHIELD: Protect against missing params
    if (!sourceStationCode || !destStationCode || !tripCode || sourceStationCode === "undefined" || destStationCode === "undefined") {
      console.warn("[Ezee Seat Shield] Missing parameters for Ezee seat layout. Aborting fetch.");
      return null;
    }

    // 🔥 Hits the Test URL directly
    const url = `${BASE_URL}/api/bus/ezee/busMap/${encodeURIComponent(tripCode)}/${encodeURIComponent(sourceStationCode)}/${encodeURIComponent(destStationCode)}/${encodeURIComponent(cleanDate)}`;
    
    const cached = getCachedData(url);
    if (cached) return cached;
    
    console.log("Calling Ezee Seat API:", url);

    const res = await fetch(url);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "No error text available");
      console.error(`[Ezee Seat Shield] API failed with status ${res.status} | URL: ${url} | Msg: ${errorText}`);
      return null;
    }

    const result = await res.json();
    console.log("EZEE RAW RESPONSE:", result);
    console.log("TYPE OF data:", typeof result?.data);
    console.log("DATA VALUE:", result?.data);

    if (typeof result?.data === "string") {
      const normalized = normalizeEzeeSeatPayload(result.data);
      console.log("EZEE normalized seat payload:", normalized);
      let finalResult = result;
      if (typeof normalized === "object") {
        finalResult = { ...result, data: normalized };
      } else {
        finalResult = { ...result, rawDataString: result.data, data: normalized };
      }
      setCachedData(url, finalResult, CACHE_TTL_SEAT_LAYOUT);
      return finalResult;
    }

    setCachedData(url, result, CACHE_TTL_SEAT_LAYOUT);
    return result;
  } catch (error) {
    console.error("[Ezee Seat Error] Fetch failed, UI is shielded:", error);
    return null;
  }
};

export const blockSrsSeat = async (tripId: string, payload: any) => {
  try {
    if (!payload?.origin_id || !payload?.destination_id || !payload?.boarding_at || !payload?.drop_of) {
      console.error("❌ INVALID BLOCK PAYLOAD:", payload);
      return { error: "Missing required fields" };
    }
    if (String(payload.boarding_at).includes(":") || String(payload.drop_of).includes(":")) {
      console.error("❌ INVALID ID (TIME SENT INSTEAD OF ID):", payload);
      return { error: "Invalid boarding/drop ID" };
    }
    console.log("🚀 FINAL BLOCK REQUEST:", payload);
    const res = await fetch(`${BASE_URL}/api/busBooking/getSrsBlockSeat/${tripId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      console.error("❌ SRS BLOCK FAILED:", res.status);
    }
    const text = await res.text();
    console.log("SRS BLOCK STATUS:", res.status);
    console.log("SRS BLOCK RAW RESPONSE:", text);
    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }
  } catch (error) {
    console.error("SRS Block Seat Error:", error);
    return null;
  }
};

export const blockVrlSeat = async (payload: any) => {
  try {
    const res = await fetch(`${BASE_URL}/api/busBooking/sendVrlRequest/BlockSeatV2`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    return await res.json();
  } catch (error) {
    console.error("VRL Block Seat Error:", error);
    return null;
  }
};

export const blockEzeeSeat = async (payload: any) => {
  try {
    const res = await fetch(`${BASE_URL}/api/bus/ezee/blockSeat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    return await res.json();
  } catch (error) {
    console.error("Ezee Block Seat Error:", error);
    return null;
  }
};