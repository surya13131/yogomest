import {
  fetchVrlBuses,
  fetchVrlBusesV2,
  fetchSrsBuses,
  fetchSrsBusesV2,
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
  console.log("fetchAllBusData called");

  let vSource = vrlSourceId;
  let vDest = vrlDestId;
  let sSource = srsSourceId;
  let sDest = srsDestId;
  let eSource = ezeeSourceCode;
  let eDest = ezeeDestCode;

  // 1. Resolve IDs if they are missing
  const allSourceIdsAvailable = vSource && sSource && eSource;
  const allDestIdsAvailable = vDest && sDest && eDest;

  if (!allSourceIdsAvailable || !allDestIdsAvailable) {
    const [sourceRes, destRes] = await Promise.all([
      fetchCitySuggestions(sourceName),
      fetchCitySuggestions(destName)
    ]);
    const sMatch = sourceRes.find((c: any) => c.name.toLowerCase().startsWith(sourceName.toLowerCase()));
    const dMatch = destRes.find((c: any) => c.name.toLowerCase().startsWith(destName.toLowerCase()));

    if (!sMatch || !dMatch) {
      throw new Error("City must be selected from dropdown");
    }

    vSource = vSource || sMatch.vrlCityId;
    sSource = sSource || sMatch.srsCityId;
    eSource = eSource || sMatch.ezeeStationCode;
    vDest = vDest || dMatch.vrlCityId;
    sDest = sDest || dMatch.srsCityId;
    eDest = eDest || dMatch.ezeeStationCode;
  }

  // 2. Fetch all data in parallel
  const [
    vrlV3,
    vrlV2,
    srsV3,
    srsV2,
    ezeeV2,
    ezeeV3,
    vrlFiltersData,
    srsFiltersData,
  ] = await Promise.all([
    (async () => {
      console.log("Calling VRL V3");
      return vSource && vDest ? fetchVrlBuses(sourceName, destName, vSource, vDest, journeyDate) : Promise.resolve([]);
    })(),
    (async () => {
      console.log("Calling VRL V2");
      return vSource && vDest ? fetchVrlBusesV2(sourceName, destName, journeyDate) : Promise.resolve([]);
    })(),
    (async () => {
      console.log("Calling SRS V3");
      return sSource && sDest ? fetchSrsBuses(sourceName, destName, sSource, sDest, journeyDate) : Promise.resolve([]);
    })(),
    (async () => {
      console.log("Calling SRS V2");
      return sSource && sDest ? fetchSrsBusesV2(sourceName, destName, journeyDate, sSource, sDest) : Promise.resolve([]);
    })(),
    (async () => {
      console.log("Calling EZEE V2");
      return fetchEzeeBusesV2(sourceName, destName, journeyDate);
    })(),
    (async () => {
      console.log("Calling EZEE V3");
      return eSource && eDest
        ? fetchEzeeBusesV3(sourceName, destName, journeyDate, eSource, eDest)
        : Promise.resolve([]);
    })(),
    vSource && vDest
      ? fetchBusFilters("VRL", {
          sourceName,
          destName,
          date: journeyDate,
          sourceId: vSource,
          destId: vDest,
        })
      : null,

    sSource && sDest
      ? fetchBusFilters("SRS", {
          sourceName,
          destName,
          date: journeyDate,
          sourceId: sSource,
          destId: sDest,
        })
      : null,
  ]);

  console.log("VRL V3", vrlV3.length);
  console.log("VRL V2", vrlV2.length);
  console.log("SRS V3", srsV3.length);
  console.log("SRS V2", srsV2.length);
  console.log("EZEE V2", ezeeV2.length);
  console.log("EZEE V3", ezeeV3.length);


  // 3. Combine Buses
  const combinedBuses: NormalizedBus[] = [];
  const uniqueBuses = new Map<string, NormalizedBus>();

  [
    ...(vrlV3 || []),
    ...(vrlV2 || []),
    ...(srsV3 || []),
    ...(srsV2 || []),
    ...(ezeeV2 || []),
    ...(ezeeV3 || []),
  ].forEach(bus => {
    if (!uniqueBuses.has(bus.id) || (uniqueBuses.get(bus.id)!.price > bus.price)) {
      uniqueBuses.set(bus.id, bus);
    }
  });
  
  combinedBuses.push(...Array.from(uniqueBuses.values()).filter(bus => Number(bus.availableSeats ?? 0) > 0));

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