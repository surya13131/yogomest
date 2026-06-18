import {
  fetchVrlBuses,
  fetchSrsBuses,
  fetchEzeeBusesV2,
  fetchEzeeBusesV3,
  fetchCitySuggestions,
  fetchBusFilters,
  NormalizedBus
} from "../components/api";

export const fetchAllBusData = async (
  sourceName: string,
  destName: string,
  journeyDate: string,
  vrlSourceId?: string | null,
  vrlDestId?: string | null,
  srsSourceId?: string | null,
  srsDestId?: string | null,
  ezeeSourceCode?: string | null,
  ezeeDestCode?: string | null
) => {
  let vSource = vrlSourceId;
  let vDest = vrlDestId;
  let sSource = srsSourceId;
  let sDest = srsDestId;
  let eSource = ezeeSourceCode;
  let eDest = ezeeDestCode;

  // 1. Resolve IDs if they are missing
  if (!vSource || !vDest || !sSource || !sDest || !eSource || !eDest) {
    const [sourceRes, destRes] = await Promise.all([
      fetchCitySuggestions(sourceName),
      fetchCitySuggestions(destName)
    ]);
    const sMatch = sourceRes.find((c: any) => c.name.toLowerCase() === sourceName.toLowerCase());
    const dMatch = destRes.find((c: any) => c.name.toLowerCase() === destName.toLowerCase());

    if (!sMatch || !dMatch) {
      throw new Error("City must be selected from dropdown");
    }
    
    if (sMatch && dMatch) {
      vSource = vSource || sMatch.vrlCityId || undefined;
      vDest = vDest || dMatch.vrlCityId || undefined;
      sSource = sSource || sMatch.srsCityId || undefined;
      sDest = sDest || dMatch.srsCityId || undefined;
      eSource = eSource || sMatch.ezeeStationCode || undefined;
      eDest = eDest || dMatch.ezeeStationCode || undefined;
    }
  }

  // 2. Fetch all data in parallel
  const [vrl, srs, ezeeV2, ezeeV3, vrlFiltersData, srsFiltersData] = await Promise.all([
    vSource && vDest ? fetchVrlBuses(sourceName, destName, vSource, vDest, journeyDate) : [],
    sSource && sDest ? fetchSrsBuses(sourceName, destName, sSource, sDest, journeyDate) : [],
    fetchEzeeBusesV2(sourceName, destName, journeyDate),
    eSource && eDest ? fetchEzeeBusesV3(sourceName, destName, journeyDate, eSource, eDest) : [],
    vSource && vDest ? fetchBusFilters("VRL", { sourceName, destName, date: journeyDate, sourceId: vSource, destId: vDest }) : null,
    sSource && sDest ? fetchBusFilters("SRS", { sourceName, destName, date: journeyDate, sourceId: sSource, destId: sDest }) : null
  ]);

  // 3. Combine Buses
  let combinedBuses: NormalizedBus[] = [
    ...(vrl || []),
    ...(srs || []),
    ...(ezeeV2 || []),
    ...(ezeeV3 || [])
  ].filter(bus => Number(bus.availableSeats ?? 0) > 0);

  // 4. Combine Filters (Boarding / Dropping)
  let combinedBoarding: any[] = [];
  let combinedDropping: any[] = [];

  if (vrlFiltersData?.data?.boardingPoints) combinedBoarding.push(...vrlFiltersData.data.boardingPoints);
  if (srsFiltersData?.boardingPoints) combinedBoarding.push(...srsFiltersData.boardingPoints);
  if (vrlFiltersData?.data?.droppingPoints) combinedDropping.push(...vrlFiltersData.data.droppingPoints);
  if (srsFiltersData?.droppingPoints) combinedDropping.push(...srsFiltersData.droppingPoints);

  return {
    buses: combinedBuses,
    boardingPoints: combinedBoarding,
    droppingPoints: combinedDropping
  };
};