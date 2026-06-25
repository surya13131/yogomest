'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect, useRef } from 'react';

import { bookBusTicket, BASE_URL } from "../components/api"; 

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

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [status, setStatus] = useState<'initializing' | 'payment_open' | 'verifying' | 'success' | 'failed'>('initializing');
  const [errorMessage, setErrorMessage] = useState('');
  const [ticketData, setTicketData] = useState<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const hasTriggeredPayment = useRef(false);

  // Cancel Flow States
  const [cancelPreview, setCancelPreview] = useState<CancelPreview | null>(null);
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);

  const amount = searchParams.get('amount');
  const blockKey = searchParams.get('blockKey');
  const urlBookingId = searchParams.get('bookingId'); 

  const [userId, setUserId] = useState<string>("");
  const [realBookingId, setRealBookingId] = useState<string | null>(urlBookingId);

  useEffect(() => {
    const uId = searchParams.get("userId");
    const localUserId = localStorage.getItem("userId") || localStorage.getItem("_id");
    let resolvedUser = uId || localUserId || "";
    
    if (!resolvedUser || resolvedUser === "guest_user" || resolvedUser.length !== 24) {
      resolvedUser = "69412e89e1e82ea2792a99bb";
    }
    setUserId(resolvedUser);
  }, [searchParams]);

  useEffect(() => {
    const savedTicketStr = sessionStorage.getItem("savedTicketData") || localStorage.getItem("savedTicketData");
    let loaded = false;
    
    if (savedTicketStr) {
      try { 
        const parsed = JSON.parse(savedTicketStr);
        if (!urlBookingId || parsed._id === urlBookingId || parsed.id === urlBookingId || parsed.blockKey === blockKey || parsed.pnrNumber === blockKey) {
          setTicketData(parsed); 
          loaded = true;
        }
      } catch(e) {}
    } 
    
    if (!loaded) {
      const initialPayload = sessionStorage.getItem("currentBookingPayload") || localStorage.getItem("currentBookingPayload");
      if (initialPayload) {
        try { setTicketData(JSON.parse(initialPayload)); } catch(e) {}
      }
    }
  }, [urlBookingId, blockKey]);

  useEffect(() => {
    if (ticketData) {
      sessionStorage.setItem("savedTicketData", JSON.stringify(ticketData));
      localStorage.setItem("savedTicketData", JSON.stringify(ticketData));
    }
  }, [ticketData]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    if (scriptLoaded && urlBookingId && amount && blockKey && userId && !hasTriggeredPayment.current) {
      hasTriggeredPayment.current = true;
      handlePayment();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptLoaded, urlBookingId, amount, blockKey, userId]);

  const fetchFinalTicket = async (id: string, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(`/api/busBooking/getBookingById/${id}`);
        if (!res.ok) throw new Error("Failed to fetch final ticket from DB");
        
        const data = await res.json();
        const backendTicket = data?.data?.booking || data?.data || data?.booking || data;
        
        if (backendTicket && typeof backendTicket === 'object') {
          setTicketData((prev: any) => {
            const apiPax = backendTicket.passengers || backendTicket.inventoryItems || backendTicket.passengerDetails || backendTicket.ticketDetails;
            
            const isLocallyPaid = prev?.bookingStatus === 'paid' || prev?.status === 'paid';
            const isBackendPending = (backendTicket.bookingStatus?.toLowerCase() === 'pending' || backendTicket.status?.toLowerCase() === 'pending');
            
            return { 
              ...prev, 
              ...backendTicket,
              bookingStatus: (isLocallyPaid && isBackendPending) ? 'paid' : (backendTicket.bookingStatus || prev?.bookingStatus),
              status: (isLocallyPaid && isBackendPending) ? 'paid' : (backendTicket.status || prev?.status),
              passengers: apiPax?.length ? apiPax : prev?.passengers
            };
          });
          return; 
        }
      } catch (err) {
        if (i < retries - 1) {
          await new Promise(res => setTimeout(res, 1500)); 
        }
      }
    }
  };

  const handlePayment = async () => {
    let currentBookingId = realBookingId || urlBookingId;

    if (currentBookingId && sessionStorage.getItem(`payment_success_${currentBookingId}`)) {
      setStatus('success');
      fetchFinalTicket(currentBookingId);
      return;
    }

    setStatus('initializing');
    setErrorMessage('');

    if (!currentBookingId || !blockKey || !amount) { 
      setErrorMessage('Missing required Booking details. Please go back and try again.');
      setStatus('failed');
      return;
    }

    try {
      const isValidMongoId = (id: string) => /^[a-f\d]{24}$/i.test(id);

      if (!currentBookingId || !isValidMongoId(currentBookingId)) {
        const payloadStr = sessionStorage.getItem("currentBookingPayload") || localStorage.getItem("currentBookingPayload");
        if (!payloadStr) throw new Error("Booking session expired. Please search and select seats again.");
        
        const payloadData = JSON.parse(payloadStr);
        const bookRes = await bookBusTicket(payloadData);
        
        const dbId = 
          bookRes?.data?._id || 
          bookRes?.data?.booking?._id || 
          bookRes?.data?.id || 
          bookRes?.booking?._id || 
          bookRes?._id || 
          bookRes?.id ||
          bookRes?.data?.bookingId ||
          bookRes?.bookingId;
        
        if (!dbId) {
          throw new Error(`Booking failed - no DB ID returned: ${bookRes?.message || bookRes?.error || 'Unknown error'}`);
        }
        
        currentBookingId = dbId;
        setRealBookingId(dbId);

        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("bookingId", dbId);
        window.history.replaceState({}, '', newUrl.toString());
      }

      const keyRes = await fetch(`/api/getkey`);
      const keyData = await keyRes.json();
      const razorpayKey = keyData.key;

      const orderRes = await fetch(`/api/payment/v2/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), bookingId: currentBookingId, blockId: blockKey, Id: userId })
      });
      const orderData = await orderRes.json();

      if (!orderData.success) throw new Error(orderData.message || 'Failed to create order. Seats might be expired.');

      setStatus('payment_open');
      const options = {
        key: razorpayKey,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'YesGoBus',
        description: `Booking PNR: ${blockKey}`,
        order_id: orderData.order.id,
        handler: async function (response: any) {
          setStatus('verifying');
          try {
            const verifyRes = await fetch(`/api/payment/v2/paymentverification`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });
            
            const verifyData = await verifyRes.json();

            if (verifyData.success || verifyData.status === 200 || verifyData.status === 'success') {
              sessionStorage.setItem(`payment_success_${currentBookingId}`, "true");
              setTicketData((prev: any) => ({ ...prev, bookingStatus: 'paid', status: 'paid' }));
              await fetchFinalTicket(currentBookingId as string); 
              setStatus('success');
            } else {
              setErrorMessage(`Verification failed: ${verifyData.message || 'Please contact support.'}`);
              setStatus('failed');
            }
          } catch (err) {
            setErrorMessage('Network error during verification. Your money is safe, please contact support.');
            setStatus('failed');
          }
        },
        prefill: {
          name: localStorage.getItem('name') || ticketData?.customerName || 'Customer',
          email: localStorage.getItem('email') || ticketData?.customerEmail || 'customer@yesgobus.com',
          contact: localStorage.getItem('phone') || ticketData?.customerPhone || '9999999999'
        },
        theme: { color: '#003366' }, 
        modal: {
          ondismiss: function() {
            setErrorMessage('Payment window was closed.');
            setStatus('failed');
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setErrorMessage(`Payment failed: ${response.error.description}`);
        setStatus('failed');
      });
      rzp.open();

    } catch (error: any) {
      setErrorMessage(error.message || 'Something went wrong starting the payment.');
      setStatus('failed');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'YesGoBus Ticket',
          text: `My YesGoBus Ticket PNR: ${ticketData?.pnrNumber || blockKey}. Boarding at ${ticketData?.pickUpTime}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      alert("Sharing is not supported on this device/browser.");
    }
  };

  // ==========================================
  // MULTI-PROVIDER CANCEL FLOW
  // ==========================================
  const handleInitiateCancel = async () => {
    const currentBookingId = ticketData?._id || ticketData?.id || realBookingId || urlBookingId;
    if (!currentBookingId) return;
    
    const finalBlockKey = ticketData?.blockKey || ticketData?.pnrNumber || blockKey || ""; 
    const pnrNo = ticketData?.pnrNumber || finalBlockKey;
    
    let provider = ticketData?.apiProvider;
    const opName = (ticketData?.busOperator || ticketData?.operatorName || "").toUpperCase();

    // Provider Detection
    if (!provider || provider === "EZEE") {
      if (pnrNo.startsWith("TS") || opName.includes("SRS") || opName.includes("SIR")) provider = "SRS";
      else if (opName.includes("VRL") || ticketData?.isVrl) provider = "VRL";
      else provider = "EZEE";
    }
    
    const paxArray = ticketData?.ticketDetails || ticketData?.passengers || ticketData?.inventoryItems || ticketData?.reservationSchema?.paxDetails || [];
    let seatsStr = ticketData?.selectedSeats || "";
    
    if (!seatsStr) {
      if (typeof paxArray === 'string') {
        seatsStr = paxArray.replace(/\s/g, ""); 
      } else if (Array.isArray(paxArray)) {
        seatsStr = paxArray.map((p: any) => 
          typeof p === 'string' ? p : (p?.seatName || p?.seatCode || p?.seat || p?.passenger?.seatName || p?.passenger?.seatCode)
        ).filter(Boolean).join(",");
      }
    }

    if (provider === "VRL" && !pnrNo) return alert("Missing PNR for VRL cancellation.");
    if (provider === "SRS" && !finalBlockKey) return alert("Missing blockKey/PNR for SRS cancellation.");
    if (provider === "SRS" && !seatsStr) return alert("Missing seat details for SRS cancellation.");

    setIsProcessingCancel(true);
    try {
      let endpoint = "";
      let options: any = {};

      if (provider === "VRL") {
        endpoint = `${BASE_URL}/api/busBooking/sendVrlRequest/CancelDetails`;
        options = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pnrNo }) };
      } else if (provider === "SRS") {
        endpoint = `${BASE_URL}/api/busBooking/getSrsCanCancelDetails/${finalBlockKey}/${seatsStr}`;
        options = { method: "GET" };
      } else {
        endpoint = `${BASE_URL}/api/bus/ezee/canCancelSeat/${currentBookingId}`;
        options = { method: "GET" };
      }

      const res = await fetch(endpoint, options);
      const rawData = await res.json().catch(() => ({})); 
      
      const data = rawData.response || rawData.data || rawData;

      if (data.success === false || rawData.success === false) {
        alert(data.message || rawData.message || "❌ This ticket cannot be cancelled. It may be past departure time or non-refundable.");
        return;
      }

      const isSuccess = res.ok || data.success === true || data.status === 0 || data.status === 200 || !!data.result || !!rawData.result;

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
              setIsProcessingCancel(false);
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

        // LEAVING THIS EXACTLY AS PROVIDED - WILL NOT CHANGE
        if (!extRef || extRef === 0) {
           const total = ticketData?.totalAmount || amount || ticketData?.totalFare || 0;
           const numericCca = Number(extCca || 0);
           extRef = Math.max(0, Number(total) - numericCca);
        }

        setCancelPreview({
          bookingId: currentBookingId,
          apiProvider: provider,
          cca: String(extCca ?? "0"),
          ctpc: String(extCtpc),
          refundAmount: Number(extRef ?? 0),
          pnr: pnrNo,
          blockKey: finalBlockKey.toString(),
          seatNumbers: seatsStr
        });
      } else {
        alert(data.message || "❌ This ticket cannot be cancelled. It may be past departure time or non-refundable.");
      }
    } catch (error) {
      console.error("Cancel API Error:", error);
      alert("Network error connecting to cancellation server.");
    } finally {
      setIsProcessingCancel(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelPreview) return;
    
    if (cancelPreview.apiProvider === "EZEE" && (!cancelPreview.cca || !cancelPreview.ctpc)) {
       alert("Invalid cancel data received from server. Cannot proceed.");
       return;
    }

    if (cancelPreview.apiProvider === "SRS" && !cancelPreview.blockKey) {
       alert("Missing blockKey for SRS cancel");
       return;
    }

    setIsProcessingCancel(true);
    try {
      let endpoint = "";
      let options: any = {};

      if (cancelPreview.apiProvider === "VRL") {
        endpoint = `${BASE_URL}/api/busBooking/sendVrlRequest/ConfirmCancellation`;
        options = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pnrNo: cancelPreview.pnr }) };
      } else if (cancelPreview.apiProvider === "SRS") {
        endpoint = `${BASE_URL}/api/busBooking/srsCancelBooking/${cancelPreview.blockKey}/${cancelPreview.seatNumbers}`;
        options = { method: "GET" };
      } else {
        endpoint = `${BASE_URL}/api/bus/ezee/confirmCancelSeat`;
        options = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId: cancelPreview.bookingId, cca: cancelPreview.cca, ctpc: cancelPreview.ctpc }) };
      }

      const res = await fetch(endpoint, options);
      const rawData = await res.json().catch(() => ({}));
      const data = rawData.response || rawData;

      if (res.ok || data.success === true || data.status === 0 || data.status === 200 || !!data.result) {
        
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

          await fetch(`${BASE_URL}/api/busBooking/sendCancelTicketMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bookingId: cancelPreview.bookingId,
                customerName: ticketData?.customerName || 'Customer',
                opPNR: cancelPreview.pnr || ticketData?.pnrNumber || cancelPreview.blockKey,
                sourceCity: ticketData?.sourceCity,
                destinationCity: ticketData?.destinationCity,
                selectedSeats: cancelPreview.seatNumbers,
                doj: ticketData?.doj,
                totalRefundAmount: cancelPreview.refundAmount,
                to: ticketData?.customerPhone,
                type: "cancellation"
            })
          });
        } catch (dbErr) {
          console.error("Warning: Successfully cancelled with provider, but failed to update local DB status.", dbErr);
        }

        alert("Ticket cancelled successfully.");
        setCancelPreview(null);
        
        // Ensure local ticket state is saved as cancelled before we navigate away
        const updatedTicket = { ...ticketData, status: 'cancelled', bookingStatus: 'cancelled' };
        setTicketData(updatedTicket);
        sessionStorage.setItem("savedTicketData", JSON.stringify(updatedTicket));
        localStorage.setItem("savedTicketData", JSON.stringify(updatedTicket));
        
        // ✅ FIX: Force a hard browser redirect to completely jump to My Bookings and force the tab update
        window.location.href = '/my-bookings?tab=cancelled';
        
      } else {
        alert(`Failed to confirm cancellation: ${data.message || rawData.message || 'Please try again.'}`);
      }
    } catch (error) {
      console.error("Confirm Cancel Error:", error);
      alert("Network error confirming cancellation.");
    } finally {
      setIsProcessingCancel(false);
    }
  };

  // ==========================================
  // LOADING / VERIFYING STATE
  // ==========================================
  if (status === 'initializing' || status === 'verifying') {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-white px-3 text-center">
        <div className="spinner-border" style={{ width: '3rem', height: '3rem', color: '#003366' }} role="status"></div>
        <h4 className="mt-4 fw-bold text-dark">
          {status === 'initializing' ? 'Opening secure payment gateway...' : 'Verifying your payment...'}
        </h4>
        <p className="text-muted mt-2 small">Please do not refresh or close this page.</p>
      </div>
    );
  }

  // ==========================================
  // SUCCESS STATE (TICKET VIEW)
  // ==========================================
  if (status === 'success') {
    
    const paxArray = ticketData?.ticketDetails || ticketData?.passengers || ticketData?.inventoryItems || ticketData?.reservationSchema?.paxDetails || [];
    
    const boardingAddress = ticketData?.ezeeBlockSeatDetails?.boardingPoint?.name 
      || ticketData?.boardingPoint?.name 
      || ticketData?.boardingPoint 
      || "---";
      
    const droppingAddress = ticketData?.ezeeBlockSeatDetails?.droppingPoint?.name 
      || ticketData?.droppingPoint?.name 
      || ticketData?.droppingPoint 
      || "---";

    const currentBookingStatus = (ticketData?.bookingStatus || ticketData?.status || "pending").toLowerCase();
    
    const isCancelled = currentBookingStatus === 'cancelled' || currentBookingStatus === 'cancel';
    
    const hasPaidSession = sessionStorage.getItem(`payment_success_${ticketData?._id || ticketData?.id || realBookingId || urlBookingId}`) === "true";
    const isPaid = !isCancelled && (currentBookingStatus === 'paid' || currentBookingStatus === 'completed' || currentBookingStatus === 'success' || hasPaidSession);
    
    const badgeText = isCancelled ? 'CANCELLED' : isPaid ? 'PAID' : 'PENDING';
    const badgeColor = isCancelled ? '#F44336' : isPaid ? '#4CAF50' : '#FF9800';

    const navyBlue = '#003366';
    const termsBlue = '#217DBB';
    const borderGray = '#444444';

    return (
      <div className="bg-light pb-5 large-screen-container" style={{ minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * { visibility: hidden; }
            .print-section, .print-section * { visibility: visible; }
            .print-section { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
            .no-print { display: none !important; }
            .bg-light { background-color: #f8f9fa !important; }
          }
          .custom-border { border: 1px solid ${borderGray} !important; }
          .border-bottom-dark { border-bottom: 1px solid ${borderGray} !important; }
          .border-end-dark { border-right: 1px solid ${borderGray} !important; }
          
          /* Modal Styles for Cancellation */
          .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1050; padding: 20px; backdrop-filter: blur(4px); }
          .custom-modal { background: #fff; width: 100%; max-width: 500px; border-radius: 16px; padding: 32px; box-shadow: 0 15px 50px rgba(0,0,0,0.3); }
          @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
          .slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        `}} />

        <div className="d-flex align-items-center px-3 py-3 bg-white no-print">
          <div style={{ cursor: 'pointer' }} onClick={() => router.back()}>
            <i className="bi bi-arrow-left fs-4 text-dark"></i>
          </div>
          <h5 className="ms-3 mb-0" style={{ fontWeight: '400' }}>Ticket Details</h5>
        </div>

        <div className="container px-2 px-md-3 mt-3 print-section" style={{ maxWidth: '1500px', margin: '0 auto' }}>
          
          <div className="container-fluid d-flex justify-content-between align-items-center p-3 mb-4" style={{ backgroundColor: navyBlue, color: 'white' }}>
            <h3 className="mb-0 fw-bold">YesGoBus</h3>
            <div className="text-end" style={{ fontSize: '11px', lineHeight: '1.4' }}>
              <div>support@yesgobus.com</div>
              <div style={{ color: '#F0A500', fontWeight: 'bold' }}>9888417555</div>
            </div>
          </div>

          <div className="mb-4 bg-white custom-border" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div className="d-flex justify-content-between align-items-center p-3" style={{ backgroundColor: navyBlue, color: 'white' }}>
              <div>
                <div style={{ fontSize: '10px', opacity: 0.9 }}>FROM</div>
                <div className="fw-medium">{ticketData?.sourceCity || ticketData?.fromCity || "---"}</div>
              </div>
              <div className="d-flex align-items-center">
                <div style={{ width: '5px', height: '5px', backgroundColor: 'white', borderRadius: '50%' }}></div>
                <i className="bi bi-bus-front-fill mx-2 fs-5"></i>
                <i className="bi bi-arrow-right fs-5"></i>
              </div>
              <div className="text-end">
                <div style={{ fontSize: '10px', opacity: 0.9 }}>TO</div>
                <div className="fw-medium">{ticketData?.destinationCity || ticketData?.toCity || "---"}</div>
              </div>
            </div>

            <div className="bg-white">
              <div className="row g-0 border-bottom-dark text-center">
                <div className="col-6 p-2 border-end-dark">
                  <div style={{ fontSize: '10px', fontWeight: '600', marginBottom: '2px' }}>REPORTING TIME</div>
                  <div style={{ fontSize: '12px' }}>{ticketData?.reportingTime || ticketData?.pickUpTime || "---"} - {ticketData?.doj || ticketData?.travelDate || "---"}</div>
                </div>
                <div className="col-6 p-2">
                  <div style={{ fontSize: '10px', fontWeight: '600', marginBottom: '2px' }}>DEPARTURE TIME</div>
                  <div style={{ fontSize: '12px' }}>{ticketData?.pickUpTime || "---"} - {ticketData?.doj || ticketData?.travelDate || "---"}</div>
                </div>
              </div>
              
              <div className="row g-0 border-bottom-dark">
                <div className="col-6 p-2 border-end-dark">
                  <div style={{ fontSize: '10px', fontWeight: '600', marginBottom: '2px' }}>BUS TYPE</div>
                  <div style={{ fontSize: '13px' }}>{ticketData?.busOperator || ticketData?.operatorName || "---"}</div>
                  <div style={{ fontSize: '12px', color: '#555' }}>{ticketData?.busType || "---"}</div>
                </div>
                <div className="col-6 p-2 text-end d-flex flex-column justify-content-center">
                  <div style={{ fontSize: '10px', fontWeight: '600', marginBottom: '2px' }}>PNR NO</div>
                  <div style={{ fontSize: '13px' }}>{ticketData?.pnrNumber || blockKey || "---"}</div>
                  <div className="fw-bold mt-1" style={{ fontSize: '11px', color: badgeColor, letterSpacing: '0.5px' }}>
                    {badgeText}
                  </div>
                </div>
              </div>

              <div className="row g-0">
                <div className="col-6 p-2 border-end-dark">
                  <div style={{ fontSize: '10px', fontWeight: '600', marginBottom: '2px' }}>BOARDING</div>
                  <div style={{ fontSize: '12px' }}>{boardingAddress}</div>
                </div>
                <div className="col-6 p-2">
                  <div style={{ fontSize: '10px', fontWeight: '600', marginBottom: '2px' }}>DROPPING</div>
                  <div style={{ fontSize: '12px' }}>{droppingAddress}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4 bg-white custom-border" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div className="p-3" style={{ backgroundColor: navyBlue, color: 'white' }}>
              <h6 className="mb-0 fw-medium">Passenger Details</h6>
            </div>
            
            <div className="bg-white">
              <div className="row g-0 border-bottom-dark">
                <div className="col-8 p-3 border-end-dark">
                  <div style={{ fontSize: '10px', fontWeight: '600', marginBottom: '2px' }}>EMAIL ID</div>
                  <div style={{ fontSize: '13px', wordBreak: 'break-all' }}>{ticketData?.customerEmail || ticketData?.passengerEmail || localStorage.getItem('email') || "---"}</div>
                </div>
                <div className="col-4 p-3 text-end">
                  <div style={{ fontSize: '10px', fontWeight: '600', marginBottom: '2px' }}>CONTACT NO.</div>
                  <div style={{ fontSize: '13px' }}>{ticketData?.customerPhone || ticketData?.passengerMobile || localStorage.getItem('phone') || "---"}</div>
                </div>
              </div>
              
              <table className="table mb-0 text-center align-middle" style={{ fontSize: '13px', borderBottom: 'none' }}>
                <thead style={{ borderBottom: `1px solid ${borderGray}` }}>
                  <tr>
                    <th style={{ borderRight: `1px solid ${borderGray}`, borderBottom: 'none', padding: '10px 5px', fontWeight: '600' }}>Traveller Name</th>
                    <th style={{ borderRight: `1px solid ${borderGray}`, borderBottom: 'none', padding: '10px 5px', fontWeight: '600' }}>Gender</th>
                    <th style={{ borderRight: `1px solid ${borderGray}`, borderBottom: 'none', padding: '10px 5px', fontWeight: '600' }}>Age</th>
                    <th style={{ borderBottom: 'none', padding: '10px 5px', fontWeight: '600' }}>Seat NO.</th>
                  </tr>
                </thead>
                <tbody>
                  {paxArray.length > 0 ? (
                    paxArray.map((pax: any, index: number) => {
                      const actualPax = pax?.passenger || pax;
                      
                      const paxName = actualPax?.passengerName || actualPax?.name || actualPax?.paxName || ticketData?.customerName || "---";
                      const seatNo = actualPax?.seatName || actualPax?.seatCode || actualPax?.seat_number || actualPax?.seatId || ticketData?.selectedSeats || ticketData?.seats || "---";

                      let localMatch: any = null;

                      if (typeof window !== "undefined") {
                        try {
                          const localPaxData = JSON.parse(localStorage.getItem('localPassengerDetails') || '[]');
                          localMatch = localPaxData.find(
                            (lp: any) =>
                              lp.seatId === seatNo ||
                              lp.name === paxName
                          ) || localPaxData[0];
                        } catch (e) {}
                      }

                      const paxAge =
                        actualPax?.passengerAge ||
                        actualPax?.age ||
                        actualPax?.paxAge ||
                        localMatch?.age ||
                        "";
                      let paxGender =
                        actualPax?.passengerGender ||
                        actualPax?.passengerGendar ||
                        actualPax?.gender ||
                        actualPax?.sex ||
                        localMatch?.gender ||
                        "";

                      // Normalize gender to full word if it's a single character
                      if (typeof paxGender === 'string' && paxGender.length === 1) {
                        if (paxGender.toLowerCase() === 'm') paxGender = 'Male';
                        if (paxGender.toLowerCase() === 'f') paxGender = 'Female';
                      }

                      return (
                        <tr key={index}>
                          <td style={{ borderRight: `1px solid ${borderGray}`, borderBottom: 'none', padding: '10px 5px' }}>
                            {paxName}
                          </td>
                          <td style={{ borderRight: `1px solid ${borderGray}`, borderBottom: 'none', padding: '10px 5px', textTransform: 'capitalize' }}>
                            {paxGender}
                          </td>
                          <td style={{ borderRight: `1px solid ${borderGray}`, borderBottom: 'none', padding: '10px 5px' }}>
                            {paxAge}
                          </td>
                          <td style={{ borderBottom: 'none', padding: '10px 5px' }}>
                            {seatNo}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    (() => {
                      const localPax = JSON.parse(
                        (typeof window !== "undefined" && localStorage.getItem("localPassengerDetails")) || "[]"
                      );
                      const p = localPax[0] || {};
                      return (
                        <tr>
                          <td style={{ borderRight: `1px solid ${borderGray}`, borderBottom: 'none', padding: '10px 5px' }}>{p.name || ticketData?.customerName}</td>
                          <td style={{ borderRight: `1px solid ${borderGray}`, borderBottom: 'none', padding: '10px 5px', textTransform: 'capitalize' }}>{p.gender}</td>
                          <td style={{ borderRight: `1px solid ${borderGray}`, borderBottom: 'none', padding: '10px 5px' }}>{p.age}</td>
                          <td style={{ borderBottom: 'none', padding: '10px 5px' }}>{p.seatId || ticketData?.selectedSeats}</td>
                        </tr>
                      );
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-4 bg-white custom-border" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div className="p-3" style={{ backgroundColor: navyBlue, color: 'white' }}>
              <h6 className="mb-0 fw-medium">Payment Details</h6>
            </div>
            
            <div className="bg-white">
              <table className="table mb-0 text-center align-middle" style={{ fontSize: '13px' }}>
                <thead style={{ borderBottom: `1px solid ${borderGray}` }}>
                  <tr>
                    <th style={{ borderRight: `1px solid ${borderGray}`, borderBottom: 'none', padding: '10px 5px', fontWeight: '600' }}>Base Fare<br/>(RS)</th>
                    <th style={{ borderRight: `1px solid ${borderGray}`, borderBottom: 'none', padding: '10px 5px', fontWeight: '600' }}>Discount<br/>(RS)</th>
                    <th style={{ borderRight: `1px solid ${borderGray}`, borderBottom: 'none', padding: '10px 5px', fontWeight: '600' }}>GST<br/>(RS)</th>
                    <th style={{ borderBottom: 'none', padding: '10px 5px', fontWeight: '600' }}>Total<br/>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ borderRight: `1px solid ${borderGray}`, borderBottom: 'none', padding: '15px 5px' }}>{ticketData?.baseFare || ticketData?.totalAmount || amount || 0}</td>
                    <td style={{ borderRight: `1px solid ${borderGray}`, borderBottom: 'none', padding: '15px 5px' }}>{ticketData?.discount || 0}</td>
                    <td style={{ borderRight: `1px solid ${borderGray}`, borderBottom: 'none', padding: '15px 5px' }}>{ticketData?.gst || ticketData?.serviceTax || 0}</td>
                    <td style={{ borderBottom: 'none', padding: '15px 5px', fontWeight: 'bold' }}>RS. {ticketData?.totalAmount || amount}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-2" style={{ fontSize: '11px', color: '#444' }}>
            <h6 className="fw-medium mb-2" style={{ color: termsBlue, fontSize: '14px' }}>Terms and Conditions</h6>
            <ul className="list-unstyled mb-4" style={{ paddingLeft: '0' }}>
              <li className="mb-2 d-flex"><span className="me-2">•</span> YesGoBus Travellers can book bus tickets online at the lowest ticket fares. Travellers prefer to choose their favorite bus to reserve online bus booking.</li>
              <li className="mb-2 d-flex"><span className="me-2">•</span> You are at the right place to find a wide range of Private buses and SRTC (State Road Transport Corporation) buses are available for bus booking online.</li>
              <li className="mb-2 d-flex"><span className="me-2">•</span> Passengers should arrive at least 15 min before the scheduled time of departure.</li>
              <li className="mb-2 d-flex"><span className="me-2">•</span> YesGoBus is not responsible for any accident or any passenger losses.</li>
              <li className="mb-2 d-flex"><span className="me-2">•</span> Cancellation charges are applicable on the original fare but not available on discount.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="d-flex justify-content-center flex-wrap gap-3 mt-4 mb-5 no-print">
            <button 
              onClick={() => window.print()} 
              className="btn text-white" 
              style={{ backgroundColor: '#2196F3', borderRadius: '25px', padding: '10px 25px', fontSize: '14px', fontWeight: '500' }}
            >
              <i className="bi bi-download me-2"></i> Download PDF
            </button>
            <button 
              onClick={handleShare} 
              className="btn text-white" 
              style={{ backgroundColor: '#4CAF50', borderRadius: '25px', padding: '10px 25px', fontSize: '14px', fontWeight: '500' }}
            >
              <i className="bi bi-share me-2"></i> Share PDF
            </button>

            {!isCancelled && (
              <button 
                onClick={handleInitiateCancel} 
                disabled={isProcessingCancel}
                className="btn text-white" 
                style={{ backgroundColor: '#F44336', borderRadius: '25px', padding: '10px 25px', fontSize: '14px', fontWeight: '500' }}
              >
                {isProcessingCancel ? (
                  <span className="spinner-border spinner-border-sm me-2"></span>
                ) : (
                  <i className="bi bi-x-circle me-2"></i>
                )}
                {isProcessingCancel ? "Processing..." : "Cancel Ticket"}
              </button>
            )}
          </div>
          
        </div>

        {/* Cancellation Confirmation Modal Popup */}
        {cancelPreview && (
          <div className="modal-overlay no-print" style={{ zIndex: 1060 }}>
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
                <button 
                  className="btn btn-outline-secondary flex-grow-1" 
                  onClick={() => setCancelPreview(null)} 
                  disabled={isProcessingCancel}
                >
                  Keep Ticket
                </button>
                <button 
                  className="btn btn-danger flex-grow-1" 
                  onClick={handleConfirmCancel} 
                  disabled={isProcessingCancel}
                >
                  {isProcessingCancel ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ==========================================
  // PAYMENT FAILED / CANCELLED STATE
  // ==========================================
  return (
    <div className="container py-5 d-flex justify-content-center align-items-center px-3" style={{ minHeight: '80vh' }}>
      <div className="card shadow-lg border-0 rounded-4 p-4 text-center" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="mb-3">
          <i className="bi bi-exclamation-circle-fill text-danger" style={{ fontSize: '3.5rem' }}></i>
        </div>
        <h4 className="fw-bold text-dark mb-2">Payment Failed</h4>
        <p className="text-muted mb-4 small px-2">
          {errorMessage || 'Your payment was cancelled or failed. Your seats are still blocked temporarily.'}
        </p>
        
        <div className="bg-light p-3 rounded-3 mb-4 text-start border shadow-sm">
          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted small fw-medium">Amount Due</span>
            <span className="fw-bold text-dark">₹{amount}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted small fw-medium">Booking Ref</span>
            <span className="fw-bold text-dark small text-uppercase">{urlBookingId?.slice(-6) || blockKey?.slice(-6) || 'N/A'}</span>
          </div>
        </div>

        <div className="d-flex flex-column gap-2">
          <button 
            onClick={() => { hasTriggeredPayment.current = false; handlePayment(); }} 
            className="btn text-white w-100 py-3 fw-bold shadow-sm d-flex justify-content-center align-items-center gap-2"
            style={{ backgroundColor: '#003366', borderRadius: '8px' }}
          >
            <i className="bi bi-arrow-clockwise"></i> Retry Payment
          </button>
          
          <button 
            onClick={() => router.back()} 
            className="btn btn-light w-100 py-3 text-muted fw-bold border"
            style={{ borderRadius: '8px' }}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="vh-100 d-flex justify-content-center align-items-center"><div className="spinner-border" style={{color: '#003366'}}></div></div>}>
      <CheckoutContent />
    </Suspense>
  );
}