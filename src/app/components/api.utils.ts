export const extractValidPrice = (bus: any): number => {
  const fareList = bus.fareList || bus.bus?.fareList;

  if (Array.isArray(fareList) && fareList.length > 0) {
    const fares = fareList
      .map((f: any) => Number(f))
      .filter((f: number) => !isNaN(f) && f > 0);

    if (fares.length) {
      return Math.min(...fares);
    }
  }



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

      const fare = Number(seat.fare ?? seat.seatFare ?? seat.price);

      if (available && !isNaN(fare) && fare > 0) {
        fares.push(fare);
      }
    });
  }

  // VRL
  const seatDetails = raw?.SeatDetails || raw?.seatDetails || raw?.Seats || raw?.seats;

  if (Array.isArray(seatDetails)) {
    seatDetails.forEach((seat: any) => {
      const available = seat.IsAvailable === true || seat.isAvailable === true || seat.Status === "Available";

      const fare = Number(seat.Fare ?? seat.fare ?? seat.Price);
      if (available && !isNaN(fare) && fare > 0) {
        fares.push(fare);
      }
    });
  }

  return fares.length > 0 ? Math.min(...fares) : 0;
};