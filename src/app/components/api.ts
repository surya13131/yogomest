import { cityMapping } from "./cityMapping";

export const BASE_URL = "";
const CACHE_TTL_BUS_LIST = 3 * 60 * 1000; // 3 minutes
const CACHE_TTL_SEAT_LAYOUT = 2 * 60 * 1000; // 2 minutes
const CACHE_TTL_CITY = 10 * 60 * 1000; // 10 minutes

const memoryCache = new Map<string, { data: string; expiry: number }>();

const getCachedData = (key: string) => {
  const cached = memoryCache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return JSON.parse(cached.data);
  }
  return null;
};

const setCachedData = (key: string, data: any, ttl: number) => {
  memoryCache.set(key, { data: JSON.stringify(data), expiry: Date.now() + ttl });
};

const extractValidPrice = (bus: any): number => {
  const possiblePrices = [
    bus.LowestFare, bus.lowestFare, bus.lowest_fare, bus.minFare, bus.min_fare,
    bus.TotalFare, bus.totalFare, bus.total_fare,
    bus.price, bus.Price,
    bus.fare, bus.Fare, bus.Fares, bus.fares,
    bus.routePrice, bus.rate,
    bus.AcSleeperRate, bus.AcSeatRate, bus.GeneralRate
  ];

  for (const p of possiblePrices) {
    if (p !== undefined && p !== null && p !== "") {
      let val = 0;
      if (typeof p === 'number') val = p;
      else if (typeof p === 'string') {
        const match = p.match(/[\d.]+/); // Safely extracts numbers from strings like "INR 700"
        if (match) val = parseFloat(match[0]); // ✅ FIXED: match[0] used here
      }
      if (val > 0) return val; 
    }
  }

  // SRS specific string fallback
  if (bus.fare_str) {
    const match = bus.fare_str.match(/(\d+)/);
    if (match) return parseInt(match[0]); // ✅ FIXED: match[0] used here
  }

  return 0;
};

export const getMinimumAvailableFare = (raw: any): number => {
  const fares: number[] = [];

  // SRS
  const available = raw?.bus_layout?.available;
  if (typeof available === "string") {
    available.split(",").forEach((item: string) => {
      const fare = Number(item.split("|")[1]);
      if (!isNaN(fare) && fare > 0) fares.push(fare);
    });
  }

  // EZEE
  const seatLayoutList =
    raw?.seatLayoutList ||
    raw?.bus?.seatLayoutList ||
    raw?.data?.seatLayoutList ||
    raw?.data?.bus?.seatLayoutList;

  if (Array.isArray(seatLayoutList)) {
    seatLayoutList.forEach((seat: any) => {
      const available =
        seat.seatStatus?.code === "AL" ||
        seat.available === true ||
        seat.isAvailable === true;

      const fare = Number(
        seat.fare ??
        seat.seatFare ??
        seat.price
      );

      if (available && !isNaN(fare) && fare > 0) {
        fares.push(fare);
      }
    });
  }

  // VRL
  const seatDetails =
    raw?.SeatDetails ||
    raw?.seatDetails ||
    raw?.Seats ||
    raw?.seats;

  if (Array.isArray(seatDetails)) {
    seatDetails.forEach((seat: any) => {
      const available =
        seat.IsAvailable === true ||
        seat.isAvailable === true ||
        seat.Status === "Available";

      const fare = Number(seat.Fare ?? seat.fare ?? seat.Price);
      if (available && !isNaN(fare) && fare > 0) {
        fares.push(fare);
      }
    });
  }

  return fares.length > 0 ? Math.min(...fares) : 0;
};

export const requestLoginOtp = async (mobileNumber: string) => {
  const res = await fetch(`${BASE_URL}/api/user/signin?mobile=${mobileNumber}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobileNumber }),
  });

  return res.json();
};

export const requestSignupOtp = async (formData: any) => {
  const res = await fetch(`${BASE_URL}/api/user/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

  return res.json();
};

export const verifyOtp = async (
  mobileNumber: string,
  otp: string,
  mode: "login" | "signup"
) => {
  const endpoint =
    mode === "login"
      ? "/api/user/verify_login_otp"
      : "/api/user/verify_signup_otp";

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobileNumber, otp }),
  });

  return res.json();
};

