'use client';
import React, { useRef, useState, useEffect, ChangeEvent, RefObject } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation'; 
import Navbar from '../navbar';
import Hom from '../HomeTwo/page';
import '../css/HomeOne.css';
import { fetchCitySuggestions, CitySuggestion } from '../api'; 

// Hero Assets
import bgHero from '../assest/background 1.png';
import searchIcon1 from '../assest/searchicon 1.svg'; 
import searchIcon2 from '../assest/searchicon 1.svg'; 
import searchIcon3 from '../assest/searchicon 2.png'; 

// Special Offers Assets
import ticketBooking from '../assest/tour.png';
import specialOffersImg from '../assest/special.png';
import firstBus from '../assest/book.png';
import instantDiscount from '../assest/instant.png';

// Popular Routes Assets
import chikkamagaluru from '../assest/chikamanagluru.png';
import mysore from '../assest/mysore.png';
import coimbatore from '../assest/coimbatore.png';
import madurai from '../assest/madurai.png';
import bengaluru from '../assest/bangalore.png';
import hyderabad from '../assest/hyderabad.png';
import pune from '../assest/pune.png';
import chennai from '../assest/chennai.png';
import delhi from '../assest/delhi.png';
import mumbai from '../assest/mumbai.png';
import indore from '../assest/indore.png';
import ahmedabad from '../assest/ahemabdabad.png';
import goa from '../assest/goa.png';

// --- TRANSLATIONS FOR HOME PAGE ---
const homeTranslations: Record<string, any> = {
  EN: {
    selectLocation: "Select Location",
    selectDestination: "Select Destination",
    selectDate: "Select Date",
    today: "Today",
    tomorrow: "Tomorrow",
    search: "SEARCH",
    specialOffers: "Special Offers",
    useCode: "Use Code",
    viewAll: "VIEW ALL",
    popularRoutes: "Most Popular Bus Routes"
  },
  TA: {
    selectLocation: "இடத்தை தேர்வு செய்க",
    selectDestination: "சேருமிடத்தை தேர்வு செய்க",
    selectDate: "தேதியை தேர்வு செய்க",
    today: "இன்று",
    tomorrow: "நாளை",
    search: "தேடு",
    specialOffers: "சிறப்பு சலுகைகள்",
    useCode: "குறியீட்டைப் பயன்படுத்துக",
    viewAll: "அனைத்தையும் காண்க",
    popularRoutes: "பிரபலமான பேருந்து வழிகள்"
  },
  KN: {
    selectLocation: "ಸ್ಥಳವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    selectDestination: "ಗಮ್ಯಸ್ಥಾನವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    selectDate: "ದಿನಾಂಕವನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    today: "ಇಂದು",
    tomorrow: "ನಾಳೆ",
    search: "ಹುಡುಕಿ",
    specialOffers: "ವಿಶೇಷ ಕೊಡುಗೆಗಳು",
    useCode: "ಕೋಡ್ ಬಳಸಿ",
    viewAll: "ಎಲ್ಲವನ್ನೂ ವೀಕ್ಷಿಸಿ",
    popularRoutes: "ಜನಪ್ರಿಯ ಬಸ್ ಮಾರ್ಗಗಳು"
  },
  TE: {
    selectLocation: "స్థానాన్ని ఎంచుకోండి",
    selectDestination: "గమ్యాన్ని ఎంచుకోండి",
    selectDate: "తేదీని ఎంచుకోండి",
    today: "నేడు",
    tomorrow: "రేపు",
    search: "శోధించండి",
    specialOffers: "ప్రత్యేక ఆఫర్లు",
    useCode: "కోడ్ ఉపయోగించండి",
    viewAll: "అన్నింటినీ వీక్షించండి",
    popularRoutes: "ప్రసిద్ధ బస్సు మార్గాలు"
  },
  ML: {
    selectLocation: "സ്ഥലം തിരഞ്ഞെടുക്കുക",
    selectDestination: "ലക്ഷ്യസ്ഥാനം തിരഞ്ഞെടുക്കുക",
    selectDate: "തീയതി തിരഞ്ഞെടുക്കുക",
    today: "ഇന്ന്",
    tomorrow: "നാളെ",
    search: "തിരയുക",
    specialOffers: "പ്രത്യേക ഓഫറുകൾ",
    useCode: "കോഡ് ഉപയോഗിക്കുക",
    viewAll: "എല്ലാം കാണുക",
    popularRoutes: "ജനപ്രിയ ബസ് റൂട്ടുകൾ"
  }
};

const getTodayLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().split("T")[0];
};

export default function Home() {
  const router = useRouter(); 
  const offersScrollRef = useRef<HTMLDivElement>(null);
  const routesScrollRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  // Language State
  const [currentLang, setCurrentLang] = useState('EN');

  // Date State
  const [selectedDate, setSelectedDate] = useState('');
  
  // State for Today/Tomorrow Active Highlight (Orange)
  const [activeDateTab, setActiveDateTab] = useState<'today' | 'tomorrow' | null>(null);

  // Search States
  const [sourceText, setSourceText] = useState('');
  const [destText, setDestText] = useState('');
  const [sourceSuggestions, setSourceSuggestions] = useState<CitySuggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<CitySuggestion[]>([]);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  
  // Stores the exact City Objects
  const [selectedSource, setSelectedSource] = useState<CitySuggestion | null>(null);
  const [selectedDest, setSelectedDest] = useState<CitySuggestion | null>(null);

  // GLOBAL LANGUAGE LISTENER (Listens to the Navbar)
  useEffect(() => {
    // 1. Initial Load
    const savedLang = localStorage.getItem('yesgo_lang');
    if (savedLang) {
      setCurrentLang(savedLang);
    }

    // ✅ Reset date to today on every page load.
    const todayLocal = getTodayLocal();
    setSelectedDate(todayLocal);
    setActiveDateTab('today');

    // 2. Event Listener for updates from Navbar
    const handleLanguageUpdate = () => {
      const updatedLang = localStorage.getItem('yesgo_lang') || "EN";
      setCurrentLang(updatedLang);
    };

    window.addEventListener('languageChanged', handleLanguageUpdate);
    
    // Cleanup
    return () => {
      window.removeEventListener('languageChanged', handleLanguageUpdate);
    };
  }, []);

  // Get current translations based on selected language
  const t = homeTranslations[currentLang] || homeTranslations['EN'];

  const handleScroll = (ref: RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -450 : 450; 
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const openCalendar = () => {
    if (dateInputRef.current) dateInputRef.current.showPicker();
  };

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    const today = getTodayLocal();
    
    let finalDate = newDate;
    if (newDate < today) {
      finalDate = today; // Force back to today if a past date is typed manually
    }

    setSelectedDate(finalDate);

    const tomorrow = new Date();
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];

    if (finalDate === today) {
      setActiveDateTab('today');
    } else if (finalDate === tomorrowString) {
      setActiveDateTab('tomorrow');
    } else {
      setActiveDateTab(null);
    }
  };

  const handleSourceFocus = () => {
    // ✅ On focus, check if the input is empty and load recent searches.
    if (sourceText.length === 0) {
      const recent = localStorage.getItem("recentSearch");
      if (recent) {
        try {
          const data = JSON.parse(recent);
          if (data.source && data.destination) {
            const recentSuggestion = { ...data.source, isRecent: true, destination: data.destination };
            setSourceSuggestions([recentSuggestion]);
          }
        } catch (e) {
          setSourceSuggestions([]);
          console.error("Failed to parse recent search from localStorage", e);
        }
      } else {
        setSourceSuggestions([]); // Ensure dropdown is empty if no recent search
      }
    }
    setShowSourceDropdown(true);
  };

  const handleSourceChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSourceText(val);
    setSelectedSource(null);
    
    if (val.length >= 2) {
      const results = await fetchCitySuggestions(val);
      setSourceSuggestions(results);
      setShowSourceDropdown(true);
    } else if (val.length === 0) { // When user clears the input
      handleSourceFocus(); // Re-show recent searches
    } else {
      setSourceSuggestions([]);
      setShowSourceDropdown(false);
    }
  };

  const handleDestChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDestText(val);
    setSelectedDest(null);
    
    if (val.length >= 2) {
      const results = await fetchCitySuggestions(val);
      setDestSuggestions(results);
      setShowDestDropdown(true);
    }  else {
      setDestSuggestions([]);
      setShowDestDropdown(false);
    }
  };

  const handleSwap = () => {
    const tempText = sourceText;
    const tempObj = selectedSource;
    setSourceText(destText);
    setSelectedSource(selectedDest);
    setDestText(tempText);
    setSelectedDest(tempObj);
  };

  const handleSearchClick = () => {
    if (!selectedSource || !selectedDest || !selectedDate) {
      alert("Please select a valid Source, Destination, and Date from the dropdowns.");
      return;
    }

    if (!selectedSource.id || selectedSource.id === 'undefined') {
      alert("Invalid Source City. Please search again and click the city from the dropdown list.");
      return;
    }
    
    if (!selectedDest.id || selectedDest.id === 'undefined') {
      alert("Invalid Destination City. Please search again and click the city from the dropdown list.");
      return;
    }

    // 2. Save recent source and destination to Local Storage on successful search.
    localStorage.setItem(
      "recentSearch",
      JSON.stringify({
        source: selectedSource,
        destination: selectedDest,
      })
    );

    // ✅ FIX 3: Accurately split at the parenthesis and grab the string at index, then trim.
    const cleanName = (name: string) => (name || "").split("(")[0].trim();

    const queryParams = new URLSearchParams({
      sourceName: cleanName(selectedSource.name),
      destName: cleanName(selectedDest.name),
      vrlSourceId: selectedSource.vrlCityId || "",
      vrlDestId: selectedDest.vrlCityId || "",
      srsSourceId: selectedSource.srsCityId || "",
      srsDestId: selectedDest.srsCityId || "",
      ezeeSourceCode: selectedSource.ezeeStationCode || "",
      ezeeDestCode: selectedDest.ezeeStationCode || "",
      date: selectedDate
    });

    router.push(`/bus-list?${queryParams.toString()}`);
  };

  const offers = [
    { id: 1, img: ticketBooking, title: 'Ticket Booking', code: 'KATSKR5793', color: '#FFFFFF' },
    { id: 2, img: specialOffersImg, title: 'Special Offers', code: 'DKTSKR6698', color: '#E8F5FF' },
    { id: 3, img: firstBus, title: 'New User Offer On First Bus', code: 'NEWBUS2026', color: '#E9EFFF' },
    { id: 4, img: instantDiscount, title: 'Instant Discount', code: 'INSTANT10', color: '#E0F2F1' },
  ];

  const allRoutes = [
    { id: 1, name: 'Chikkamagaluru', img: chikkamagaluru },
    { id: 2, name: 'Mysore', img: mysore },
    { id: 3, name: 'Coimbatore', img: coimbatore },
    { id: 4, name: 'Madurai', img: madurai },
    { id: 5, name: 'Chennai', img: chennai },
    { id: 6, name: 'Ahmedabad', img: ahmedabad },
    { id: 7, name: 'Bengaluru', img: bengaluru },
    { id: 8, name: 'Hyderabad', img: hyderabad },
    { id: 9, name: 'Pune', img: pune },
    { id: 10, name: 'Delhi', img: delhi },
    { id: 11, name: 'Mumbai', img: mumbai },
    { id: 12, name: 'Indore', img: indore },
    { id: 13, name: 'Goa', img: goa },
  ];

  const arrowBtnClass = "btn rounded-circle d-none d-lg-flex align-items-center justify-content-center shadow border-0 position-absolute top-50 translate-middle-y p-0";
  const arrowBtnStyle = { 
    backgroundColor: '#11375d', 
    width: '48px', height: '48px', 
    zIndex: 10, fontSize: '20px', color: 'white'
  };

  return (
    <>
      <Navbar />
      
      {/* Search Bar Styling */}
      <style>{`
        .search-box-figma-container {
          width: 90% !important; 
          max-width: 100% !important; 
          margin-left: auto;
          margin-right: auto;
        }
        .search-flex-row {
          height: 64px !important; /* Increased for taller fonts */
          display: flex;
          align-items: center;
        }
        .search-section {
          border-radius: 12px !important;
          height: 100% !important;
          min-height: 64px !important;
        }
        .main-search-button {
          border-radius: 8px !important; 
          height: 100% !important;
          width: 100px !important;
          flex: 0 0 auto !important;
          font-size: 14px;
          line-height: 1.2;
          white-space: normal;
          word-break: break-word;
        }
        .inner-input-box {
          height: 100% !important;
          min-height: 64px !important;
          display: flex;
          align-items: center;
        }
        .search-field-left {
          text-align: left !important;
          padding-left: 12px !important;
          font-size: 14px !important;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
        }

        /* ORIGINAL DESKTOP ARROW STYLES WITH MOBILE FIX */
        .swap-icon-btn {
          margin: 0 20px !important; 
          padding: 8px !important;
          border-radius: 50%;
          transition: transform 0.2s ease, color 0.3s ease; 
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0b426b; /* Default desktop dark blue */
        }
        .swap-icon-btn:hover {
          color: white !important; /* Only hover changes to white */
        }
        .swap-icon-btn:active {
          transform: scale(0.9); 
        }

        .date-btn {
          transition: background-color 0.3s ease, color 0.3s ease;
          font-size: 14px !important;
          line-height: 1.2 !important;
          white-space: normal !important;
          word-break: break-word !important;
          padding: 4px !important;
        }
        .date-btn.active-orange {
          background-color: #FF6B00 !important;
          color: white !important;
          font-weight: bold;
        }

        /* =============== MOBILE DEVICE STYLES =============== */
        @media (max-width: 992px) {
          .search-box-figma-container {
            width: 90% !important; 
          }
          .search-flex-row {
            flex-direction: column !important;
            height: auto !important;
            gap: 12px !important;
          }
          .search-section,
          .date-input-container {
            width: 100% !important;
            height: 64px !important;
            flex: none !important;
          }
          .main-search-button {
            width: 100% !important;
            height: 55px !important;
            flex: none !important;
            margin: 0 !important;
            font-size: 16px !important;
          }

          /* ABSOLUTE POSITIONING FIX FOR SWAP ARROW WITH PERFECT MATH */
          .blue-divider-spacer {
            position: absolute !important;
            top: 61px !important; 
            right: calc(27.77% - 19px) !important;
            transform: translateY(-50%);
            display: flex !important;
            justify-content: center;
            align-items: center;
            width: auto !important;
            z-index: 1050;
          }
          .blue-divider-spacer.d-none {
            display: none !important;
          }
          
          .swap-icon-btn {
            margin: 0 !important;
            transform: rotate(90deg); 
            background-color: #2181e2 !important; 
            border: 2px solid #0b426b !important; 
            color: #0b426b !important; /* Forces dark blue arrow by default */
            width: 38px !important;
            height: 38px !important;
            border-radius: 50% !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 18px !important;
            line-height: 1 !important;
            padding: 0 !important;
          }
          .swap-icon-btn:hover {
            color: white !important; /* ONLY changes to white on hover */
          }
          .swap-icon-btn:active {
            transform: scale(0.9) rotate(90deg); 
          }

          /* ========================================================== */
          /* AGGRESSIVE FIX FOR ORANGE BUTTON GAPS & INTERNAL CORNERS  */
          /* ========================================================== */
          .date-input-container {
            padding: 0 !important;
            overflow: hidden !important; 
            border-radius: 8px !important; 
          }
          .date-input-container .inner-input-box {
            padding: 0 !important;
            margin: 0 !important;
            gap: 0 !important; 
            align-items: stretch !important; 
          }
          .date-btn-wrapper {
            padding: 0 !important;
            margin: 0 !important;
            display: flex !important;
            align-items: stretch !important;
            flex: 1 !important;
          }
          .date-clickable-area {
            flex: 1.6 !important; 
            padding: 0 4px !important;
            margin: 0 !important;
          }
          .date-input-container .search-field {
            width: 100% !important; 
            font-size: 12px !important; 
            padding: 0 !important;
            margin: 0 !important;
          }
          .date-btn {
            font-size: 13px !important;
            padding: 0 !important;
            margin: 0 !important;
            letter-spacing: 0px;
            height: 100% !important;
            width: 100% !important;
            border-radius: 0 !important; 
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            white-space: normal !important;
            line-height: 1.1 !important;
            text-align: center !important;
          }
          .full-height-divider {
            width: 1px !important;
            margin: 0 !important;
            height: 100% !important;
          }
        }
      `}</style>
    
      <main className="bg-white overflow-hidden  " style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
      <div className='large-screen-container'>
          
        {/* HERO SECTION */}
        <section className="w-100 position-relative">
          <Image 
            src={bgHero} 
            alt="Hero Background" 
            width={1920} 
            height={600} 
            sizes="100vw" 
            priority 
            quality={80} 
            style={{ width: '100%', height: 'auto', display: 'block' }} 
          />
        </section>

        {/* CONTENT SECTION */}
        <div className="container-fluid p-0 bg-white" style={{ position: 'relative', zIndex: 10 }}>
          
          {/* SEARCH BAR */}
          <div className="search-box-figma-container mx-auto mt-4 mb-5" style={{ position: 'relative', zIndex: 1000 }}>
            <div className="search-flex-row position-relative" style={{ overflow: 'visible' }}>
              
              {/* SOURCE INPUT */}
              <div className="search-section rounded-all position-relative" style={{ overflow: 'visible' }}>
                <div className="inner-input-box">
                  <Image src={searchIcon1} alt="loc" width={28} height={28} priority className="me-2 ms-2" />
                  <input 
                    type="text" 
                    className="search-field search-field-left" 
                    placeholder={t.selectLocation} 
                    value={sourceText}
                    onChange={handleSourceChange}                    onFocus={handleSourceFocus}
                    onBlur={() => setTimeout(() => setShowSourceDropdown(false), 200)}
                  />
                </div>
                {showSourceDropdown && (
                  <ul className="list-group position-absolute w-100 shadow text-start" style={{ zIndex: 1050, top: 'calc(100% + 5px)', left: 0, maxHeight: '250px', overflowY: 'auto' }}>                    
                    {sourceSuggestions.length > 0 ? ( // Check if there are any suggestions
                      <>
                        {/* Show "Recent Searches" header only when typing hasn't started and there's a recent item */}
                        {sourceText.length === 0 && sourceSuggestions.some(s => s.isRecent) && (
                          <li className="list-group-item disabled text-muted small">Recent Searches</li>
                        )}
                        {sourceSuggestions.map((item: any) => (
                          <li 
                            key={item._id || item.id} 
                            className="list-group-item list-group-item-action py-2" 
                            style={{ cursor: 'pointer', fontSize: '14px' }} 
                            onMouseDown={() => {
                              if (item.isRecent) {
                                // ✅ If it's a recent search, auto-fill both source and destination.
                                setSourceText(item.name);
                                setSelectedSource(item);
                                setDestText(item.destination.name);
                                setSelectedDest(item.destination);
                              } else {
                                // Otherwise, it's a regular API suggestion.
                                setSourceText(item.name);
                                setSelectedSource(item);
                              }
                              setShowSourceDropdown(false); // Close dropdown on selection.
                            }}
                          >
                            {/* Use a different icon for recent vs. API results */}
                            <i className={`bi ${item.isRecent ? 'bi-arrow-repeat' : 'bi-geo-alt'} me-2 text-muted`}></i>
                            <span className="fw-medium text-dark">{item.name}</span>
                          </li>
                        ))}
                      </>
                    ) : ( // This part runs if sourceSuggestions is empty
                      sourceText.length > 1 && (
                        <li className="list-group-item text-muted">
                          No cities found.
                        </li>
                      )
                    )}
                  </ul>
                )}
              </div>

              {/* ARROW BUTTON */}
              <div className="blue-divider-spacer">
                <div className="swap-icon-btn" onClick={handleSwap} style={{ cursor: 'pointer' }}>⇌</div>
              </div>

              {/* DESTINATION INPUT */}
              <div className="search-section rounded-all position-relative" style={{ overflow: 'visible' }}>
                <div className="inner-input-box">
                  <Image src={searchIcon2} alt="dest" width={28} height={28} priority className="me-2 ms-2" />
                  <input 
                    type="text" 
                    className="search-field search-field-left" 
                    placeholder={t.selectDestination}
                    value={destText}
                    onChange={handleDestChange}
                    onFocus={() => setShowDestDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDestDropdown(false), 200)} 
                  />
                </div>
                {showDestDropdown && (
                  <ul className="list-group position-absolute w-100 shadow text-start" style={{ zIndex: 1050, top: 'calc(100% + 5px)', left: 0, maxHeight: '250px', overflowY: 'auto' }}>                    
                    {destSuggestions.length > 0 ? (
                      destSuggestions.map((city) => (
                        <li 
                          key={city._id || city.id} 
                          className="list-group-item list-group-item-action py-2" 
                          style={{ cursor: 'pointer', fontSize: '14px' }} 
                          onMouseDown={() => {                            
                            setDestText(city.name);
                            setSelectedDest(city);
                            setShowDestDropdown(false);
                          }} >
                          <i className="bi bi-geo-alt me-2 text-muted"></i>
                          <span className="fw-medium text-dark">{city.name}</span>
                        </li>
                      ))
                    ) : (
                      destText.length > 1 && ( 
                        <li className="list-group-item text-muted">
                          No cities found.
                        </li>
                      )
                    )}
                  </ul>
                )}
              </div>

              <div className="blue-divider-spacer d-none d-lg-block"></div>

              {/* CENTERED DATE SECTION */}
              <div className="search-section date-input-container rounded-all" style={{ flex: '2', position: 'relative' }}>
                <div className="inner-input-box d-flex w-100">
                  
                  <div className="date-clickable-area flex-fill d-flex align-items-center justify-content-center position-relative" onClick={openCalendar} style={{ cursor: "pointer", height: "100%" }}>
                    <Image src={searchIcon3} alt="date" width={24} height={24} priority className="me-2" />
                    <input 
                      type="text" 
                      readOnly 
                      value={selectedDate} 
                      className="search-field pointer-events-none" 
                      placeholder={t.selectDate} 
                      style={{ fontSize: "14px", textAlign: "center", minWidth: "100px", maxWidth: "140px", cursor: "pointer", background: "transparent", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}
                      tabIndex={-1}
                    />
                    
                    <input 
                      type="date" 
                      ref={dateInputRef} 
                      min={getTodayLocal()}
                      value={selectedDate}
                      onChange={handleDateChange} 
                      style={{
                        position: "absolute",
                        top: "65px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "1px",
                        height: "1px",
                        opacity: 0,
                        padding: 0,
                        margin: 0,
                        border: "none",
                        pointerEvents: "none"
                      }}
                    />
                  </div>

                  <div className="full-height-divider"></div>

                  <div className="date-btn-wrapper flex-fill h-100">
                    <button className={`date-btn w-100 h-100 border-0 ${activeDateTab === 'today' ? 'active-orange' : 'bg-transparent'}`} onClick={() => {
                      setSelectedDate(getTodayLocal());                      
                      setActiveDateTab('today');
                    }}>{t.today}</button>                  </div>

                  <div className="full-height-divider"></div>

                  <div className="date-btn-wrapper flex-fill h-100">
                    <button className={`date-btn w-100 h-100 border-0 ${activeDateTab === 'tomorrow' ? 'active-orange' : 'bg-transparent'}`} onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const tomorrowString = tomorrow.toISOString().split('T')[0];
                      setSelectedDate(tomorrowString);
                      setActiveDateTab('tomorrow');
                    }}>{t.tomorrow}</button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSearchClick}
                className="main-search-button rounded-all ms-lg-3 text-white fw-bold d-flex justify-content-center align-items-center text-center"
                style={{ flex: "0 0 110px", padding: "8px" }}
              >
                {t.search}
              </button>
            </div>
          </div>
        </div>
        <div className='site-wrapper'>

        {/* SPECIAL OFFERS */}
        <section className="py-5 position-relative text-center px-2">
          <div className="d-inline-block position-relative mb-4">
            <h2 className="fw-bold m-0" style={{ color: '#033564', fontSize: 'clamp(24px, 4vw, 36px)' }}>{t.specialOffers}</h2>
            <div className="mt-1 mx-auto" style={{ width: '80px', height: '5px', backgroundColor: '#00A8E8', borderRadius: '2px' }}></div>
          </div>
          <div className="container-fluid position-relative px-lg-5 mt-4" style={{ maxWidth: '1700px' }}>
            <button onClick={() => handleScroll(offersScrollRef, 'left')} className={`${arrowBtnClass} start-0 ms-2`} style={arrowBtnStyle}>❮</button>
            <div ref={offersScrollRef} className="d-flex overflow-auto gap-4 pb-3 mx-lg-4 hide-scrollbar" style={{ scrollSnapType: 'x mandatory' }}>
              {offers.map((offer) => (
                <div key={offer.id} className="card flex-shrink-0 position-relative shadow-sm" style={{ width: 'clamp(280px, 80vw, 380px)', backgroundColor: offer.color, minHeight: '220px', borderRadius: '35px', border: '1px solid #033564', overflow: 'hidden', scrollSnapAlign: 'start' }}>
                  <div className="p-4 h-100 d-flex flex-column justify-content-between">
                    <div className="text-start" style={{ zIndex: 2 }}>
                      <h6 className="fw-bold text-dark" style={{ fontSize: '20px', maxWidth: '180px', lineHeight: '1.2' }}>{offer.title}</h6>
                    </div>
                    <div className="text-start mt-auto" style={{ zIndex: 2 }}>
                      <div className="d-inline-block px-3 py-2 rounded-3" style={{ backgroundColor: '#033564', color: 'white' }}>
                        <p className="m-0 opacity-75" style={{ fontSize: '10px' }}>{t.useCode}</p>
                        <p className="m-0 fw-bold" style={{ fontSize: '14px' }}>{offer.code}</p>
                      </div>
                    </div>
                    
                    <div 
                      className="position-absolute" 
                      style={
                        offer.id === 1 || offer.id === 4 
                          ? { bottom: '-5px', right: '-5px', width: '70%', height: '80%', zIndex: 1 } 
                          : { bottom: '0', right: '0', width: '55%', height: '100%', zIndex: 1 } 
                      }
                    >
                      <Image 
                        src={offer.img} 
                        alt={offer.title} 
                        fill 
                        sizes="(max-width: 768px) 150px, 200px" 
                        style={{ objectFit: 'contain', objectPosition: 'bottom right' }} 
                        quality={75}
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => handleScroll(offersScrollRef, 'right')} className={`${arrowBtnClass} end-0 me-2`} style={arrowBtnStyle}>❯</button>
          </div>
          <div className="mt-5 d-flex justify-content-center">
            <button 
              className="view-all-btn rounded-pill border-0 text-white px-5 py-2 fw-normal" 
              style={{ 
                background: 'linear-gradient(to right, #087194, #03323E)', 
                fontSize: '14px',
                letterSpacing: '1px'
              }}
            >
              {t.viewAll}
            </button>
          </div>
        </section>

        {/* POPULAR ROUTES */}
        <section className="py-5 text-center position-relative">
          <div className="container-fluid position-relative px-4 px-lg-5" style={{ maxWidth: '1700px' }}>
            <div className="d-inline-block position-relative mb-5">
              <h2 className="fw-bold m-0" style={{ color: '#033564', fontSize: 'clamp(22px, 4vw, 36px)' }}>{t.popularRoutes}</h2>
              <div className="mt-1 mx-auto" style={{ width: '100px', height: '5px', backgroundColor: '#00A8E8', borderRadius: '2px' }}></div>
            </div>
            
            <button onClick={() => handleScroll(routesScrollRef, 'left')} className={`${arrowBtnClass} start-0 ms-2`} style={arrowBtnStyle}>❮</button>
            
            <div ref={routesScrollRef} className="d-flex overflow-auto gap-3 gap-lg-4 pb-3 px-3 px-lg-4 hide-scrollbar" style={{ scrollSnapType: 'x mandatory' }}>
              {allRoutes.map((route) => (
                <div key={route.id} className="flex-shrink-0" style={{ width: 'calc(100vw - 2rem)', maxWidth: '380px', scrollSnapAlign: 'start' }}>
                  <div
                    className="position-relative overflow-hidden shadow-sm mb-3"
                    style={{
                      height: 'clamp(300px, 56vh, 450px)',
                      width: '100%',
                      borderRadius: '35px',
                      transform: 'translateZ(0)'
                    }}
                  >
                    <Image
                      src={route.img}
                      alt={route.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 380px"
                      style={{ objectFit: "cover" }}
                      quality={60}
                      loading="lazy"
                    />
                  </div>
                  
                  <div className="text-start ps-3 d-flex align-items-center">
                    <span className="fw-bold text-dark" style={{ fontSize: '22px' }}>{route.name}</span>
                    <span className="ms-3" style={{ color: '#00A8E8', fontWeight: 'bold', fontSize: '24px' }}>→</span>
                  </div>
                </div>
              ))}
            </div>
            
            <button onClick={() => handleScroll(routesScrollRef, 'right')} className={`${arrowBtnClass} end-0 me-2`} style={arrowBtnStyle}>❯</button>
          </div>
        </section>
          </div>
        <Hom />
      </div>
      </main>
    </>
  );
}