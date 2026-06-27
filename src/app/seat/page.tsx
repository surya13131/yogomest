"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import './seat.css';

import { fetchSeatLayoutData, blockSeatLogic, NormalizedSeat } from "./seat"; 
import { BASE_URL } from "../components/api";
import Step1SeatSelection from './SeatSelection';
import Step2PointSelection from './Drop';
import Step3PassengerInfo from './passenger';

export const fetchPassengerHistory = async (userId: string) => {
  try {
    const res = await fetch(`${BASE_URL}/api/busBooking/getAllBookings/${userId}`);
    const data = await res.json();
    
    const extractedPassengers: {name: string, age: string, gender: string}[] = [];
    const seenNames = new Set();

    const bookings = data?.data || (Array.isArray(data) ? data : []);
    
    if (Array.isArray(bookings)) {
      bookings.forEach((booking: any) => {
        if (booking.passengers && Array.isArray(booking.passengers)) {
          booking.passengers.forEach((p: any) => {
            if (p.name && !seenNames.has(p.name.toLowerCase())) {
              seenNames.add(p.name.toLowerCase());
              extractedPassengers.push({
                name: p.name,
                age: p.age ? String(p.age) : "",
                gender: p.gender || ""
              });
            }
          });
        }
      });
    }

    return extractedPassengers;
  } catch (error) {
    console.error("Error fetching passenger history:", error);
    return [];
  }
};

function SeatLayoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const provider = searchParams.get("provider");
  const rawRefNum = searchParams.get("refNum") || "";
  let refNum = rawRefNum;
  try {
    refNum = decodeURIComponent(rawRefNum).replace(/\+/g, " ").trim();
  } catch (e) {}

  const scheduleId = searchParams.get("scheduleId");
  const tripCode = searchParams.get("tripCode");
  const ezeeSourceId = searchParams.get("ezeeSourceId");
  const ezeeDestId = searchParams.get("ezeeDestId");
  
  const operatorName = searchParams.get("operatorName") || "V Bus Holidays";
  
  // ✅ FIX: Safely decode the bus type without replacing the actual "+" sign!
  let decodedBusType = searchParams.get("busType") || "Bharat Benz A/C Sleeper (2+1)";
  try { decodedBusType = decodeURIComponent(decodedBusType); } catch(e) {}
  try { decodedBusType = decodeURIComponent(decodedBusType); } catch(e) {}
  const busTypeUrl = decodedBusType.trim();

  const sourceCity = searchParams.get("sourceCity") || "Bangalore";
  const destinationCity = searchParams.get("destinationCity") || "Chennai";
  const departureTime = searchParams.get("departureTime") || "22:30";
  const arrivalTime = searchParams.get("arrivalTime") || "05:25";
  const rating = searchParams.get("rating") || "4.9";
  const basePrice = parseFloat(searchParams.get("price") || "800");
  const doj = searchParams.get("doj") || new Date().toISOString().split('T')[0];
  const urlSourceId = searchParams.get("sourceId") || "";
  const urlDestId = searchParams.get("destId") || "";

  const [actualSourceId, setActualSourceId] = useState(urlSourceId);
  const [actualDestId, setActualDestId] = useState(urlDestId);
  const [tripOriginId, setTripOriginId] = useState("");
  const [tripDestId, setTripDestId] = useState("");
  const [rawLayout, setRawLayout] = useState<any>(null);

  const [apiBusType, setApiBusType] = useState<string>("");

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedSeats, setSelectedSeats] = useState<NormalizedSeat[]>([]);
  const [selectedBp, setSelectedBp] = useState<any>(null);
  const [selectedDp, setSelectedDp] = useState<any>(null);
  const [isBlocking, setIsBlocking] = useState(false); 

  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactState, setContactState] = useState("");
  const [autoFillName, setAutoFillName] = useState(""); 
  const [passengers, setPassengers] = useState<any[]>([]);
  const [insurance, setInsurance] = useState<boolean | null>(null);
  const [hasGst, setHasGst] = useState(false);
  const [gstDetails, setGstDetails] = useState({ name: '', gstId: '', address: '' });

  const [seats, setSeats] = useState<NormalizedSeat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [lastSeats, setLastSeats] = useState<string[]>([]);
  const [boardingPoints, setBoardingPoints] = useState<any[]>([]);
  const [droppingPoints, setDroppingPoints] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"why" | "route" | "boarding" | "dropping">("boarding");
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>(null);

  const [savedPassengers, setSavedPassengers] = useState<{name: string, age: string, gender: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<number | null>(null);

  const getShortDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };
  const journeyDateShort = getShortDate(doj);

  useEffect(() => {
    // Load User from localStorage to auto-fill contact details
    try {
      const savedUser = localStorage.getItem('yesgo_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setContactPhone(user.phone || "");
        setContactEmail(user.email || "");
        setAutoFillName(user.name || "");
      } else {
        // Fallback for older storage keys if yesgo_user is not present
        setContactPhone(localStorage.getItem("phone") || "");
        setContactEmail(localStorage.getItem("email") || "");
      }
    } catch (error) {
      console.warn("Could not parse user details from local storage.");
    }
  }, []);

  useEffect(() => {
    const loadPassengerHistory = async () => {
      try {
        const userId = localStorage.getItem("userId") || localStorage.getItem("_id");
        if (!userId) return;
        const extractedHistory = await fetchPassengerHistory(userId);
        if (extractedHistory && extractedHistory.length > 0) {
          setSavedPassengers(extractedHistory);
        }
      } catch (err) {
        console.error("Failed to load passenger history", err);
      }
    };
    loadPassengerHistory();
  }, []);

  useEffect(() => {
    setSelectedSeats([]);
    setSelectedBp(null);
    setSelectedDp(null);
  }, [provider, refNum, scheduleId, tripCode, ezeeSourceId, ezeeDestId]);

  useEffect(() => {

    const loadSeats = async () => {
      if (!provider) return; 
      setIsLoading(true);
      try {
        const layoutData = await fetchSeatLayoutData({
          provider, sourceCity, destinationCity, doj, urlSourceId, urlDestId, refNum, scheduleId, tripCode, ezeeSourceId, ezeeDestId, basePrice,
          busType: busTypeUrl,
          operatorName,
        });

        setSeats(layoutData.seats);
        setBoardingPoints(layoutData.boardingPoints);
        setDroppingPoints(layoutData.droppingPoints);
        setActualSourceId(layoutData.actualSourceId);
        setActualDestId(layoutData.actualDestId);
        setLastSeats(layoutData.lastSeats || []);
        
        setTripOriginId(String(urlSourceId || layoutData.tripOriginId));
        setTripDestId(String(urlDestId || layoutData.tripDestId));

        setRawLayout(layoutData.rawLayout);

        console.log(`[seat/page.tsx] PROVIDER CHECK: ${provider}`);
        console.log("RAW REF:", rawRefNum);
        console.log("FINAL REF:", refNum);
        console.log(`[seat/page.tsx] Loaded ${provider} layout data:`, {
          seats: layoutData.seats?.map((seat: any) => ({
            id: seat.id,
            row: seat.row,
            col: seat.col,
            isUpper: seat.isUpper,
            isSleeper: seat.isSleeper,
            fare: seat.fare,
          })),
          rawLayout: layoutData.rawLayout,
          busType: layoutData.busType,
        });

        if (layoutData.busType) {
          setApiBusType(layoutData.busType);
        }

      } catch (error) {
        console.error("Failed to load layout", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSeats();
  }, [provider, refNum, scheduleId, tripCode, ezeeSourceId, ezeeDestId, basePrice, sourceCity, destinationCity, doj, urlSourceId, urlDestId, busTypeUrl]);

  const minGlobalCol = seats.length > 0 ? Math.min(...seats.map(s => s.col)) : 0;

  const normalizeDeck = (deckSeats: NormalizedSeat[]) => {
    if (deckSeats.length === 0) return [];
    const minRow = Math.min(...deckSeats.map(s => s.row));
    const minCol = Math.min(...deckSeats.map(s => s.col));
    return deckSeats.map((seat) => ({
      ...seat,
      row: seat.row - minRow,
      col: seat.col - minCol,
    }));
  };

  const lowerDeckSeatsRaw = seats.filter(s => !s.isUpper);
  const upperDeckSeatsRaw = seats.filter(s => s.isUpper);

  // For EZEE, we trust the raw coordinates from the API and do not normalize them to a 0,0 origin.
  // For other providers, normalize each deck to start at its own 0,0.
  const isEzee = provider === "EZEE_V2" || provider === "EZEE_V3";
  const lowerDeckSeats = isEzee ? lowerDeckSeatsRaw : normalizeDeck(lowerDeckSeatsRaw);
  const upperDeckSeats = isEzee ? upperDeckSeatsRaw : normalizeDeck(upperDeckSeatsRaw);

  const maxRowLower = lowerDeckSeats.length > 0 ? Math.max(...lowerDeckSeats.map(s => s.row + 1)) : 0;
  const maxRowUpper = upperDeckSeats.length > 0 ? Math.max(...upperDeckSeats.map(s => s.row + 1)) : 0;
  const absoluteMaxRow = Math.max(maxRowLower, maxRowUpper, 4);

  const maxGlobalCol = seats.length > 0 ? Math.max(...seats.map(s => s.col)) : 0;
  const totalCols = Math.max(maxGlobalCol - minGlobalCol + 1, 1);

  const handleSeatClick = (seat: NormalizedSeat) => {
    if (!seat.isAvailable) return;
    setSelectedSeats(prev => {
      const exists = prev.some(s => s.id === seat.id);
      if (exists) return prev.filter(s => s.id !== seat.id);
      if (prev.length >= 6) {
        alert("You can select a maximum of 6 seats.");
        return prev;
      }
      return [...prev, seat];
    });
  };

  const totalFare = selectedSeats.reduce((sum, seat) => sum + seat.fare, 0);
  const finalAmount = totalFare + (insurance === true ? selectedSeats.length * 15 : 0);

  const handleBack = () => {
    if (currentStep === 3) setCurrentStep(2);
    else if (currentStep === 2) setCurrentStep(1);
    else router.back();
  };

  const handleContinue = async () => {
    if (currentStep === 1) {
      setCurrentStep(2);
      window.scrollTo(0, 0);
    } else if (currentStep === 2) {
      if (!selectedBp || !selectedDp) {
        alert("Please select both a Boarding Point and a Dropping Point to continue.");
        return;
      }
      let pName = localStorage.getItem("name") || autoFillName;
      setPassengers(selectedSeats.map((seat, index) => ({
        seatId: seat.id, name: index === 0 ? pName : '', age: '', gender: ''
      })));
      setCurrentStep(3);
      window.scrollTo(0, 0);
    } else if (currentStep === 3) {
      // Enhanced Validation
      if (!contactState) { alert("Please select your State of Residence."); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) { alert("Please enter a valid email address."); return; }
      if (!/^[6-9]\d{9}$/.test(contactPhone)) { alert("Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9."); return; }

      for (const pax of passengers) {
        if (!pax.name || pax.name.trim().length < 3) {
          alert(`Please enter a valid name (at least 3 characters) for the passenger in seat ${pax.seatId}.`);
          return;
        }
        const ageNum = Number(pax.age);
        if (!pax.age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
          alert(`Please enter a valid age (1-120) for the passenger in seat ${pax.seatId}.`);
          return;
        }
        if (!pax.gender) { alert(`Please select a gender for the passenger in seat ${pax.seatId}.`); return; }
      }

      if (insurance === null) { alert("Please select an insurance option to proceed."); return; }
      if (hasGst && (!gstDetails.name || !gstDetails.gstId || !gstDetails.address)) { alert("Please fill all GST details."); return; }

      setIsBlocking(true);

      let exactOriginId = String(tripOriginId);
      let exactDestId = String(tripDestId);

      try {
        const result = await blockSeatLogic({
          provider, refNum, scheduleId, tripCode, sourceCity, destinationCity, doj,
          operatorName, 
          busType: busTypeUrl || apiBusType, 
          selectedSeats, selectedBp, selectedDp, passengers,
          contactEmail, contactPhone, hasGst, gstDetails, finalAmount, totalFare,
          tripOriginId: exactOriginId, 
          tripDestId: exactDestId,     
          actualSourceId, actualDestId, departureTime, arrivalTime, insurance,
          boardingPoints, droppingPoints, rawLayout 
        });

        if (!result?.bookingId) throw new Error("Invalid booking details returned from server. Booking failed.");

        const blockKey = result.blockKey;
        const bookingId = result.bookingId;
        const checkoutAmount = result.finalAmount;
        const userId = localStorage.getItem("userId") || localStorage.getItem("_id") || "";

        const params = new URLSearchParams({ bookingId: bookingId, amount: String(checkoutAmount), blockKey: blockKey });
        if (userId) params.append("userId", userId);

        router.push(`/checkout?${params.toString()}`);
      } catch(err: any) {
        alert(err.message); 
      } finally {
        setIsBlocking(false);
      }
    }
  };

  const handlePaxChange = (index: number, field: string, value: string) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  const toggleAccordion = (id: string) => setExpandedAccordion(expandedAccordion === id ? null : id);

  const firstBpName = boardingPoints.length > 0 ? (boardingPoints[0]?.stage || boardingPoints[0]?.locationName || boardingPoints[0]?.name || sourceCity) : sourceCity;
  const lastDpName = droppingPoints.length > 0 ? (droppingPoints[droppingPoints.length - 1]?.stage || droppingPoints[droppingPoints.length - 1]?.locationName || droppingPoints[droppingPoints.length - 1]?.name || destinationCity) : destinationCity;

  return (
    <div className="seat-page-wrapper" style={{ paddingBottom: "140px", backgroundColor: currentStep >= 2 ? "#fff" : "" }}>
      <style>{`
        .redbus-grid { display: grid; gap: 12px 24px; justify-content: center; }
        .seat-price-tooltip { position: absolute; top: -30px; background: #333; color: #fff; font-size: 11px; padding: 4px 8px; border-radius: 4px; opacity: 0; transition: opacity 0.2s; pointer-events: none; white-space: nowrap; }
        .seat-wrapper:hover .seat-price-tooltip { opacity: 1; }
        .decks-container { align-items: stretch; }
      `}</style>
      
      <div className="top-header">
        <div className="header-route" onClick={handleBack} style={{ cursor: 'pointer' }}>
          <i className="bi bi-arrow-left fs-4 fw-bold"></i>
          <span>{sourceCity} <span className="text-muted fw-normal mx-1">→</span> {destinationCity}</span>
        </div>
      </div>

      <div className="stepper-container d-flex justify-content-center gap-3 gap-md-5 pt-3 pb-2 mb-3 bg-white border-bottom shadow-sm">
        <span onClick={() => setCurrentStep(1)} style={{ cursor: 'pointer', paddingBottom: '8px', borderBottom: currentStep === 1 ? '3px solid #e11d48' : 'none', color: currentStep === 1 ? '#e11d48' : '#6b7280', fontWeight: currentStep === 1 ? '700' : '500' }}>1. Select seats</span>
        <span onClick={() => { if(selectedSeats.length > 0) setCurrentStep(2) }} style={{ cursor: selectedSeats.length > 0 ? 'pointer' : 'default', paddingBottom: '8px', borderBottom: currentStep === 2 ? '3px solid #e11d48' : 'none', color: currentStep === 2 ? '#e11d48' : '#6b7280', fontWeight: currentStep === 2 ? '700' : '500' }}>2. Board/Drop point</span>
        <span style={{ paddingBottom: '8px', borderBottom: currentStep === 3 ? '3px solid #e11d48' : 'none', color: currentStep === 3 ? '#e11d48' : '#6b7280', fontWeight: currentStep === 3 ? '700' : '500' }}>3. Passenger Info</span>
      </div>

      <div className="page-container">
        <div className="container-fluid px-3 px-xl-5 mt-4 mb-5 pb-5">
          
          {currentStep === 1 && (
            <Step1SeatSelection
              isLoading={isLoading} seats={seats} lowerDeckSeats={lowerDeckSeats} upperDeckSeats={upperDeckSeats} absoluteMaxRow={absoluteMaxRow}
              totalCols={totalCols}
              selectedSeats={selectedSeats} handleSeatClick={handleSeatClick} operatorName={operatorName} 
              departureTime={departureTime}
              arrivalTime={arrivalTime} 
              rating={rating} 
              journeyDateShort={journeyDateShort} 
              busType={busTypeUrl || apiBusType}
              lastSeats={lastSeats}
              provider={provider || ""}
              activeTab={activeTab} setActiveTab={setActiveTab}
              boardingPoints={boardingPoints} droppingPoints={droppingPoints} sourceCity={sourceCity} destinationCity={destinationCity}
              firstBpName={firstBpName} lastDpName={lastDpName} expandedAccordion={expandedAccordion} toggleAccordion={toggleAccordion}
            />
          )}

          {currentStep === 2 && (
            <Step2PointSelection
              boardingPoints={boardingPoints} droppingPoints={droppingPoints} selectedBp={selectedBp} setSelectedBp={setSelectedBp} selectedDp={selectedDp} setSelectedDp={setSelectedDp} 
              departureTime={departureTime} arrivalTime={arrivalTime}
            />
          )}

          {currentStep === 3 && (
            <Step3PassengerInfo
              operatorName={operatorName} selectedBp={selectedBp} selectedDp={selectedDp} doj={doj} finalAmount={finalAmount}
              contactPhone={contactPhone} setContactPhone={setContactPhone} contactEmail={contactEmail} setContactEmail={setContactEmail} contactState={contactState} setContactState={setContactState}
              passengers={passengers} handlePaxChange={handlePaxChange} showSuggestions={showSuggestions} setShowSuggestions={setShowSuggestions} savedPassengers={savedPassengers}
              insurance={insurance} setInsurance={setInsurance} hasGst={hasGst} setHasGst={setHasGst} gstDetails={gstDetails} setGstDetails={setGstDetails} selectedSeats={selectedSeats} 
              busType={busTypeUrl || apiBusType}
              departureTime={departureTime}
              arrivalTime={arrivalTime}
            />
          )}
        </div>
      </div>

      {selectedSeats.length > 0 && (
        <div className="checkout-footer d-flex flex-column flex-sm-row justify-content-between align-items-center w-100 shadow-lg px-3 px-md-5 bg-white border-top gap-3 gap-sm-0 py-3 py-sm-2">
          <div className="w-100 w-sm-auto text-center text-sm-start">
            <div className="text-muted fw-medium" style={{ fontSize: "12px", marginBottom: "2px" }}>Seat No.</div>
            <div className="fw-bold text-dark fs-5 text-truncate" style={{ maxWidth: "200px" }}>{selectedSeats.map(s => s.id).join(', ')}</div>
          </div>
          <div className="d-flex align-items-center gap-3 gap-md-4 w-100 w-sm-auto justify-content-between justify-content-sm-end">
            <div className="text-end">
              <div className="text-muted fw-medium" style={{ fontSize: "11px", marginBottom: "2px" }}>Amount<br/>(Tax excluded)</div>
              <div className="fw-bold text-dark fs-4">₹{finalAmount.toFixed(2)}</div> 
            </div>
            <button className="btn text-white fw-bold px-4 py-3 d-flex justify-content-center align-items-center gap-2" style={{ background: "#0D2B4C", borderRadius: "8px", fontSize: "16px", minWidth: currentStep === 1 ? "140px" : "180px" }} onClick={handleContinue} disabled={isBlocking}>
              {isBlocking && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
              {currentStep === 1 ? "Continue" : (isBlocking ? "Blocking Seats..." : "Continue booking")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SeatLayout() {
  return (
    <Suspense fallback={<div className="text-center py-5"><div className="spinner-border text-primary" style={{width: '3rem', height: '3rem'}}></div></div>}>
      <SeatLayoutContent />
    </Suspense>
  );
}