export const googleSignInApi = async (email: string, name: string) => {
  const res = await fetch(`${BASE_URL}/api/user/googleSignIn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name }),
  });

  return res.json();
};

/* ---------------- CITY SEARCH ---------------- */

export interface CitySuggestion {
  name: string;
  state: string;
  id: string;
  _id: string;
  vrlCityId?: string;
  srsCityId?: string;
  ezeeStationCode?: string;
}

export const fetchCitySuggestions = async (
  query: string
): Promise<CitySuggestion[]> => {
  if (query.length < 2) return [];

  try {
    const normalizedQuery = query.toLowerCase().trim();

    // Mapping fallback logic
    const mappedNames =
      (cityMapping as any)[normalizedQuery]?.sourceCity || [];

    // Ensures we only send a string, not an array
    const searchQuery =
      mappedNames.length > 0 ? mappedNames[0] : query;
      
    const cacheKey = `city_${searchQuery}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const res = await fetch(
      `${BASE_URL}/api/busBooking/searchCity/${searchQuery}`
    );

    const result = await res.json();

    if (result.status !== 200) return [];

    const mappedData = (result.data || [])
      .filter((city: any) => city.id)
      .map((city: any) => {
        // ✅ FIX: Safely handles Arrays, Nulls, and Strings for Ezee Code
        let finalEzeeCode = "";

        // 🔥 Try ALL possible backend keys
        const rawEzeeData = 
          city.ezeeCityId ||        
          city.ezeeStationCode ||
          city.ezee_code ||
          city.ezeeCode ||
          city.stationCode ||
          city.station_code ||
          city.stationId ||
          city.station_id ||
          city.code ||
          "";

        if (Array.isArray(rawEzeeData)) {
          finalEzeeCode = (rawEzeeData || "").toString();
        } else {
          finalEzeeCode = rawEzeeData.toString();
        }

        console.log("CITY RAW:", city.name);
        console.log("VRL/SRS ID:", city.id);
        console.log("EZEE Code (Final):", finalEzeeCode);
        console.log("-----------------------------------");

        return {
          name: city.name || "Unknown City",
          state: city.state || "India",
          id: city.id.toString(),
          _id: city._id || `api-${city.id}`,
          vrlCityId: (city.vrlCityId || city.id || "").toString(),
          srsCityId: (city.srsCityId || city.id || "").toString(),
          ezeeStationCode: finalEzeeCode, // ✅ Fully clean string mapped here
        };
      });
      
    setCachedData(cacheKey, mappedData, CACHE_TTL_CITY);
    return mappedData;
  } catch (err) {
    console.error("City search failed", err);
    return [];
  }
};

/* ---------------- BUS MODEL ---------------- */

export interface NormalizedBus {
  id: string;
  operatorName: string;
  busType: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  availableSeats: number;
  availableSeaterCount?: number;
  availableSleeperCount?: number;
  rating: string;
  apiProvider: "VRL" | "SRS" | "EZEE_V2" | "EZEE_V3"; 
  originalData: any;
}

/* ---------------- VRL BUS LIST ---------------- */

