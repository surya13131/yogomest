import { cityMapping } from "./cityMapping";
import { BASE_URL } from "./api";
import { getCachedData, setCachedData, CACHE_TTL_BUS_LIST } from "./api.cache";
import { getMinimumAvailableFare, extractValidPrice } from "./api.utils";

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

export const fetchVrlBusesV2 = async (
  sourceName: string,
  destName: string,
  date: string
): Promise<NormalizedBus[]> => {
  console.log("========== VRL V2 ==========");
  console.log(sourceName, destName, date);

  const capitalize = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

  const searchSource = sourceName.toLowerCase();
  const searchDest = destName.toLowerCase();

  // VRL seems to prefer capitalized names. We'll try the apiName from mapping first, then capitalize.
  const sourceAliases = ((cityMapping as any)[searchSource])?.apiName ? [((cityMapping as any)[searchSource]).apiName] : [capitalize(sourceName)];
  const destAliases = ((cityMapping as any)[searchDest])?.apiName ? [((cityMapping as any)[searchDest]).apiName] : [capitalize(destName)];

  try {
    for (const from of sourceAliases) {
      for (const to of destAliases) {
        // Use capitalized names for VRL V2 as it seems to prefer them, based on 404 errors.
        const url = `${BASE_URL}/api/busBooking/getVrlBusDetailsV2/${capitalize(from)}/${capitalize(to)}/${date}`;
        console.log("Calling VRL V2 URL:", url);

        const res = await fetch(url);
        console.log("VRL V2 Status:", res.status);

        if (res.ok) {
          const result = await res.json();
          console.log("VRL V2 Response:", result);
          const data = Array.isArray(result) ? result : (result.data || result.result || result.buses || []);

          if (data.length > 0) {
            return data.map((bus: any): NormalizedBus | null => {
              const referenceNumber = bus.ReferenceNumber || bus.referenceNumber || bus.RefNo || null;
              if (!referenceNumber || referenceNumber === "0" || referenceNumber === 0) return null;
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
                originalData: { ...bus, referenceNumber: finalRef },
              };
            }).filter(Boolean) as NormalizedBus[];
          }
        }
      }
    }
  } catch (error) {
    console.warn("VRL V2 failed", error);
  }

  return [];
};

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

export const fetchSrsBusesV2 = async (
  sourceName: string,
  destName: string,
  date: string,
  sourceId: string,
  destId: string
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
    console.log("========== SRS V2 ==========");
    console.log(sourceName, destName, date);

    const searchSource = sourceName.toLowerCase();
    const searchDest = destName.toLowerCase();

    const fromLocation = ((cityMapping as any)[searchSource])?.apiName ?? sourceName;

    const toLocation = ((cityMapping as any)[searchDest])?.apiName ?? destName;

        const url =
          `${BASE_URL}/api/busBooking/getSrsSchedulesV2/` +
          `${searchSource}/` +
          `${searchDest}/` +
          `${date}/` +
          `${fromLocation}/` +
          `${toLocation}`;
        console.log("Calling SRS V2 URL:", url);

        const res = await fetch(url);
        console.log("SRS V2 Status:", res.status);

        if (res.ok) {
          const result = await res.json();
          console.log("SRS V2 Response:", result);
          const data = Array.isArray(result) ? result : (result.data || result.result || result.schedules || result.buses || []);

          if (data.length > 0) {
            return mapData(data);
          }
        }

    // If loop completes with no results
    return [];

  } catch (err) {
    console.warn("SRS API V2 failed", err);
    return [];
  }
};

export const fetchEzeeBusesV2 = async (
  sourceName: string,
  destName: string,
  journeyDate: string
): Promise<NormalizedBus[]> => {
  console.log("========== EZEE V2 ==========");
  console.log(sourceName, destName, journeyDate);

  const searchSource = sourceName.toLowerCase();
  const searchDest = destName.toLowerCase();

  const fromLocation = ((cityMapping as any)[searchSource])?.apiName ?? sourceName;

  const toLocation = ((cityMapping as any)[searchDest])?.apiName ?? destName;

  try {
        const url = `${BASE_URL}/api/bus/ezee/busList-v2/${encodeURIComponent(
          searchSource
        )}/${encodeURIComponent(destName)}/${encodeURIComponent(
          journeyDate
        )}/${encodeURIComponent(fromLocation)}/${encodeURIComponent(toLocation)}`;

        console.log("Calling Ezee V2 URL:", url);

        const res = await fetch(url);
        console.log("Ezee V2 Status:", res.status);

        if (res.ok) {
          const result = await res.json();
          console.log("Ezee V2 Response:", result);
          const rawData = result?.data?.buses || result?.buses || result?.data || result?.result || result;
          const busArray = Array.isArray(rawData) ? rawData : [];

          if (busArray.length > 0) {
            return busArray.map((bus: any): NormalizedBus => {
              const seatLayoutList = bus.seatLayoutList || bus.bus?.seatLayoutList || [];
              const calculatedAvailableSeats = seatLayoutList.filter((seat: any) => seat?.seatStatus?.code === "AL").length;
              const availableSeaterCount = seatLayoutList.filter((seat: any) => seat.seatStatus?.code === "AL" && seat.busSeatType?.code === "SS").length;
              const availableSleeperCount = seatLayoutList.filter((seat: any) => seat.seatStatus?.code === "AL" && ["SL", "USL", "LSL", "WSL", "SUSL", "SLSL"].includes(seat.busSeatType?.code)).length;
              const departureTime = bus?.fromStation?.dateTime?.split(" ")[1]?.substring(0, 5) || bus.departureTime || bus.deptTime || bus.DepartureTime || "--:--";
              const arrivalTime = bus?.toStation?.dateTime?.split(" ")[1]?.substring(0, 5) || bus.arrivalTime || bus.arrTime || bus.ArrivalTime || "--:--";

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
          }
        }
  } catch (error) {
    console.error("[Ezee V2 Error] Fetch failed, UI is shielded:", error);
  }
  return [];
};

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
      console.log("fareList", bus.fareList);
      console.log("price", getMinimumAvailableFare(bus));
      console.log("fallback", extractValidPrice(bus));


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