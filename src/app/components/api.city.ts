import { cityMapping } from "./cityMapping";
import { BASE_URL } from "./api";
import { getCachedData, setCachedData, CACHE_TTL_CITY, CACHE_TTL_BUS_LIST } from "./api.cache";

export interface CitySuggestion {
  name: string;
  state: string;
  id: string;
  _id: string;
  vrlCityId?: string;
  srsCityId?: string;
  ezeeStationCode?: string;

  // Properties for "Recent Search" functionality
  isRecent?: boolean;
  destination?: CitySuggestion;
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
    
    // Try all aliases until one returns data
    const searchNames = mappedNames.length > 0 ? mappedNames : [query];

    let result: any = { status: 404, data: [] };
    let finalSearchQuery = "";

    for (const name of searchNames) {
      const cacheKey = `city_${name.toLowerCase()}`;
      const cached = getCachedData(cacheKey);
      if (cached) {
        result = cached;
        finalSearchQuery = name;
        break;
      }

      const res = await fetch(`${BASE_URL}/api/busBooking/searchCity/${encodeURIComponent(name)}`);
      result = await res.json();
      if (result.status === 200 && result.data?.length) {
        finalSearchQuery = name;
        setCachedData(cacheKey, result, CACHE_TTL_CITY);
        break;
      }
    }
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
          finalEzeeCode = rawEzeeData.length > 0 ? String(rawEzeeData[0]) : "";
        } else {
          finalEzeeCode = String(rawEzeeData || "");
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

    return mappedData;
  } catch (err) {
    console.error("City search failed", err);
    return [];
  }
};

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
      const res = await fetch(`${BASE_URL}/api/busBooking/getSrsFiltersV3?sourceCity=${params.sourceName}&destinationCity=${params.destName}&doj=${params.date}&srsSourceCityId=${params.sourceId}&srsDestinationCityId=${params.destId}`);
      const result = await res.json(); 
      setCachedData(cacheKey, result, CACHE_TTL_BUS_LIST);
      return result;
    } else {
      const res = await fetch(`${BASE_URL}/api/busBooking/getVrlFiltersV3`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vrlSourceCityName: params.sourceName, vrlDestinationCityName: params.destName, doj: params.date, vrlSourceCityId: params.sourceId, vrlDestinationCityId: params.destId }) });
      const result = await res.json();
      setCachedData(cacheKey, result, CACHE_TTL_BUS_LIST);
      return result;
    }
  } catch (error) {
    console.error(`${provider} Filter Error:`, error);
    return null;
  }
};