export const fetchVrlBuses = async (
  sourceName: string,
  destName: string,
  sourceId: string,
  destId: string,
  date: string
): Promise<NormalizedBus[]> => {

  const capitalize = (str: string) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  try {
    const payload = {
      vrlSourceCityName: capitalize(sourceName),
      vrlDestinationCityName: capitalize(destName),
      doj: date,
      vrlSourceCityId: sourceId,
      vrlDestinationCityId: destId,
    };

    console.log("VRL Final Payload:", payload);

    const cacheKey = `vrl_${payload.vrlSourceCityId}_${payload.vrlDestinationCityId}_${payload.doj}`;
    const cached = getCachedData(cacheKey);
    let result = cached;
    
    if (!result) {
    const res = await fetch(`${BASE_URL}/api/busBooking/getVrlBusDetailsV3`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

      result = await res.json();
      setCachedData(cacheKey, result, CACHE_TTL_BUS_LIST);
    }
    console.log("VRL Final Raw Response:", result);

    // ✅ Robust Array extraction
    const data = Array.isArray(result) ? result : (result.data || result.result || result.buses || []);
    
    // ✅ EXACT FIX APPLIED HERE
    const mappedBuses = data.map((bus: any): NormalizedBus | null => { 
      
      const referenceNumber =
        bus.ReferenceNumber ||
        bus.referenceNumber ||
        bus.RefNo ||
        null;

      // 🛑 BLOCK INVALID BUSES
      if (!referenceNumber || referenceNumber === "0" || referenceNumber === 0) {
        console.warn("❌ Invalid VRL bus skipped:", bus);
        return null;
      }
      const finalRef = String(referenceNumber);

      return {
        id: finalRef,
        operatorName: bus.CompanyName?.trim() || bus.companyName || "VRL Travels",
        busType: bus.BusTypeName?.trim() || bus.busType || "AC Sleeper (2+1)",
        departureTime: bus.RouteTime || bus.DeptTime || bus.departureTime || "--:--",
        arrivalTime: bus.ApproxArrival || bus.ArrivalTime || bus.arrivalTime || "--:--",
        duration: bus.TravelTime || bus.Duration || bus.duration || "--",
        price: getMinimumAvailableFare(bus) || extractValidPrice(bus),
        availableSeats: bus.EmptySeats || bus.AvailableSeats || bus.availableSeats || 0,
        rating: "4.5",
        apiProvider: "VRL",
        originalData: {
          ...bus,
          referenceNumber: finalRef // ✅ Always guarantees a valid string for Seat Layout fetch
        },
      };
    });

    // ✅ Filter removes any `null` values returned by invalid ghost buses
    return mappedBuses.filter(Boolean) as NormalizedBus[];

  } catch (error) {
    console.warn("VRL V3 failed", error);
  }

  return [];
};

/* ---------------- SRS BUS LIST ---------------- */

export const fetchSrsBuses = async (
  sourceName: string,
  destName: string,
  sourceId: string,
  destId: string,
  date: string
): Promise<NormalizedBus[]> => {
  const getSrsMinAvailableFare = (bus: any): number => {
    const available = bus?.bus_layout?.available ?? "";

    const fares = available
      .split(",")
      .map((item: string) => Number(item.split("|")[1]))
      .filter((v: number) => !isNaN(v) && v > 0);

    return fares.length ? Math.min(...fares) : 0;
  };

  const mapData = (data: any[]): NormalizedBus[] =>
    data.map((bus: any): NormalizedBus => { 
      const srsMinFare = getSrsMinAvailableFare(bus);
      return {
        id: bus.id?.toString() || Math.random().toString(),
        operatorName: bus.operator_service_name?.trim() || bus.operatorName || "SRS Travels",
        busType: bus.bus_type?.trim() || bus.busType || "Standard AC",
        departureTime: bus.dep_time || bus.departureTime || "--:--",
        arrivalTime: bus.arr_time || bus.arrivalTime || "--:--",
        duration: bus.duration || "--",
        price: srsMinFare > 0 ? srsMinFare : extractValidPrice(bus),
        availableSeats: bus.available_seats || bus.availableSeats || 0,
        rating: "4.6",
        apiProvider: "SRS", 
        originalData: bus,
      };
    });

  try {
    const url = `${BASE_URL}/api/busBooking/getSrsSchedulesV3/${sourceName}/${destName}/${date}/${sourceId}/${destId}`;
    const cached = getCachedData(url);
    let result = cached;
    
    if (!result) {
      const res = await fetch(url);
      result = await res.json();
      setCachedData(url, result, CACHE_TTL_BUS_LIST);
    }

    // ✅ FIX: Robust array extraction so SRS never misses data
    const data = Array.isArray(result) ? result : (result.data || result.result || result.schedules || result.buses || []);
    return mapData(data);

  } catch (err) {
    console.warn("SRS API failed", err);
    return [];
  }
};

/* ---------------- SEAT LAYOUT ---------------- */

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

/* ---------------- FILTERS (Boarding/Dropping) ---------------- */

export const fetchBusFilters = async (
  provider: "VRL" | "SRS",
  params: {
    sourceName: string;
    destName: string;
    date: string;
    sourceId: string;
    destId: string;
  }
) => {
  const cacheKey = `filters_${provider}_${params.sourceId}_${params.destId}_${params.date}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    if (provider === "SRS") {
      const res = await fetch(
        `${BASE_URL}/api/busBooking/getSrsFiltersV3?sourceCity=${params.sourceName}&destinationCity=${params.destName}&doj=${params.date}&srsSourceCityId=${params.sourceId}&srsDestinationCityId=${params.destId}`
      );
      
      const result = await res.json(); 
      setCachedData(cacheKey, result, CACHE_TTL_BUS_LIST);
      return result;

    } else {
      const res = await fetch(`${BASE_URL}/api/busBooking/getVrlFiltersV3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vrlSourceCityName: params.sourceName,
          vrlDestinationCityName: params.destName,
          doj: params.date,
          vrlSourceCityId: params.sourceId,
          vrlDestinationCityId: params.destId,
        }),
      });
      const result = await res.json();
      setCachedData(cacheKey, result, CACHE_TTL_BUS_LIST);
      return result;
    }
  } catch (error) {
    console.error(`${provider} Filter Error:`, error);
    return null;
  }
};

