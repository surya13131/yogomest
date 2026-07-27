"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BASE_URL } from "../components/api";


// ─── Types ───────────────────────────────────────────────────────────────────
interface Booking {
  id?: string;
  _id?: string; 
  pnr: string;
  blockKey?: string; 
  apiProvider: string; 
  operatorName: string;
  busType: string;
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  seatNumbers: string[] | string | any;
  passengerName: string;
  totalFare: number;
  status: "upcoming" | "completed" | "cancelled" | "paid" | "success" | "CANCELLED";
  bookingDate: string;
  boardingPoint: string;
  droppingPoint: string;
}

interface CancelPreview {
  bookingId: string;
  apiProvider: string;
  cca: string;
  ctpc: string;
  refundAmount: number;
  pnr?: string; 
  blockKey?: string; 
  seatNumbers?: string; 
}

// ─── Empty State ─────────────────────────────────────────────────────────────
const EmptyState = ({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) => (
  <div className="d-flex flex-column align-items-center justify-content-center py-5 w-100" style={{ minHeight: "60vh", backgroundColor: "#fff" }}>
    <p style={{ fontSize: "18px", fontFamily: "Georgia, serif", color: "#6c757d", marginBottom: "20px" }}>
      No bookings found.
    </p>
    <button
      onClick={onRefresh}
      className="btn d-inline-flex align-items-center gap-2 px-4 py-2"
      style={{
        backgroundColor: "#0D2B4C",
        color: "#fff",
        borderRadius: "50px",
        fontSize: "15px",
        border: "none",
        boxShadow: "0px 4px 10px rgba(0,0,0,0.1)"
      }}
    >
      <i className={`bi bi-arrow-clockwise ${refreshing ? "spin-icon" : ""}`}></i>
      Refresh
    </button>
  </div>
);

// ─── Booking Card (Full Width & Responsive) ──────────────────────────────────
const BookingCard = ({
  booking,
  onClick
}: {
  booking: Booking;
  onClick: (b: Booking) => void;
}) => {
  return (
    <div
      className="card border-0 shadow-sm mb-3 booking-card w-100"
      onClick={() => onClick(booking)}
      style={{
        borderRadius: "12px",
        backgroundColor: "#f8f9fa",
        cursor: "pointer",
        padding: "20px 24px",
        border: "1px solid #e9ecef",
        transition: "transform 0.2s, box-shadow 0.2s"
      }}
    >
      <div className="d-flex align-items-center justify-content-between w-100 flex-wrap gap-3">
        <div className="d-flex flex-row align-items-start gap-4 flex-grow-1">
          <div className="mt-1 d-none d-sm-block">
            <i className="bi bi-bus-front" style={{ color: "#0D2B4C", fontSize: "28px" }}></i>
          </div>
          <div className="flex-grow-1">
            <h5 className="mb-1 d-flex flex-wrap align-items-center gap-2" style={{ color: "#0D2B4C", fontWeight: "700", fontSize: "20px" }}>
              <span>{booking.from || (booking as any).sourceCity}</span> 
              <i className="bi bi-arrow-right" style={{ fontSize: "16px", color: "#6c757d" }}></i> 
              <span>{booking.to || (booking as any).destinationCity}</span>
            </h5>
            <div className="d-flex flex-wrap gap-4 mt-2" style={{ fontSize: "15px", color: "#495057" }}>
              <div><strong>Date:</strong> {booking.departureDate || (booking as any).doj?.split('T')}</div>
              <div>
                {booking.departureTime || (booking as any).pickUpTime} <i className="bi bi-arrow-right mx-1" style={{ fontSize: "12px", color: "#6c757d" }}></i> {booking.arrivalTime || (booking as any).reachTime}
              </div>
            </div>
            <div className="mt-2" style={{ fontSize: "14px", color: "#6c757d" }}>
              {booking.operatorName || (booking as any).busOperator} 
              <span className="badge bg-secondary ms-2" style={{ fontSize: "10px" }}>
                {booking.apiProvider || ((booking as any).isVrl ? "VRL" : (booking as any).isSrs ? "SRS" : "EZEE")}
              </span>
            </div>
          </div>
        </div>
        <div className="d-flex flex-column align-items-end">
          <span 
            className="badge mb-2" 
            style={{ 
              backgroundColor: (booking.status?.toLowerCase() === 'cancelled' || (booking as any).bookingStatus?.toLowerCase() === 'cancelled') ? '#dc3545' : '#198754',
              fontSize: '12px'
            }}
          >
            {(booking.status || (booking as any).bookingStatus || 'UPCOMING').toUpperCase()}
          </span>
          {(booking.status?.toLowerCase() === 'cancelled' || (booking as any).bookingStatus?.toLowerCase() === 'cancelled') && (booking as any).totalRefundAmount > 0 &&
            <div className="text-success" style={{ fontSize: '13px', fontWeight: '500' }}>
              Refund: ₹{(booking as any).totalRefundAmount}
            </div>
          }
          <i className="bi bi-chevron-right text-secondary fs-4"></i>
        </div>
      </div>
    </div>
  );
};

// ─── Popup Modal (with Cancel & Refund Logic) ────────────────────────────────
const TicketModal = ({ 
  booking, 
  onClose, 
  onInitiateCancel,
  isProcessing
}: { 
  booking: Booking | null, 
  onClose: () => void, 
  onInitiateCancel: (b: Booking) => void,
  isProcessing: boolean
}) => {
  const router = useRouter();
  const [refundData, setRefundData] = useState<{ status: string; amount: number; refundId?: string } | null>(null);
  const [isFetchingRefund, setIsFetchingRefund] = useState(false);

  if (!booking) return null;

  const currentStatus = booking.status?.toLowerCase() || (booking as any).bookingStatus?.toLowerCase();
  const isCancelled = currentStatus === 'cancelled' || currentStatus === 'cancel';
  const bookingId = booking.id || booking._id || "";

  // Helper to cleanly extract seat numbers for display
  let displaySeats = "---";
  const rawSeats = booking.seatNumbers || (booking as any).selectedSeats || (booking as any).seats || [];
  if (typeof rawSeats === 'string') {
    displaySeats = rawSeats;
  } else if (Array.isArray(rawSeats)) {
    displaySeats = rawSeats.map((p: any) => typeof p === 'string' ? p : (p?.seatName || p?.seatCode)).filter(Boolean).join(", ");
  }

  const handleCheckRefund = async () => {
    setIsFetchingRefund(true);
    try {
      const res = await fetch(`${BASE_URL}/api/busBooking/refundStatus/${bookingId}`);
      if (res.ok) {
        const data = await res.json();
        const finalData = data.data || data; 
        setRefundData({
          status: finalData.status || 'Processing',
          amount: finalData.amount || finalData.refundAmount || 0,
          refundId: finalData.refundId || 'N/A'
        });
      } else {
        alert("Refund data not available yet.");
      }
    } catch (error) {
      console.error("Refund Fetch Error:", error);
      alert("Error fetching refund status.");
    } finally {
      setIsFetchingRefund(false);
    }
  };

  const handleViewTicket = () => {
    // Ensure standard formatting before sending to CheckoutPage
    const normalizedBookingData = {
        ...booking,
        status: isCancelled ? 'CANCELLED' : 'paid',
        bookingStatus: isCancelled ? 'cancelled' : 'paid',
        sourceCity: booking.from || (booking as any).sourceCity,
        destinationCity: booking.to || (booking as any).destinationCity,
        doj: booking.departureDate || (booking as any).doj?.split('T'),
        pickUpTime: booking.departureTime || (booking as any).pickUpTime,
        reachTime: booking.arrivalTime || (booking as any).reachTime,
        busOperator: booking.operatorName || (booking as any).busOperator,
        customerName: booking.passengerName || (booking as any).customerName,
        totalAmount: booking.totalFare || (booking as any).totalAmount || 0,
        selectedSeats: displaySeats,
        pnrNumber: booking.pnr || (booking as any).pnrNumber || booking.blockKey
    };

    // Save heavily normalized data to session storage so checkout page reads it perfectly
    sessionStorage.setItem("savedTicketData", JSON.stringify(normalizedBookingData));
    localStorage.setItem("savedTicketData", JSON.stringify(normalizedBookingData));
    
    // Force checkout page to bypass Razorpay payment initialization
    sessionStorage.setItem(`payment_success_${bookingId}`, "true");
    
    // Determine blockKey for the URL
    const bKey = booking.blockKey || booking.pnr || (booking as any).pnrNumber || "";
    const amount = booking.totalFare || (booking as any).totalAmount || 0;
    const userId = (booking as any).userId || "";
    
    window.location.href = `/checkout?bookingId=${bookingId}&blockKey=${bKey}&amount=${amount}&userId=${userId}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="custom-modal slide-up" onClick={(e) => e.stopPropagation()}>
        
        {/* Header & Close Button */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="flex-grow-1 text-center mt-2">
            <h3 className="modal-route-title" style={{ color: "#0D2B4C", fontWeight: "bold", marginBottom: "8px" }}>
              {booking.from || (booking as any).sourceCity} <span className="mx-2" style={{ fontSize: "20px", verticalAlign: "middle", color: "#6c757d" }}>→</span> {booking.to || (booking as any).destinationCity}
            </h3>
            <h5 style={{ color: "#0D2B4C", fontWeight: "bold", margin: 0 }}>
              {booking.departureDate || (booking as any).doj?.split('T')}
            </h5>
          </div>
          <i className="bi bi-x-circle text-secondary fs-4" style={{ cursor: "pointer" }} onClick={onClose}></i>
        </div>
        
        <hr style={{ borderColor: "#dee2e6", margin: "20px 0" }} />

        {/* Body */}
        <div className="text-center mb-4" style={{ fontSize: "16px", color: "#212529" }}>
          <div className="mb-3 fs-5 fw-medium">
            {booking.departureTime || (booking as any).pickUpTime} <span style={{ fontSize: "14px", margin: "0 8px", color: "#6c757d" }}>→</span> {booking.arrivalTime || (booking as any).reachTime}
          </div>
          <div className="mb-2 fs-5">{booking.operatorName || (booking as any).busOperator}</div>
          <div className="mb-2 text-muted" style={{ fontSize: '14px' }}>{booking.busType}</div>
          
          <div className="mt-4 p-3 bg-light rounded text-start" style={{ border: "1px dashed #ccc" }}>
            <div className="row g-3">
              <div className="col-6 col-md-3"><strong>PNR:</strong><br/>{booking.pnr || booking.blockKey || (booking as any).pnrNumber}</div>
              <div className="col-6 col-md-3">
                <strong>Seats:</strong><br/>
                {displaySeats}
              </div>
              <div className="col-6 col-md-3"><strong>Passenger:</strong><br/>{booking.passengerName || (booking as any).customerName}</div>
              <div className="col-6 col-md-3">
                <strong>Status:</strong><br/>
                <span className="badge" style={{ backgroundColor: isCancelled ? '#dc3545' : '#198754' }}>
                  {isCancelled ? 'CANCELLED' : 'CONFIRMED'}
                </span>
              </div>
            </div>
          </div>

          {/* Inline Refund Display */}
          {refundData && isCancelled && (
             <div className="mt-3 p-3 rounded text-start" style={{ backgroundColor: '#e8f5e9', border: '1px solid #c8e6c9' }}>
               <h6 className="fw-bold mb-2 text-success"><i className="bi bi-info-circle me-2"></i>Refund Information</h6>
               <div className="d-flex justify-content-between mb-1" style={{ fontSize: '14px' }}>
                 <span>Status:</span> <strong>{refundData.status.toUpperCase()}</strong>
               </div>
               <div className="d-flex justify-content-between" style={{ fontSize: '14px' }}>
                 <span>Amount:</span> <strong>₹{refundData.amount}</strong>
               </div>
             </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center mt-4">
          <button 
            className="btn py-2 flex-grow-1" 
            onClick={handleViewTicket}
            style={{ backgroundColor: "#0D2B4C", color: "#fff", borderRadius: "8px", fontSize: "16px", fontWeight: "600" }}
          >
            <i className="bi bi-ticket-detailed me-2"></i> View Ticket
          </button>

          {!isCancelled ? (
             <button 
               className="btn py-2 flex-grow-1" 
               onClick={() => onInitiateCancel(booking)} 
               disabled={isProcessing}
               style={{ backgroundColor: "#dc3545", color: "#fff", borderRadius: "8px", fontSize: "16px", fontWeight: "600", border: "none" }}
             >
               {isProcessing ? <span className="spinner-border spinner-border-sm"></span> : "Cancel Ticket"}
             </button>
          ) : (
            <button 
              className="btn py-2 flex-grow-1" 
              onClick={handleCheckRefund}
              disabled={isFetchingRefund}
              style={{ backgroundColor: "#4CAF50", color: "#fff", borderRadius: "8px", fontSize: "16px", fontWeight: "600", border: "none" }}
            >
              {isFetchingRefund ? <span className="spinner-border spinner-border-sm"></span> : "Check Refund Status"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function MyBookingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"Upcoming" | "Completed" | "Cancelled">("Upcoming");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // State for Cancel Flow
  const [cancelPreview, setCancelPreview] = useState<CancelPreview | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // CHECK URL ON LOAD: If URL contains ?tab=cancelled, instantly open Cancelled tab.
  useEffect(() => {
    if (typeof window !== "undefined") {
      require("bootstrap/dist/js/bootstrap.bundle.min.js");
      
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "cancelled") {
        setActiveTab("Cancelled");
      }
    }
  }, []);

  // 1. Fetch Bookings API
  const fetchBookings = async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      // ✅ FIX: Exact logic mapping from CheckoutPage ensuring test users see their data
      console.log("=== MY BOOKINGS ===");
      
      const userStr = localStorage.getItem('yesgo_user');
      console.log("Local Storage:", userStr);

      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?._id || user?.id;
      console.log("User ID:", userId);

      if (!userId || userId.length < 10) {
        console.warn("No valid user ID found, cannot fetch bookings.");
        setBookings([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const url = `${BASE_URL}/api/busBooking/getAllBookings/${userId}`;
      console.log("API URL:", url);
      const res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store", // Explicitly disable caching for dynamic user data
      });

      if (res.ok) {
        const data = await res.json();
        console.log("API Response:", data);
        // Sort bookings: newest first
        const sortedBookings = (data.data || data.bookings || []).sort((a: any, b: any) => {
           return new Date(b.doj || b.departureDate).getTime() - new Date(a.doj || a.departureDate).getTime();
        });
        setBookings(sortedBookings);
      } else {
        setBookings([]);
        console.error("API Response not OK:", res.status, await res.text());
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  // 2. Initiate Cancel API (Dynamically routed based on provider)
  const handleInitiateCancel = async (booking: Booking) => {
    const bookingId = booking.id || booking._id; 
    if (!bookingId) return;

    const finalBlockKey = booking.blockKey || (booking as any).apipnrNo || ""; 
    const pnrNo = booking.pnr || (booking as any).pnrNumber || finalBlockKey;

    // 1. SMART PROVIDER DETECTION
    let provider = booking.apiProvider; 
    const opName = (booking.operatorName || (booking as any).busOperator || "").toUpperCase();
    
    if (!provider || provider === "EZEE") {
       if (finalBlockKey.toString().startsWith("TS") || opName.includes("SRS") || opName.includes("SIR") || (booking as any).isSrs) {
           provider = "SRS";
       } else if (opName.includes("VRL") || (booking as any).isVrl) {
           provider = "VRL";
       } else {
           provider = "EZEE";
       }
    }

    // 2. ROBUST SEAT EXTRACTION
    let seatsStr = "";
    const rawSeats = booking.seatNumbers || (booking as any).selectedSeats || (booking as any).ticketDetails || (booking as any).passengers || [];
    
    if (typeof rawSeats === 'string') {
      seatsStr = rawSeats.replace(/\s/g, ""); 
    } else if (Array.isArray(rawSeats)) {
      seatsStr = rawSeats.map((p: any) => 
        typeof p === 'string' ? p : (p?.seatName || p?.seatCode || p?.seat || p?.passenger?.seatName || p?.passenger?.seatCode)
      ).filter(Boolean).join(",");
    }

    if (provider === "VRL" && !pnrNo) {
      alert("PNR missing for VRL cancel");
      return;
    }

    if (provider === "SRS" && !finalBlockKey) {
      alert("BlockKey missing for SRS cancellation.");
      return;
    }

    if (provider === "SRS" && !seatsStr) {
      alert("Seat details missing for cancellation");
      return;
    }

    setIsProcessing(true);
    try {
      let endpoint = "";
      let options: any = {};

      if (provider === "VRL") {
        endpoint = `${BASE_URL}/api/busBooking/sendVrlRequest/CancelDetails`;
        options = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pnrNo })
        };
      } 
      else if (provider === "SRS") {
        endpoint = `${BASE_URL}/api/busBooking/getSrsCanCancelDetails/${finalBlockKey}/${seatsStr}`;
        options = { method: "GET" };
      }
      else {
        endpoint = `${BASE_URL}/api/bus/ezee/canCancelSeat/${bookingId}`;
        options = { method: "GET" };
      }

      const res = await fetch(endpoint, options);
      const rawData = await res.json().catch(() => ({}));
      const data = rawData.response || rawData.data || rawData;

      if (data.success === false || rawData.success === false) {
        alert(data.message || rawData.message || "❌ This ticket cannot be cancelled. It may be past departure time or non-refundable.");
        return;
      }

      const isSuccess = res.ok || data.status === 200 || data.status === 0 || data.success === true || !!data.result || !!rawData.result;

      if (isSuccess) {
        let extCca = data.cca ?? data.cancellation_charges ?? data.CancellationCharges ?? 0;
        let extRef = data.refundAmount ?? data.refund_amount ?? data.RefundAmount ?? 0;
        let extCtpc = data.ctpc ?? data.policy ?? "DEFAULT";

        if (provider === "SRS") {
          const resultObj = rawData.result || data.result;
          const srsData = resultObj?.is_ticket_cancellable || resultObj || data?.is_ticket_cancellable;
          
          if (srsData) {
            if (srsData.is_cancellable === false) {
              alert("❌ This ticket cannot be cancelled. It is non-refundable.");
              setIsProcessing(false);
              return;
            }
            extCca = srsData.cancellation_charges ?? srsData.cancellationCharges ?? extCca;
            extRef = srsData.refund_amount ?? srsData.refundAmount ?? extRef;
          }
        }

        if (provider === "VRL") {
          const vrlList = Array.isArray(data) ? data : (Array.isArray(rawData.data) ? rawData.data : []);
          if (vrlList.length > 0) {
            const vrlData = vrlList || vrlList; // handle array wrapper
            extRef = vrlData.RefundAmount ?? extRef;
            
            const calculatedCca = (vrlData.TotalFare !== undefined && vrlData.RefundAmount !== undefined) 
              ? (vrlData.TotalFare - vrlData.RefundAmount) 
              : extCca;
              
            extCca = vrlData.CancellationCharges ?? calculatedCca;
          }
        }
        
        if (provider === "EZEE") {
          extCca = data.cca ?? extCca;
          extCtpc = data.ctpc ?? extCtpc;
          if (!extRef && extCca) {
             const total = booking.totalFare || (booking as any).totalAmount || 0;
             extRef = Math.max(0, Number(total) - Number(extCca));
          }
        }

        setCancelPreview({
          bookingId: bookingId,
          apiProvider: provider,
          cca: String(extCca ?? "0"),
          ctpc: String(extCtpc),
          refundAmount: Number(extRef ?? 0),
          pnr: pnrNo,
          blockKey: finalBlockKey.toString(),
          seatNumbers: seatsStr
        });
        setSelectedBooking(null); // Close the detail modal
      } else {
        alert(data.message || "❌ This ticket cannot be cancelled. It may be past departure time or non-refundable.");
      }
    } catch (error) {
      console.error("Cancel API Error:", error);
      alert("Network error while trying to connect to cancellation server.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Confirm Cancel API 
  const handleConfirmCancel = async () => {
    if (!cancelPreview) return;

    if (cancelPreview.apiProvider === "EZEE" && (!cancelPreview.cca || !cancelPreview.ctpc)) {
       alert("Invalid cancel data received. Please contact support.");
       return;
    }

    if (cancelPreview.apiProvider === "SRS" && !cancelPreview.blockKey) {
       alert("Missing blockKey for SRS cancel");
       return;
    }

    setIsProcessing(true);
    try {
      let endpoint = "";
      let options: any = {};

      if (cancelPreview.apiProvider === "VRL") {
        endpoint = `${BASE_URL}/api/busBooking/sendVrlRequest/ConfirmCancellation`;
        options = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pnrNo: cancelPreview.pnr })
        };
      } 
      else if (cancelPreview.apiProvider === "SRS") {
        endpoint = `${BASE_URL}/api/busBooking/srsCancelBooking/${cancelPreview.blockKey}/${cancelPreview.seatNumbers}`;
        options = { method: "GET" };
      }
      else {
        endpoint = `${BASE_URL}/api/bus/ezee/confirmCancelSeat`;
        options = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: cancelPreview.bookingId,
            cca: cancelPreview.cca,
            ctpc: cancelPreview.ctpc
          })
        };
      }

      const res = await fetch(endpoint, options);
      const rawData = await res.json().catch(() => ({}));
      const data = rawData.response || rawData;

      const isSuccess = res.ok || data.success === true || data.status === 0 || data.status === 200 || !!data.result;

      if (isSuccess) {
        const targetBooking = bookings.find(b => (b.id || b._id) === cancelPreview.bookingId);
        
        // --- LOCAL DB UPDATE ---
        try {
          await fetch(`${BASE_URL}/api/busBooking/updateBooking/${cancelPreview.bookingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bookingStatus: "cancelled",
                status: "CANCELLED",
                totalRefundAmount: Number(cancelPreview.refundAmount),
                cancellationCharges: Number(cancelPreview.cca)
            })
          });

          if (targetBooking) {
            await fetch(`${BASE_URL}/api/busBooking/sendCancelTicketMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId: cancelPreview.bookingId,
                    customerName: targetBooking.passengerName || (targetBooking as any).customerName || 'Customer',
                    opPNR: cancelPreview.pnr || targetBooking.pnr || cancelPreview.blockKey,
                    sourceCity: targetBooking.from || (targetBooking as any).sourceCity,
                    destinationCity: targetBooking.to || (targetBooking as any).destinationCity,
                    selectedSeats: cancelPreview.seatNumbers,
                    doj: targetBooking.departureDate || (targetBooking as any).doj,
                    totalRefundAmount: cancelPreview.refundAmount,
                    to: (targetBooking as any).customerPhone,
                    type: "cancellation"
                })
            });
          }
        } catch (dbErr) {
          console.error("Local DB update failed:", dbErr);
        }

        alert("Ticket cancelled successfully.");
        setCancelPreview(null);
        
        // Update local state instantly and switch tab
        setBookings(prev => prev.map(b => (b.id || b._id) === cancelPreview.bookingId ? { ...b, status: 'cancelled', bookingStatus: 'cancelled' } : b));
        setActiveTab("Cancelled"); 
        
        // Soft refresh data
        fetchBookings(); 
      } else {
        alert(`Failed to confirm cancellation: ${data.message || rawData.message || 'Please try again.'}`);
      }
    } catch (error) {
      console.error("Confirm Cancel Error:", error);
      alert("Network error confirming cancellation.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Safe status checker
  const getSafeStatus = (b: any) => {
     const st = (b.status || b.bookingStatus || 'upcoming').toLowerCase();
     if (st === 'cancelled' || st === 'cancel') return 'cancelled';
     if (st === 'completed') return 'completed';
     return 'upcoming'; // treat paid/success/pending as upcoming in this UI context
  };

  const filtered = bookings.filter((b) => getSafeStatus(b) === activeTab.toLowerCase());
  const TABS = ["Upcoming", "Completed", "Cancelled"] as const;

  return (
    <div className="bus-page-container w-100" style={{ minHeight: "100vh", backgroundColor: "#f4f7f6" }}>
      
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-icon { animation: spin 0.8s linear infinite; display: inline-block; }
        
        .booking-card:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(13,43,76,0.08) !important; border-color: #00AEEF !important; }

        .tab-btn { background: transparent; border: none; padding: 16px 0; font-weight: 500; font-size: 16px; color: #adb5bd; border-bottom: 3px solid transparent; transition: all 0.2s; flex: 1; text-align: center; }
        .tab-btn.active { color: #00AEEF; border-bottom-color: #00AEEF; font-weight: 700; }
        
        /* Modal Styles - Responsive */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1050; padding: 20px; backdrop-filter: blur(4px); }
        .custom-modal { background: #fff; width: 100%; max-width: 650px; border-radius: 16px; padding: 32px; box-shadow: 0 15px 50px rgba(0,0,0,0.3); }
        .modal-route-title { font-size: 28px; }

        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @media (max-width: 768px) {
          .custom-modal { max-width: 100%; padding: 24px; border-radius: 20px; }
          .modal-route-title { font-size: 20px !important; }
        }

        .header-bg { background-color: #0D2B4C; color: white; padding: 16px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 100%; }
      `}</style>

      {/* ══ HEADER (Full Width) ══ */}
      <div className="header-bg sticky-top">
        <div className="container-fluid d-flex align-items-center px-4">
          <i className="bi bi-arrow-left fs-4 me-3" style={{ cursor: "pointer" }} onClick={() => router.push('/')}></i>
          <h5 className="mb-0 fw-normal" style={{ fontSize: "22px", letterSpacing: "0.5px" }}>My Bookings</h5>
        </div>
      </div>

      {/* ── Tabs (Full Width) ── */}
      <div className="bg-white sticky-top shadow-sm" style={{ top: "66px", zIndex: 1000 }}>
        <div className="container-fluid d-flex px-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="container-fluid py-4 px-3 px-md-5">
        {loading ? (
          <div className="text-center py-5 mt-5">
            <div className="spinner-border" style={{ color: "#0D2B4C", width: "3rem", height: "3rem" }}></div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onRefresh={fetchBookings} refreshing={refreshing} />
        ) : (
          <div className="row justify-content-center">
            <div className="col-12 col-xxl-10">
              {filtered.map((booking) => (
                <BookingCard 
                  key={booking.id || booking._id} 
                  booking={booking} 
                  onClick={(b) => setSelectedBooking(b)} 
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Primary Details Modal */}
      <TicketModal 
        booking={selectedBooking} 
        onClose={() => setSelectedBooking(null)} 
        onInitiateCancel={handleInitiateCancel}
        isProcessing={isProcessing}
      />

      {/* Cancel Confirmation Modal */}
      {cancelPreview && (
        <div className="modal-overlay" style={{ zIndex: 1060 }}>
          <div className="custom-modal slide-up text-center p-4">
            <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: "48px" }}></i>
            <h4 className="mt-3 fw-bold text-dark">Confirm Cancellation</h4>
            <p className="text-muted mt-2">Are you sure you want to cancel this ticket?</p>
            
            <div className="bg-light p-3 rounded mb-4 mt-3 border text-start">
              <div className="d-flex justify-content-between mb-2">
                <span>Cancellation Charges:</span>
                <strong>₹{cancelPreview.cca}</strong>
              </div>
              <div className="d-flex justify-content-between text-success">
                <span>Estimated Refund:</span>
                <strong>₹{cancelPreview.refundAmount}</strong>
              </div>
            </div>

            <div className="d-flex gap-3">
              <button className="btn btn-outline-secondary flex-grow-1" onClick={() => setCancelPreview(null)} disabled={isProcessing}>
                Keep Ticket
              </button>
              <button className="btn btn-danger flex-grow-1" onClick={handleConfirmCancel} disabled={isProcessing}>
                {isProcessing ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}