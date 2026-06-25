"use client";
import React, { useEffect } from 'react';
import { NormalizedSeat } from "./seat";

interface Step3Props {
  contactPhone: string;
  setContactPhone: (val: string) => void;
  contactEmail: string;
  setContactEmail: (val: string) => void;
  contactState: string;
  setContactState: (val: string) => void;
  passengers: any[];
  handlePaxChange: (index: number, field: string, value: string) => void;
  showSuggestions: number | null;
  setShowSuggestions: (val: number | null) => void;
  savedPassengers: any[];
  insurance: boolean | null;
  setInsurance: (val: boolean | null) => void;
  hasGst: boolean;
  setHasGst: (val: boolean) => void;
  gstDetails: { name: string; gstId: string; address: string };
  setGstDetails: (val: any) => void;
  selectedSeats: NormalizedSeat[];
  busType: string;
}

export default function Step3PassengerInfo({
  contactPhone, setContactPhone, contactEmail, setContactEmail, contactState, setContactState,
  passengers, handlePaxChange, showSuggestions, setShowSuggestions, savedPassengers,
  insurance, setInsurance, hasGst, setHasGst, gstDetails, setGstDetails, selectedSeats, busType
}: Step3Props) {

  // ✅ Forcefully clean auto-filled or initial phone numbers containing +91 or 91
  useEffect(() => {
    if (contactPhone && /^(\+91\s*|91\s*)/.test(contactPhone)) {
      setContactPhone(contactPhone.replace(/^(\+91\s*|91\s*)/, ''));
    }
  }, [contactPhone, setContactPhone]);

  const figmaBoxStyle = {
    backgroundColor: "transparent",
    border: "1px solid #777777",
    borderRadius: "33px",
    padding: "32px",
    fontFamily: "'Poppins', sans-serif"
  };

  const figmaInputStyle = {
    backgroundColor: "transparent",
    border: "1px solid #777777",
    borderRadius: "8px",
    boxShadow: "none",
    color: "#333",
    fontSize: "14px",
    padding: "12px 16px"
  };

  const figmaLabelStyle = {
    color: "#676767", 
    fontWeight: 500, 
    fontSize: "16px",
    fontFamily: "'Poppins', sans-serif",
    marginBottom: "4px"
  };

  const figmaTextStyle = {
    color: "#676767",
    fontSize: "14px"
  };

  return (
    <div className="row g-4 w-100 mx-0 justify-content-center">
      <div className="col-12 col-lg-6">
        <div style={figmaBoxStyle} className="mb-4">
          <h5 style={figmaLabelStyle} className="text-dark">Contact details</h5>
          <p style={figmaTextStyle} className="mb-4">Ticket details will be sent to</p>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <div className="input-group">
                <span className="input-group-text fw-medium" style={{ backgroundColor: "transparent", border: "1px solid #777777", borderRight: "none", borderTopLeftRadius: "8px", borderBottomLeftRadius: "8px", color: "#333", fontSize: "14px" }}>+91 (IND)</span>
                {/* ✅ FIX: Force value to strip double +91 visually and on typing */}
                <input 
                  type="tel" 
                  className="form-control shadow-none" 
                  placeholder="Phone *" 
                  value={contactPhone?.replace(/^(\+91\s*|91\s*)/, '') || ''} 
                  onChange={(e) => {
                    const cleanedPhone = e.target.value.replace(/^(\+91\s*|91\s*)/, '');
                    setContactPhone(cleanedPhone);
                  }} 
                  style={{ backgroundColor: "transparent", border: "1px solid #777777", borderLeft: "none", borderTopRightRadius: "8px", borderBottomRightRadius: "8px", fontSize: "14px", color: "#333", paddingLeft: "0" }} 
                />
              </div>
            </div>
            <div className="col-12 col-md-6">
              <input type="email" className="form-control shadow-none" placeholder="Email ID" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} style={figmaInputStyle} />
            </div>
            <div className="col-12">
              <select className="form-select shadow-none" value={contactState} onChange={(e) => setContactState(e.target.value)} style={{...figmaInputStyle, color: contactState ? "#333" : "#676767"}}>
                <option value="">State of Residence *</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi">Delhi</option>
              </select>
            </div>
            <div className="col-12 mt-2">
              <span style={{ fontSize: "12px", color: "#676767" }}>Required for GST Tax Invoicing</span>
            </div>
          </div>
        </div>

        <div style={figmaBoxStyle} className="mb-4">
          <h5 style={figmaLabelStyle} className="text-dark">Passenger details</h5>
          {passengers.map((pax, index) => {
            
            const filteredSuggestions = pax.name
              ? savedPassengers
                  .filter(sp => sp.name.toLowerCase().includes(pax.name.toLowerCase()))
                  .slice(0, 5)
              : [];

            return (
              <div key={pax.seatId} className={index !== passengers.length - 1 ? "mb-4 pb-4 border-bottom" : ""}>
                <p style={figmaTextStyle} className="mb-3">Seat details - {pax.seatId}</p>
                
                <div className="row g-3 mb-3">
                  <div className="col-12 position-relative">
                    <input 
                      type="text" 
                      className="form-control shadow-none w-100" 
                      placeholder="Name *" 
                      value={pax.name} 
                      onChange={(e) => handlePaxChange(index, 'name', e.target.value)} 
                      onFocus={() => setShowSuggestions(index)}
                      onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                      style={figmaInputStyle} 
                    />
                    {showSuggestions === index && filteredSuggestions.length > 0 && (
                      <div className="position-absolute w-100 bg-white border rounded shadow-sm" style={{ zIndex: 10, top: '100%', left: 0, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                        {filteredSuggestions.map((sp, spIdx) => (
                          <div
                            key={spIdx}
                            className="p-3 border-bottom d-flex flex-column"
                            style={{ cursor: 'pointer', fontSize: '14px', lineHeight: '1.4' }}
                            onMouseDown={() => {
                              handlePaxChange(index, 'name', sp.name);
                              handlePaxChange(index, 'age', sp.age);
                              handlePaxChange(index, 'gender', sp.gender);
                              setShowSuggestions(null);
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div className="fw-bold text-dark">{sp.name}</div>
                            <div className="text-muted" style={{ fontSize: '12px' }}>{sp.age} yrs • {sp.gender}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-12">
                    <input type="number" className="form-control shadow-none w-100" placeholder="Age *" value={pax.age} onChange={(e) => handlePaxChange(index, 'age', e.target.value)} style={figmaInputStyle} />
                  </div>
                </div>
                <div className="d-flex flex-column gap-2 mt-2">
                  <span style={{ fontSize: "14px", color: "#676767" }}>Gender *</span>
                  <div className="d-flex gap-3 w-100">
                    <label className="btn py-2 text-center" style={{ flex: 1, border: pax.gender === 'Male' ? '1px solid #333' : '1px solid #777777', backgroundColor: "transparent", color: pax.gender === 'Male' ? '#000' : '#676767', borderRadius: "8px", fontSize: "14px", fontWeight: pax.gender === 'Male' ? '500' : 'normal', cursor: "pointer" }}>
                      <input type="radio" className="d-none" name={`gender-${index}`} value="Male" onChange={() => handlePaxChange(index, 'gender', 'Male')} /> 
                      Male
                    </label>
                    <label className="btn py-2 text-center" style={{ flex: 1, border: pax.gender === 'Female' ? '1px solid #333' : '1px solid #777777', backgroundColor: "transparent", color: pax.gender === 'Female' ? '#000' : '#676767', borderRadius: "8px", fontSize: "14px", fontWeight: pax.gender === 'Female' ? '500' : 'normal', cursor: "pointer" }}>
                      <input type="radio" className="d-none" name={`gender-${index}`} value="Female" onChange={() => handlePaxChange(index, 'gender', 'Female')} /> 
                      Female
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={figmaBoxStyle} className="mb-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-tag fs-5 text-dark"></i>
            <h5 style={figmaLabelStyle} className="text-dark mb-0">Offer Code</h5>
          </div>
          <div className="row g-3 mt-2">
            <div className="col-12 d-flex gap-2 align-items-center">
              <input type="text" className="form-control shadow-none" placeholder="Enter Membership code" style={figmaInputStyle} />
              <button type="button" style={{ background: "#1DA1F2", border: "none", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "14px", fontWeight: "500" }}>Verify</button>
            </div>
            <div className="col-12 d-flex gap-2 align-items-center">
              <input type="text" className="form-control shadow-none" placeholder="Enter Offer code" style={figmaInputStyle} />
              <button type="button" style={{ background: "#1DA1F2", border: "none", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "14px", fontWeight: "500" }}>Verify</button>
            </div>
          </div>
        </div>

        <div style={figmaBoxStyle} className="mb-4">
          <h5 style={figmaLabelStyle} className="text-dark">Travel Insurance</h5>
          <p style={figmaTextStyle} className="mb-4">At just ₹ 15.0 per passenger</p>
          <div className="mb-4">
            <div className="mb-3">
              <p className="mb-0 text-dark" style={{ fontSize: "14px", fontWeight: "500" }}>Upto ₹ 5,000</p>
              <p className="mb-0" style={{ fontSize: "12px", color: "#676767" }}>In the event of loss of luggage</p>
            </div>
            <div className="mb-3">
              <p className="mb-0 text-dark" style={{ fontSize: "14px", fontWeight: "500" }}>Upto ₹ 5,000</p>
              <p className="mb-0" style={{ fontSize: "12px", color: "#676767" }}>In the event of loss of luggage</p>
            </div>
            <div className="mb-3">
              <p className="mb-0 text-dark" style={{ fontSize: "14px", fontWeight: "500" }}>Upto ₹ 5,000</p>
              <p className="mb-0" style={{ fontSize: "12px", color: "#676767" }}>In the event of loss of luggage</p>
            </div>
          </div>
          <div className="d-flex flex-column gap-3">
            <label className="p-3 d-flex align-items-center gap-3 cursor-pointer" style={{ backgroundColor: "transparent", border: insurance === true ? '1px solid #333' : '1px solid #777777', borderRadius: "20px" }}>
              <input type="radio" name="insurance" checked={insurance === true} onChange={() => setInsurance(true)} style={{ width: "16px", height: "16px" }} />
              <span style={{ fontSize: "14px", color: "#333", fontWeight: insurance === true ? '500' : 'normal' }}>Yes, Protect my trip at ₹{15 * passengers.length} ({passengers.length} passenger(s))</span>
            </label>
            <label className="p-3 d-flex align-items-center gap-3 cursor-pointer" style={{ backgroundColor: "transparent", border: insurance === false ? '1px solid #333' : '1px solid #777777', borderRadius: "20px" }}>
              <input type="radio" name="insurance" checked={insurance === false} onChange={() => setInsurance(false)} style={{ width: "16px", height: "16px" }} />
              <span style={{ fontSize: "14px", color: "#333", fontWeight: insurance === false ? '500' : 'normal' }}>No, I would like to proceed without insurance</span>
            </label>
          </div>
        </div>

        <div style={{ ...figmaBoxStyle, padding: "24px 32px" }}>
          <div className="d-flex align-items-start gap-3">
            <input type="checkbox" id="gstCheck" checked={hasGst} onChange={(e) => setHasGst(e.target.checked)} style={{ width: "20px", height: "20px", cursor: "pointer", marginTop: "3px" }} />
            <div>
              <label htmlFor="gstCheck" style={{ color: '#676767', fontWeight: '500', fontSize: '18px', margin: 0, cursor: "pointer", lineHeight: "1.2" }}>I have a GST number</label>
              <div style={{ fontSize: '13px', color: '#888', marginTop: '2px' }}>(Optional)</div>
            </div>
          </div>
          {hasGst && (
            <div className="row g-3 mt-3">
              <div className="col-12 col-md-6"><input type="text" className="form-control shadow-none" placeholder="Company Name" value={gstDetails.name} onChange={e => setGstDetails({...gstDetails, name: e.target.value})} style={figmaInputStyle} /></div>
              <div className="col-12 col-md-6"><input type="text" className="form-control shadow-none" placeholder="GST Number" value={gstDetails.gstId} onChange={e => setGstDetails({...gstDetails, gstId: e.target.value})} style={figmaInputStyle} /></div>
              <div className="col-12"><input type="text" className="form-control shadow-none" placeholder="Company Address" value={gstDetails.address} onChange={e => setGstDetails({...gstDetails, address: e.target.value})} style={figmaInputStyle} /></div>
            </div>
          )}
        </div>
      </div>

      <div className="col-12 col-lg-6">
        <div className="sticky-top" style={{ ...figmaBoxStyle, top: "100px", padding: "40px 30px" }}>
          <div className="mb-5">
            <h6 style={figmaLabelStyle}>Bus Name</h6>
            <p style={figmaTextStyle} className="mb-0">{selectedSeats.length} seat - {busType}</p>
          </div>
          <hr style={{ borderColor: "#777777", opacity: 0.4, margin: "30px 0" }} />
          <div>
            <h6 style={figmaLabelStyle}>Seat details</h6>
            <p style={figmaTextStyle} className="mb-0">{selectedSeats.map(s => s.id).join(', ')} seat</p>
          </div>
        </div>
      </div>
    </div>
  );
}