/* ---------------- BLOCK SEAT & BOOKING ---------------- */

export const blockSrsSeat = async (tripId: string, payload: any) => {
  try {
    // ✅ 2. ADD PAYLOAD VALIDATION (PREVENT 500)
    if (
      !payload?.origin_id ||
      !payload?.destination_id ||
      !payload?.boarding_at ||
      !payload?.drop_of
    ) {
      console.error("❌ INVALID BLOCK PAYLOAD:", payload);
      return { error: "Missing required fields" };
    }

    // 🚨 CRITICAL FIX (your bug)
    if (
      String(payload.boarding_at).includes(":") ||
      String(payload.drop_of).includes(":")
    ) {
      console.error("❌ INVALID ID (TIME SENT INSTEAD OF ID):", payload);
      return { error: "Invalid boarding/drop ID" };
    }

    // ✅ 4. ADD DEBUG FOR BLOCK CALL (VERY HELPFUL)
    console.log("🚀 FINAL BLOCK REQUEST:", payload);

    const res = await fetch(
      `${BASE_URL}/api/busBooking/getSrsBlockSeat/${tripId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    // ✅ 5. FAIL FAST ON 500
    if (!res.ok) {
      console.error("❌ SRS BLOCK FAILED:", res.status);
    }

    // ✅ 1. ADD RESPONSE DEBUG (VERY IMPORTANT)
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
    const res = await fetch(
      `${BASE_URL}/api/busBooking/sendVrlRequest/BlockSeatV2`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    return await res.json();
  } catch (error) {
    console.error("VRL Block Seat Error:", error);
    return null;
  }
};

export const bookBusTicket = async (payload: any) => {
  try {
    const res = await fetch(`${BASE_URL}/api/busBooking/bookBus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error) {
    console.error("Book Bus Error:", error);
    return null;
  }
};

/* ---------------- EZEE NEW APIs (Using EZEE_BASE_URL) ---------------- */

// ✅ EZEE V2 BUS LIST API
export const fetchEzeeBusesV2 = async (
  sourceName: string,
  destName: string,
  journeyDate: string
): Promise<NormalizedBus[]> => {
  try {

    const url = `${BASE_URL}/api/bus/ezee/busList-v2/${encodeURIComponent(
      sourceName
    )}/${encodeURIComponent(destName)}/${encodeURIComponent(
      journeyDate
    )}/${encodeURIComponent(sourceName)}/${encodeURIComponent(destName)}`;
    console.log("Fetching Ezee V2 API:", url);

    const cached = getCachedData(url);
    let data = cached;
    
    if (!data) {
      const res = await fetch(url);
    
    if (!res.ok) {
      console.warn(`[Ezee V2 Shield] API returned ${res.status}. UI is protected.`);
      return [];
    }
      data = await res.json();
      setCachedData(url, data, CACHE_TTL_BUS_LIST);
    }
    
    // ✅ FIX: Robust array extraction
    const rawData = data?.data?.buses || data?.buses || data?.data || data?.result || data;
    const busArray = Array.isArray(rawData) ? rawData : [];
    
    return busArray.map((bus: any): NormalizedBus => {
      const seatLayoutList = bus.seatLayoutList || bus.bus?.seatLayoutList || [];
      
      const calculatedAvailableSeats = seatLayoutList.filter(
        (seat: any) => seat?.seatStatus?.code === "AL"
      ).length;

      const availableSeaterCount = seatLayoutList.filter(
        (seat: any) =>
          seat.seatStatus?.code === "AL" &&
          seat.busSeatType?.code === "SS"
      ).length;

      const availableSleeperCount = seatLayoutList.filter(
        (seat: any) =>
          seat.seatStatus?.code === "AL" &&
          ["SL", "USL", "LSL", "WSL", "SUSL", "SLSL"].includes(seat.busSeatType?.code)
      ).length;

      console.log("EZEE Available Seats", calculatedAvailableSeats);

      const departureTime =
        bus?.fromStation?.dateTime?.split(" ")[1]?.substring(0, 5) ||
        bus.departureTime || bus.deptTime || bus.DepartureTime ||
        "--:--";

      const arrivalTime =
        bus?.toStation?.dateTime?.split(" ")[1]?.substring(0, 5) ||
        bus.arrivalTime || bus.arrTime || bus.ArrivalTime ||
        "--:--";

      return {
        id: bus.tripCode || bus.TripCode || bus.id || Math.random().toString(),
        apiProvider: "EZEE_V2",
        operatorName: bus?.operator?.name || bus.operatorName || bus.travels || bus.TravelsName || "Ezee Travels",
        busType: bus?.bus?.displayName || bus?.bus?.busType || bus.busType || bus.BusType || "A/C Sleeper",
        departureTime,
        arrivalTime,
        duration: bus.duration || "---",
        price: getMinimumAvailableFare(bus) || extractValidPrice(bus),
        availableSeats: calculatedAvailableSeats > 0 ? calculatedAvailableSeats : parseInt(bus.availableSeats || bus.seatsAvailable || bus.AvailableSeats || "0", 10),
        availableSeaterCount: availableSeaterCount > 0 ? availableSeaterCount : undefined,
        availableSleeperCount: availableSleeperCount > 0 ? availableSleeperCount : undefined,
        rating: bus.rating || "4.5",
        originalData: bus 
      };
    });
  } catch (error) {
    console.error("[Ezee V2 Error] Fetch failed, UI is shielded:", error);
    return [];
  }
};

// ✅ EZEE V3 BUS LIST API
export const fetchEzeeBusesV3 = async (
  sourceName: string,
  destName: string,
  journeyDate: string,
  sourceCode?: string,
  destCode?: string
): Promise<NormalizedBus[]> => {
  try {
    // 🛡️ SHIELD: If station codes are totally missing, don't even try to hit the API with undefined values
    if (!sourceCode || !destCode) {
      console.warn(`[Ezee V3 Shield] Missing Ezee Station Codes for ${sourceName} -> ${destName}. Skipping Ezee API call to prevent errors.`);
      return [];
    }

    // 🔥 Hits the Test URL directly so it works alongside the Production VRL/SRS
    const url = `${BASE_URL}/api/bus/ezee/busList-v3/${encodeURIComponent(
      sourceName
    )}/${encodeURIComponent(destName)}/${encodeURIComponent(
      journeyDate
    )}/${encodeURIComponent(sourceCode)}/${encodeURIComponent(destCode)}`;
    console.log("Fetching Ezee V3 API:", url);

    const cached = getCachedData(url);
    let data = cached;
    
    if (!data) {
      const res = await fetch(url);
    
    if (!res.ok) {
      console.warn(`[Ezee V3 Shield] API returned HTTP ${res.status}. UI is protected.`);
      return [];
    }
      data = await res.json();
      setCachedData(url, data, CACHE_TTL_BUS_LIST);
    }
    
    // ✅ FIX: Robust array extraction
    const rawData = data?.data?.buses || data?.buses || data?.data || data?.result || data;
    const busArray = Array.isArray(rawData) ? rawData : [];
    
    return busArray.map((bus: any): NormalizedBus => {
      const seatLayoutList = bus.seatLayoutList || bus.bus?.seatLayoutList || [];
      
      const calculatedAvailableSeats = seatLayoutList.filter(
        (seat: any) => seat?.seatStatus?.code === "AL"
      ).length;

      const availableSeaterCount = seatLayoutList.filter(
        (seat: any) =>
          seat.seatStatus?.code === "AL" &&
          seat.busSeatType?.code === "SS"
      ).length;

      const availableSleeperCount = seatLayoutList.filter(
        (seat: any) =>
          seat.seatStatus?.code === "AL" &&
          ["SL", "USL", "LSL", "WSL", "SUSL", "SLSL"].includes(seat.busSeatType?.code)
      ).length;

      console.log("EZEE Available Seats", calculatedAvailableSeats);

      const departureTime =
        bus?.fromStation?.dateTime?.split(" ")[1]?.substring(0, 5) ||
        bus.departureTime || bus.deptTime ||
        "--:--";

      const arrivalTime =
        bus?.toStation?.dateTime?.split(" ")[1]?.substring(0, 5) ||
        bus.arrivalTime || bus.arrTime ||
        "--:--";

      return {
        id: bus.tripCode || bus.id || bus.scheduleId || Math.random().toString(),
        apiProvider: "EZEE_V3",
        operatorName: bus?.operator?.name || bus.operatorName || bus.travels || "Ezee Travels",
        busType: bus?.bus?.displayName || bus?.bus?.busType || bus.busType || "A/C Sleeper",
        departureTime,
        arrivalTime,
        duration: bus.duration || "---",
        price: getMinimumAvailableFare(bus) || extractValidPrice(bus),
        availableSeats: calculatedAvailableSeats > 0 ? calculatedAvailableSeats : parseInt(bus.availableSeats || bus.seatsAvailable || "0", 10),
        availableSeaterCount: availableSeaterCount > 0 ? availableSeaterCount : undefined,
        availableSleeperCount: availableSleeperCount > 0 ? availableSleeperCount : undefined,
        rating: bus.rating || "4.5",
        originalData: bus
      };
    });
  } catch (error) {
    console.error("[Ezee V3 Error] Fetch failed, UI is shielded:", error);
    return [];
  }
};

// ✅ EZEE BUS SEAT MAP API
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
    const url = `${BASE_URL}/api/bus/ezee/busMap/${encodeURIComponent(
      tripCode
    )}/${encodeURIComponent(sourceStationCode)}/${encodeURIComponent(
      destStationCode
    )}/${encodeURIComponent(cleanDate)}`;
    
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

    // 🛑 THE CRITICAL FIX: Return the raw object directly!
    // Your `seat.ts` file now has a "Deep Hunt" function that will look inside this object
    // to find data.bus.seats or data.bus.seatLayout safely.
    setCachedData(url, result, CACHE_TTL_SEAT_LAYOUT);
    return result;
  } catch (error) {
    console.error("[Ezee Seat Error] Fetch failed, UI is shielded:", error);
    return null;
  }
};

// ✅ EZEE BLOCK SEAT API
export const blockEzeeSeat = async (payload: any) => {
  try {
    // 🔥 Hits the Test URL directly
    const res = await fetch(`${BASE_URL}/api/bus/ezee/blockSeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error) {
    console.error("Ezee Block Seat Error:", error);
    return null;
  }
};

// ✅ EZEE CANCEL SEAT DETAILS API
export const canCancelEzeeSeat = async (bookingId: string) => {
  try {
    const res = await fetch(`${BASE_URL}/api/bus/ezee/canCancelSeat/${bookingId}`);
    
    if (!res.ok) {
      console.error(`[Ezee Cancel Shield] Can Cancel API failed with status ${res.status}`);
      return null;
    }
    
    return await res.json();
  } catch (error) {
    console.error("Ezee Can Cancel Error:", error);
    return null;
  }
};

// ✅ EZEE CONFIRM CANCEL API
export const confirmCancelEzeeSeat = async (payload: { bookingId: string, cca: string | number, ctpc: string }) => {
  try {
    const res = await fetch(`${BASE_URL}/api/bus/ezee/confirmCancelSeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      console.error(`[Ezee Cancel Shield] Confirm Cancel API failed with status ${res.status}`);
      return null;
    }
    
    return await res.json();
  } catch (error) {
    console.error("Ezee Confirm Cancel Error:", error);
    return null;
  }
};