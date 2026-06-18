"use client";

import React, { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// @ts-ignore
import "bootstrap/dist/css/bootstrap.min.css";
// @ts-ignore
import "bootstrap-icons/font/bootstrap-icons.css";
// @ts-ignore
import "./bus.css";

import { ToastContainer, toast } from 'react-toastify';

import { useGoogleLogin } from '@react-oauth/google';

import { SUPPORTED_LANGUAGES, TRANSLATIONS, TranslationKeys } from "./language";

import logo from "../components/assest/logo.svg";
import easyFilterIcon from "../components/assest/easy.png";
import searchIcon from "../components/assest/searchbar.png";
import barIcon1 from "../components/assest/baricon1.svg";
import barIcon2 from "../components/assest/baricon2.svg";
import filterSearchIcon from "../components/assest/searchicon 2.png";
import micIcon from "../components/assest/mic.png";

import busicon1 from "../components/assest/busicon1.png";
import busicon2 from "../components/assest/busicon2.png";
import busicon3 from "../components/assest/busicon3.png";
import busicon4 from "../components/assest/busicon4.png";
import busicon5 from "../components/assest/busicon5.png";
import busicon6 from "../components/assest/busicon6.png";
import busicon7 from "../components/assest/busicon7.png";
import busicon8 from "../components/assest/busicon8.png";
import busicon9 from "../components/assest/busicon9.png";
import busicon10 from "../components/assest/busicon10.png";

import {
  fetchVrlBuses,
  fetchSrsBuses,
  fetchEzeeBusesV3,
  fetchCitySuggestions,
  fetchBusFilters,

  fetchVrlSeatLayout,
  fetchSrsSeatLayout,
  fetchEzeeSeatLayout,
  requestLoginOtp,
  requestSignupOtp,
  verifyOtp,
  NormalizedBus,
  CitySuggestion
} from "../components/api";

// ─── Helpers ────────────────────────────────────────────────────────────────

const getVrlArrivalTime = (bus: any): string => {
  if (bus.ArrivalTime) {
    return bus.ArrivalTime;
  }

  if (bus.ApproxArrival) {
    const match = String(bus.ApproxArrival).match(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    if (match) {
      return match[0];
    }
  }
  return "--:--";
};

const formatApiDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const TIME_REGEX_GLOBAL =
  /\b((1[0-2]|0?[1-9]):([0-5][0-9])\s*([AaPp][Mm])?|(?:[01]?[0-9]|2[0-3]):[0-5][0-9])\b/g;

const TIME_REGEX_SINGLE =
  /\b((1[0-2]|0?[1-9]):([0-5][0-9])\s*([AaPp][Mm])?|(?:[01]?[0-9]|2[0-3]):[0-5][0-9])\b/;

const cleanLocationName = (name: string): string => {
  if (!name) return "";

  let cleaned = name.replace(
    /(?:Ph|Mob|Phone|Contact|M)?\s*:?\s*(?:\+?91[\-\s]?)?[6-9]\d{9}\b/gi,
    ""
  );
  cleaned = cleaned.replace(/\b0\d{2,4}[\-\s]?\d{6,8}\b/g, "");
  cleaned = cleaned.replace(TIME_REGEX_GLOBAL, "");
  cleaned = cleaned
    .replace(/[,|-]\s*[,|-]/g, ",")
    .replace(/\s*-\s*$/, "")
    .replace(/,\s*$/, "")
    .replace(/\(\s*\)/g, "")
    .trim();

  return cleaned || "Location Details Unavailable";
};

const extractTime = (timeStr: string, fallback: string): string => {
  if (!timeStr) return fallback;
  const match = timeStr.match(TIME_REGEX_SINGLE);
  return match ? match[0] : fallback;
};

const parseTimeToHours = (timeStr: string): number => {
  if (!timeStr || timeStr === "--:--") return -1;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/i);
  if (!match) return -1;
  let hours = parseInt(match[1], 10);
  const ampm = match[3] ? match[3].toUpperCase() : null;
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return hours;
};

const cleanName = (name: string): string =>
  (name || "").split("(")[0].trim();

const cleanTime = (timeStr: any): string => {
  if (!timeStr || timeStr === "--:--") return "--:--";
  const match = String(timeStr).match(/\d{1,2}:\d{2}/);
  return match ? match[0] : String(timeStr);
};

const isMeaningfulTime = (time: any): boolean => {
  const value = String(time || "").trim();
  return value !== "" && value !== "--:--" && value !== "00:00" && value !== "0:00";
};

const formatTime = (time: string) => {
  if (!time) return "--:--";
  const [h, m] = time.split(":");
  const hour = Number(h);
  if (isNaN(hour)) return time;

  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  const mins = m ? m.substring(0, 2) : "00";
  return `${String(displayHour).padStart(2, "0")}:${mins} ${ampm}`;
};

const formatDuration = (duration: string) => {
  if (!duration) return "---";
  const match = String(duration).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return String(duration);
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return `${hours}h ${minutes}m`;
};

const getBusType = (bus: NormalizedBus): string => {
  if (!bus) return "A/C Sleeper (2+1)";
  const raw = bus.originalData || {};
  
  const bestMatch = raw?.bus?.busType ||
                    raw?.data?.bus?.busType ||
                    raw?.data?.BusType ||
                    raw?.data?.busType ||
                    raw?.busType ||
                    raw?.BusType;
  
  if (bestMatch && typeof bestMatch === 'string' && bestMatch.length > 3) {
    return bestMatch;
  }
  return bus.busType || "A/C Sleeper (2+1)";
};

const getSimulatedRating = (bus: NormalizedBus): string => {
  // Always simulate the rating because APIs often hardcode it to the same value
  const type = String(getBusType(bus)).toUpperCase();
  let base = 3.0; // Start lower to give a huge spread for random variation
  
  // Premium buses
  if (type.includes("VOLVO") || type.includes("SCANIA") || type.includes("MERCEDES") || type.includes("BENZ")) {
    base += 0.6;
  } else if (type.includes("AC") && !type.includes("NON AC") && !type.includes("NON-AC")) {
    base += 0.3;
  }

  // Comfort
  if (type.includes("SLEEPER")) base += 0.3;
  if (type.includes("2+1") || type.includes("1X1")) base += 0.2;
  
  // Create a highly sensitive hash utilizing ID, Operator Name, and Type
  const uniqueString = String(bus.id || "") + String(bus.operatorName || "") + type;
  const hash = uniqueString.split("").reduce((acc, char, i) => acc + (char.charCodeAt(0) * (i + 1)), 0) % 181;
  
  // This allows the random factor to add anywhere from +0.0 to +1.8
  const randomFactor = hash * 0.01; 
  
  let rating = Math.min(Math.max(base + randomFactor, 3.1), 4.9);
  return rating.toFixed(1);
};

const getAvailableSeats = (bus: NormalizedBus): number => {
  const raw = bus.originalData || {};

  if (bus.apiProvider?.includes("EZEE")) {
    const seats = raw.bus?.seatLayoutList || raw.seatLayoutList || [];
    const availableFromLayout = seats.filter(
      (s: any) => s.seatStatus?.code === "AL"
    ).length;

    if (Number(raw.availableSeatCount) === 0 && availableFromLayout > 0) {
      return availableFromLayout;
    }
    return Number(raw.availableSeatCount || 0);
  }

  const seats = Number(
    raw.EmptySeats ??
    raw.emptySeats ??
    raw.seatsAvailable ??
    raw.availableSeats ??
    raw.AvailableSeats ??
    raw.SeatsAvailable ??
    bus.availableSeats ??
    0
  );
  return isNaN(seats) ? 0 : seats;
};

// ─── Main Component ──────────────────────────────────────────────────────────

function BusListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        // @ts-ignore
        require("bootstrap/dist/js/bootstrap.bundle.min.js");
      } catch (err) {
        console.warn("Bootstrap JS module not found. Please ensure bootstrap is installed.", err);
      }
    }
  }, []);

  const urlSourceName = searchParams.get('sourceName') || searchParams.get('source') || "Bangalore";
  const urlDestName = searchParams.get('destName') || searchParams.get('destination') || "Chennai";

  const rawDateParam = searchParams.get('date');
  const urlDateParam = rawDateParam ? rawDateParam.split('T')[0] : formatApiDate(new Date());

  const vrlSourceId = searchParams.get("vrlSourceId") || "";
  const vrlDestId = searchParams.get("vrlDestId") || "";
  const srsSourceId = searchParams.get("srsSourceId") || "";
  const srsDestId = searchParams.get("srsDestId") || "";
  const ezeeSourceCodeUrl = searchParams.get('ezeeSourceCode') || "";
  const ezeeDestCodeUrl = searchParams.get('ezeeDestCode') || "";

  const [inputSource, setInputSource] = useState(urlSourceName);
  const [inputDest, setInputDest] = useState(urlDestName);
  const [journeyDate, setJourneyDate] = useState(urlDateParam);

  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [selectedLang, setSelectedLang] = useState("EN");
  const [translatedNames, setTranslatedNames] = useState<Record<string, string>>({});
  const t = TRANSLATIONS[selectedLang as keyof typeof TRANSLATIONS] || TRANSLATIONS["EN"];

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [user, setUser] = useState<{ name: string; email?: string; phone?: string; _id?: string } | null>(null);
  const [formData, setFormData] = useState({ mobileNumber: '', fullName: '', email: '', gender: '', otp: '' });
  const [pendingBus, setPendingBus] = useState<NormalizedBus | null>(null);

  const [sourceOptions, setSourceOptions] = useState<CitySuggestion[]>([]);
  const [destOptions, setDestOptions] = useState<CitySuggestion[]>([]);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  const [selectedSource, setSelectedSource] = useState<CitySuggestion | null>({
    name: urlSourceName, state: "India",
    id: vrlSourceId || srsSourceId || "src", _id: "src",
    vrlCityId: vrlSourceId, srsCityId: srsSourceId, ezeeStationCode: ezeeSourceCodeUrl
  });

  const [selectedDest, setSelectedDest] = useState<CitySuggestion | null>({
    name: urlDestName, state: "India",
    id: vrlDestId || srsDestId || "dst", _id: "dst",
    vrlCityId: vrlDestId, srsCityId: srsDestId, ezeeStationCode: ezeeDestCodeUrl
  });

  const [buses, setBuses] = useState<NormalizedBus[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [filterInput, setFilterInput] = useState("");
  const [filterText, setFilterText] = useState("");
  const [sortBy, setSortBy] = useState<"Price" | "Departure time" | "Ratings">("Price");

  const [boardingPoints, setBoardingPoints] = useState<any[]>([]);
  const [droppingPoints, setDroppingPoints] = useState<any[]>([]);

  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [selectedDepTimes, setSelectedDepTimes] = useState<string[]>([]);
  const [selectedArrTimes, setSelectedArrTimes] = useState<string[]>([]);
  const [selectedBusTypes, setSelectedBusTypes] = useState<string[]>([]);
  const [selectedBoarding, setSelectedBoarding] = useState<string[]>([]);
  const [selectedDropping, setSelectedDropping] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const [selectedDay, setSelectedDay] = useState("");

  useEffect(() => {
    const todayStr = formatApiDate(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatApiDate(tomorrow);

    if (journeyDate === todayStr) setSelectedDay("today");
    else if (journeyDate === tomorrowStr) setSelectedDay("tomorrow");
    else setSelectedDay("custom");
  }, [journeyDate]);

  useEffect(() => {
    const savedUser = localStorage.getItem('yesgo_user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch (e) { console.error("Session parse error"); }
    }
  }, []);

  useEffect(() => {
    const checkAndSyncLanguage = () => {
      const savedLang = localStorage.getItem('yesgo_lang');
      if (savedLang) setSelectedLang(prev => prev !== savedLang ? savedLang : prev);
    };
    checkAndSyncLanguage();
    window.addEventListener('languageChanged', checkAndSyncLanguage);
    window.addEventListener('storage', checkAndSyncLanguage);
    const intervalId = setInterval(checkAndSyncLanguage, 500);
    return () => {
      window.removeEventListener('languageChanged', checkAndSyncLanguage);
      window.removeEventListener('storage', checkAndSyncLanguage);
      clearInterval(intervalId);
    };
  }, []);

  const handleLanguageChange = (code: string) => {
    setSelectedLang(code);
    localStorage.setItem('yesgo_lang', code);
    window.dispatchEvent(new Event('languageChanged'));
  };

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    toast(msg, { type, position: "top-center", autoClose: 3000, theme: "light" });
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoadingAuth(true);
      try {
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        }).then(res => res.json());
        loginUser({ name: userInfo.name, email: userInfo.email });
      } catch {
        showToast("Google Sign-in failed", "error");
      }
      setLoadingAuth(false);
    },
    onError: () => showToast("Google Authentication Failed", "error"),
  });

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAuth(true);
    try {
      const result = authMode === 'login'
        ? await requestLoginOtp(formData.mobileNumber)
        : await requestSignupOtp({
            mobileNumber: formData.mobileNumber, fullName: formData.fullName,
            email: formData.email, gender: formData.gender
          });

      if (result.status === 200 || result.message?.toLowerCase().includes("sent")) {
        setIsOtpSent(true);
        showToast(`OTP Sent to +91 ${formData.mobileNumber}`);
      } else if (result.message?.toLowerCase().includes("already in use")) {
        showToast("Account exists. Switching to Login.", "info");
        setAuthMode('login');
        setIsOtpSent(false);
      } else {
        showToast(result.message || "Request failed", "error");
      }
    } catch {
      showToast("Server connection error", "error");
    }
    setLoadingAuth(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAuth(true);
    try {
      const result = await verifyOtp(formData.mobileNumber, formData.otp, authMode);
      if (result.status === 200 || result.success) {
        const userData = result?.data?.user || result?.user || result?.data || {};
        loginUser({
          name: userData?.name || userData?.fullName || formData.fullName || "User",
          email: userData?.email || formData.email,
          phone: userData?.mobileNumber || formData.mobileNumber,
          _id: userData?._id
        });
      } else {
        showToast(result.message || "Invalid OTP. Try again.", "error");
      }
    } catch {
      showToast("Verification failed", "error");
    }
    setLoadingAuth(false);
  };

  const loginUser = (userData: any) => {
    const finalName = userData.name || 'User';
    const userObj = { ...userData, name: finalName };
    setUser(userObj);
    localStorage.setItem('yesgo_user', JSON.stringify(userObj));
    localStorage.setItem('name', finalName);
    if (userData._id) localStorage.setItem('userId', userData._id);
    if (userData.phone) localStorage.setItem('phone', userData.phone);
    if (userData.email) localStorage.setItem('email', userData.email);

    setShowAuthModal(false);
    setIsOtpSent(false);
    setFormData({ mobileNumber: '', fullName: '', email: '', gender: '', otp: '' });

    if (pendingBus) {
      handleViewSeats(pendingBus, true);
      setPendingBus(null);
    }
  };

  useEffect(() => {
    const translateDynamicNames = async () => {
      if (selectedLang === "EN" || buses.length === 0) {
        setTranslatedNames({});
        return;
      }
      const uniqueNames = Array.from(new Set(buses.map(b => b.operatorName).filter(Boolean)));
      const newTranslations: Record<string, string> = {};
      const langCodeMap: Record<string, string> = { TA: "ta", ML: "ml", TE: "te", HI: "hi", KN: "kn" };
      const targetLang = langCodeMap[selectedLang];
      if (!targetLang) return;

      await Promise.all(
        uniqueNames.map(async (name) => {
          try {
            const res = await fetch(
              `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(name || '')}`
            );
            const data = await res.json();
            if (data) {
              newTranslations[name || ''] = (data[0] && data[0][0] && data[0][0][0]) ? data[0][0][0] : data;
            }
          } catch {
            console.error("Translation failed for", name);
          }
        })
      );
      setTranslatedNames(newTranslations);
    };
    translateDynamicNames();
  }, [buses, selectedLang]);

  const handleToday = () => {
    const todayStr = formatApiDate(new Date());
    setJourneyDate(todayStr);
    setSelectedDay("today");
  };

  const handleTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatApiDate(tomorrow);
    setJourneyDate(tomorrowStr);
    setSelectedDay("tomorrow");
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setJourneyDate(e.target.value);
    }
  };

  const toggleAccordion = (item: string) => setOpenAccordion(prev => prev === item ? null : item);
  const toggleArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setter(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleSourceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputSource(val);
    setSelectedSource(null);
    if (val.length >= 2) {
      const results = await fetchCitySuggestions(val);
      const filtered = results.sort((a, b) => {
        const search = val.toLowerCase();
        const aStarts = (a.name || "").toLowerCase().startsWith(search);
        const bStarts = (b.name || "").toLowerCase().startsWith(search);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return (a.name || "").localeCompare(b.name || "");
      });
      setSourceOptions(filtered);
      setShowSourceDropdown(true);
    } else if (val.length === 0) {
      const recent = JSON.parse(localStorage.getItem("recentCities") || "[]");
      if (recent.length > 0) {
        setSourceOptions(recent);
      } else {
        const results = await fetchCitySuggestions("a");
        setSourceOptions(results.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      }
      setShowSourceDropdown(true);
    } else {
      setSourceOptions([]);
      setShowSourceDropdown(false);
    }
  };

  const handleDestChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputDest(val);
    setSelectedDest(null);
    if (val.length >= 2) {
      const results = await fetchCitySuggestions(val);
      const filtered = results.sort((a, b) => {
        const search = val.toLowerCase();
        const aStarts = (a.name || "").toLowerCase().startsWith(search);
        const bStarts = (b.name || "").toLowerCase().startsWith(search);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return (a.name || "").localeCompare(b.name || "");
      });
      setDestOptions(filtered);
      setShowDestDropdown(true);
    } else if (val.length === 0) {
      const recent = JSON.parse(localStorage.getItem("recentCities") || "[]");
      if (recent.length > 0) {
        setDestOptions(recent);
      } else {
        const results = await fetchCitySuggestions("a");
        setDestOptions(results.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      }
      setShowDestDropdown(true);
    } else {
      setDestOptions([]);
      setShowDestDropdown(false);
    }
  };

  const handleSearchClick = () => {
    if (!selectedSource || !selectedDest || !journeyDate) {
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

    setLoading(true);

    const queryParams = new URLSearchParams({
      sourceName: cleanName(selectedSource.name),
      destName: cleanName(selectedDest.name),
      vrlSourceId: selectedSource.vrlCityId || "",
      vrlDestId: selectedDest.vrlCityId || "",
      srsSourceId: selectedSource.srsCityId || "",
      srsDestId: selectedDest.srsCityId || "",
      ezeeSourceCode: selectedSource.ezeeStationCode || "",
      ezeeDestCode: selectedDest.ezeeStationCode || "",
      date: journeyDate
    });

    router.push(`/bus-list?${queryParams.toString()}`);
  };

  const handleFilterSearch = () => {
    setFilterText(filterInput);
  };

  const divider = <div className="divider-vertical d-none d-lg-block" />;

  const theme = {
    pageBg: "#FFFFFF", primary: "#0D2B4C", blue: "#2F6FED",
    border: "#E0E5EA", tagBg: "#FFF3CD", tagText: "#B47100",
    green: "#10B981", infoBg: "#F0F5FA"
  };

  useEffect(() => {
    const loadBusesAndFilters = async () => {
      setLoading(true);
      try {
        let vSource: string | null = vrlSourceId;
        let vDest: string | null = vrlDestId;
        let sSource: string | null = srsSourceId;
        let sDest: string | null = srsDestId;
        let eSourceCode = ezeeSourceCodeUrl;
        let eDestCode = ezeeDestCodeUrl;

        if (!vSource || !vDest || !sSource || !sDest || !eSourceCode || !eDestCode) {
          const [sourceRes, destRes] = await Promise.all([
            fetchCitySuggestions(urlSourceName),
            fetchCitySuggestions(urlDestName)
          ]);

          const cleanStr = (name: string) => (name || "").split("(")[0].trim().toLowerCase();

          const sMatch = sourceRes.find((c: any) => cleanStr(c.name) === cleanStr(urlSourceName));
          const dMatch = destRes.find((c: any) => cleanStr(c.name) === cleanStr(urlDestName));

          if (sMatch) {
            vSource = vSource || sMatch.vrlCityId || null;
            sSource = sSource || sMatch.srsCityId || null;
            eSourceCode = eSourceCode || sMatch.ezeeStationCode || "";
          }
          if (dMatch) {
            vDest = vDest || dMatch.vrlCityId || null;
            sDest = sDest || dMatch.srsCityId || null;
            eDestCode = eDestCode || dMatch.ezeeStationCode || "";
          }
        }

        console.log("--- Fetching API Params ---", {
          urlSourceName, urlDestName,
          vrlSourceId: vSource, vrlDestId: vDest,
          srsSourceId: sSource, srsDestId: sDest,
          ezeeSourceCode: eSourceCode, ezeeDestCode: eDestCode,
          date: urlDateParam
        });

        const [vrl, srs, ezee, vrlFiltersData, srsFiltersData] = await Promise.all([
          vSource && vDest ? fetchVrlBuses(urlSourceName, urlDestName, vSource, vDest, urlDateParam).catch(() => []) : [],
          sSource && sDest ? fetchSrsBuses(urlSourceName, urlDestName, sSource, sDest, urlDateParam).catch(() => []) : [],
          fetchEzeeBusesV3(urlSourceName, urlDestName, urlDateParam, eSourceCode || undefined, eDestCode || undefined).catch(() => []),
          vSource && vDest ? fetchBusFilters("VRL", { sourceName: urlSourceName, destName: urlDestName, date: urlDateParam, sourceId: vSource, destId: vDest }).catch(() => null) : null,
          sSource && sDest ? fetchBusFilters("SRS", { sourceName: urlSourceName, destName: urlDestName, date: urlDateParam, sourceId: sSource, destId: sDest }).catch(() => null) : null
        ]);

        const combinedRaw = [...(vrl || []), ...(srs || []), ...(ezee || [])];

        console.log(
          "ZERO SEAT BUSES",
          combinedRaw.filter(
            bus => getAvailableSeats(bus) <= 0
          )
        );

        const combined = combinedRaw
          .filter(bus => getAvailableSeats(bus) > 0)
          .map(bus => {
            return {
              ...bus,
              // Directly use the price calculated in api.ts
              // It now correctly reflects the minimum available fare.
              price: bus.price,
              rating: getSimulatedRating(bus)
            };
          });

        console.log(
          "AFTER FILTER",
          combined.length
        );

        console.log(`🚌 BUS COUNTS -> VRL: ${vrl?.length ?? 0} | SRS: ${srs?.length ?? 0} | EZEE: ${ezee?.length ?? 0} | TOTAL: ${combined.length}`);

        setBuses(combined);

        const dedupe = (prev: any[], next: any[]) =>
          Array.from(new Map([...prev, ...next].map(item => [JSON.stringify(item), item])).values());

        if (vrlFiltersData?.data?.boardingPoints)
          setBoardingPoints(prev => dedupe(prev, vrlFiltersData.data.boardingPoints));
        if (srsFiltersData?.boardingPoints)
          setBoardingPoints(prev => dedupe(prev, srsFiltersData.boardingPoints));
        if (vrlFiltersData?.data?.droppingPoints)
          setDroppingPoints(prev => dedupe(prev, vrlFiltersData.data.droppingPoints));
        if (srsFiltersData?.droppingPoints)
          setDroppingPoints(prev => dedupe(prev, srsFiltersData.droppingPoints));

      } catch (e) {
        console.error("API Error:", e);
      }
      setLoading(false);
    };

    setInputSource(urlSourceName);
    setInputDest(urlDestName);
    setJourneyDate(urlDateParam);
    loadBusesAndFilters();
  }, [vrlSourceId, vrlDestId, srsSourceId, srsDestId, ezeeSourceCodeUrl, ezeeDestCodeUrl, urlDateParam, urlSourceName, urlDestName]);

  const checkTimeSlot = (hours: number, slots: string[]) => {
    if (hours === -1) return false;
    return slots.some(slot => {
      if (slot === "Before 6 AM"    && hours >= 0  && hours < 6)  return true;
      if (slot === "6 AM to 12 PM"  && hours >= 6  && hours < 12) return true;
      if (slot === "12 PM to 6 PM"  && hours >= 12 && hours < 18) return true;
      if (slot === "After 6 PM"     && hours >= 18 && hours < 24) return true;
      return false;
    });
  };

  const displayedBuses = useMemo(() => {
    let result = [...buses];

    const premiumKeywords = [
      "volvo",
      "9600",
      "multi axle",
      "multiaxle",
      "benz",
      "premium",
      "slx",
      "i-shift"
    ];

    if (filterText.trim() !== "") {
      const lower = filterText.toLowerCase();
      result = result.filter(bus =>
        (bus.operatorName || "").toLowerCase().includes(lower) ||
        (getBusType(bus) || "").toLowerCase().includes(lower)
      );
    }

    if (activeFilter) {
      result = result.filter(bus => {
        const type = String(getBusType(bus)).toLowerCase();
        if (activeFilter === "AC")              return type.includes("ac") && !type.includes("non-ac") && !type.includes("non ac");
        if (activeFilter === "NON AC")          return type.includes("non-ac") || type.includes("non ac");
        if (activeFilter === "Sleeper")         return type.includes("sleeper");
        if (activeFilter === "Seater")          return type.includes("seater") || type.includes("seat");
        if (activeFilter === "Primo Bus")       return premiumKeywords.some(k => type.includes(k));
        if (activeFilter === "High Rated Buses") return parseFloat(bus.rating || "0") >= 4.5;
        if (activeFilter === "Single Seats")    return type.includes("2+1") || type.includes("1x1");
        if (activeFilter === "Volvo Buses")     return type.includes("volvo");
        return true;
      });
    }

    if (selectedDepTimes.length > 0)
      result = result.filter(bus => checkTimeSlot(parseTimeToHours(bus.departureTime), selectedDepTimes));
    if (selectedArrTimes.length > 0)
      result = result.filter(bus => checkTimeSlot(parseTimeToHours(bus.arrivalTime), selectedArrTimes));
    if (selectedOperators.length > 0)
      result = result.filter(bus => selectedOperators.includes(bus.operatorName || ""));

    if (selectedBusTypes.length > 0) {
      result = result.filter(bus => {
        const tType = String(getBusType(bus)).toLowerCase();
        return selectedBusTypes.some(type => {
          if (type === "AC")      return tType.includes("ac") && !tType.includes("non-ac") && !tType.includes("non ac");
          if (type === "NON AC")  return tType.includes("non-ac") || tType.includes("non ac");
          if (type === "Sleeper") return tType.includes("sleeper");
          if (type === "Seater")  return tType.includes("seater") || tType.includes("seat");
          return false;
        });
      });
    }

    if (selectedBoarding.length > 0)
      result = result.filter(b => selectedBoarding.some(bp => JSON.stringify(b).toLowerCase().includes(bp.toLowerCase())));
    if (selectedDropping.length > 0)
      result = result.filter(b => selectedDropping.some(dp => JSON.stringify(b).toLowerCase().includes(dp.toLowerCase())));
    if (selectedAmenities.length > 0)
      result = result.filter(b => selectedAmenities.some(am => JSON.stringify(b).toLowerCase().includes(am.toLowerCase())));
    if (selectedFeatures.length > 0)
      result = result.filter(b => selectedFeatures.some(feat => JSON.stringify(b).toLowerCase().includes(feat.toLowerCase())));

    return result.sort((a, b) => {
      if (sortBy === "Price")          return a.price - b.price;
      if (sortBy === "Departure time") return a.departureTime.localeCompare(b.departureTime);
      if (sortBy === "Ratings")        return Number(b.rating || 0) - Number(a.rating || 0);
      return 0;
    });
  }, [buses, activeFilter, sortBy, filterText, selectedDepTimes, selectedArrTimes,
      selectedOperators, selectedBusTypes, selectedBoarding, selectedDropping, selectedAmenities, selectedFeatures]);

  const filterCounts = useMemo(() => {
    const activeBuses = displayedBuses;
    const premiumKeywords = [
      "volvo",
      "9600",
      "multi axle",
      "multiaxle",
      "benz",
      "premium",
      "slx",
      "i-shift"
    ];

    return {
      "Primo Bus": activeBuses.filter(bus => {
        const type = (getBusType(bus) || "").toLowerCase();
        return premiumKeywords.some(k => type.includes(k));
      }).length,
      "Free Cancellation": activeBuses.filter(b => b.apiProvider === 'SRS' ? b.originalData?.is_cancellable : true).length,
      "AC": activeBuses.filter(b => {
        const type = String(getBusType(b)).toLowerCase();
        return type.includes("ac") && !type.includes("non-ac") && !type.includes("non ac");
      }).length,
      "Sleeper": activeBuses.filter(b => String(getBusType(b)).toLowerCase().includes("sleeper")).length,
      "Single Seats": activeBuses.filter(b => {
        const type = String(getBusType(b)).toLowerCase();
        return type.includes("2+1") || type.includes("1x1");
      }).length,
      "Seater": activeBuses.filter(b => {
        const type = String(getBusType(b)).toLowerCase();
        return type.includes("seater") || type.includes("seat");
      }).length,
      "NON AC": activeBuses.filter(b => {
        const type = String(getBusType(b)).toLowerCase();
        return type.includes("non-ac") || type.includes("non ac");
      }).length,
      "High Rated Buses": activeBuses.filter(b => parseFloat(b.rating || "0") >= 4.5).length,
      "Live Tracking": activeBuses.filter(b => b.originalData?.gps === true || b.originalData?.IsLiveTracking === true).length,
      "Volvo Buses": activeBuses.filter(b => String(getBusType(b)).toLowerCase().includes("volvo")).length,
    };
  }, [displayedBuses]);

  const dynamicFilters = [
    { name: "Primo Bus",         count: filterCounts["Primo Bus"],         icon: busicon1 },
    { name: "Free Cancellation",  count: filterCounts["Free Cancellation"],  icon: busicon2 },
    { name: "AC",                 count: filterCounts["AC"],                 icon: busicon3 },
    { name: "Sleeper",            count: filterCounts["Sleeper"],            icon: busicon4 },
    { name: "Single Seats",       count: filterCounts["Single Seats"],       icon: busicon5 },
    { name: "Seater",             count: filterCounts["Seater"],             icon: busicon6 },
    { name: "NON AC",             count: filterCounts["NON AC"],             icon: busicon7 },
    { name: "High Rated Buses",   count: filterCounts["High Rated Buses"],   icon: busicon8 },
    { name: "Live Tracking",      count: filterCounts["Live Tracking"],      icon: busicon9 },
    { name: "Volvo Buses",        count: filterCounts["Volvo Buses"],        icon: busicon10 },
  ];

  // Prefetch seat layout on hover for instant perceived loading
  const handlePrefetchSeats = (bus: NormalizedBus) => {
    try {
      if (bus.apiProvider === "VRL") {
        const ref = bus.originalData?.referenceNumber || bus.originalData?.ReferenceNumber;
        if (ref) fetchVrlSeatLayout(ref);
      } else if (bus.apiProvider === "SRS") {
        const schedId = bus.originalData?.schedule_id || bus.id;
        if (schedId) fetchSrsSeatLayout(schedId);
      } else if (bus.apiProvider.includes("EZEE")) {
        const finalEzeeSourceCode = bus.originalData?.fromStationCode || bus.originalData?.FromStationCode || searchParams.get("ezeeSourceCode") || "";
        const finalEzeeDestCode = bus.originalData?.toStationCode || bus.originalData?.ToStationCode || searchParams.get("ezeeDestCode") || "";
        if (bus.id && finalEzeeSourceCode && finalEzeeDestCode) {
          fetchEzeeSeatLayout(bus.id, finalEzeeSourceCode, finalEzeeDestCode, urlDateParam);
        }
      }
    } catch (err) {
      // Ignore prefetch errors silently so UI is unaffected
    }
  };

  const handleViewSeats = (bus: NormalizedBus, skipAuthCheck = false) => {
    // const isLoggedIn = localStorage.getItem("yesgo_user");
    // if (!isLoggedIn && !skipAuthCheck) {
    //   setPendingBus(bus);
    //   setShowAuthModal(true);
    //   return;
    // }

    const params = new URLSearchParams({
      provider: bus.apiProvider,
      operatorName: bus.operatorName || "",
      busType: getBusType(bus), 
      price: String(bus.price),
      sourceCity: urlSourceName,
      destinationCity: urlDestName,
      doj: urlDateParam,
      departureTime: formatTime(bus.departureTime || ""),
      arrivalTime: formatTime(bus.arrivalTime || ""),
      rating: bus.rating || ""
    });

    if (bus.apiProvider === "VRL") {
      const ref = bus.originalData?.referenceNumber || bus.originalData?.ReferenceNumber;
      if (!ref) { toast.error("Invalid VRL reference"); return; }
      params.append("refNum", ref);
    }

    if (bus.apiProvider === "SRS") {
      params.append("scheduleId", bus.originalData?.schedule_id || bus.id);
    }

    if (bus.apiProvider.includes("EZEE")) {
      params.append("tripCode", bus.id);
      const finalEzeeSourceCode =
        bus.originalData?.fromStationCode ||
        bus.originalData?.FromStationCode ||
        searchParams.get("ezeeSourceCode") || "";
      const finalEzeeDestCode =
        bus.originalData?.toStationCode ||
        bus.originalData?.ToStationCode ||
        searchParams.get("ezeeDestCode") || "";
      if (finalEzeeSourceCode) params.append("ezeeSourceId", finalEzeeSourceCode);
      if (finalEzeeDestCode) params.append("ezeeDestId", finalEzeeDestCode);
    }

    router.push(`/seat?${params.toString()}`);
  };

  const dateInputRef = useRef<HTMLInputElement>(null);
  const openCalendar = () => { if (dateInputRef.current) dateInputRef.current.showPicker(); };

  const accordionItems = [
    "Departure time from source", "Arrival time at destination", "Bus type",
    "Boarding points", "Bus Operator", "Dropping points", "Special bus features", "Amenities"
  ];

  const busOperators = useMemo(() => {
    const ops = buses.map(b => b.operatorName).filter(Boolean);
    return Array.from(new Set(ops)).sort();
  }, [buses]);

  const renderFilters = () => (
    <>
      <div className="sidebar-box mb-3">
        <div className="d-flex align-items-center gap-2 mb-3">
          <img
            src={easyFilterIcon.src}
            alt="filter"
            style={{ width: "22px" }}
          />
          <h6 className="fw-bold m-0 text-dark" style={{ fontSize: "16px" }}>{t.eazzyFilter || "Eazzy Filter"}</h6>
        </div>

        <div className="filter-search-wrapper mb-4">
          <input
            type="text"
            className="form-control ezzy-filter-search input-stage-focus"
            placeholder={t.filterBuses || "Filter buses"}
            value={filterInput}
            onChange={(e) => {
              setFilterInput(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleFilterSearch();
              }
            }}
          />
          <i className="bi bi-search search-icon" onClick={handleFilterSearch} style={{ cursor: "pointer" }}></i>
        </div>

        <div className="mb-2">
          <div className="text-dark fw-bold mb-3" style={{ fontSize: "15px" }}>{t.filterBuses || "Filter Buses"}</div>
          <div className="d-flex flex-column gap-2">
            {dynamicFilters.map((f, i) => (
              <div key={i} onClick={() => setActiveFilter(activeFilter === f.name ? null : f.name)}
                className={`filter-chip ${activeFilter === f.name ? "active" : ""}`}>
                <div className="d-flex align-items-center gap-3">
                  <img src={f.icon.src} width="18" height="18" style={{ objectFit: "contain" }} alt="" />
                  <span className={`fw-semibold ${activeFilter === f.name ? "text-primary" : "text-dark"}`}>{f.name}</span>
                </div>
                <span className="text-muted fw-medium" style={{ fontSize: "12px" }}>({f.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sidebar-box">
        {accordionItems.map((item, i) => (
          <div key={i} className={i !== 0 ? 'border-top' : ''}>
            <div className="d-flex justify-content-between align-items-center py-3 interactive-nav"
              style={{ cursor: "pointer" }} onClick={() => toggleAccordion(item)}>
              <span className="fw-bold text-dark" style={{ fontSize: "14px" }}>{item}</span>
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"
                style={{ transform: openAccordion === item ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', pointerEvents: 'none' }}>
                <path d="M1.5 1.5L6 6L10.5 1.5" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {openAccordion === item && (
              <div className="pb-3 pt-1">
                {item === "Departure time from source" && (
                  <div className="d-flex flex-column gap-2">
                    {["Before 6 AM", "6 AM to 12 PM", "12 PM to 6 PM", "After 6 PM"].map((time, idx) => (
                      <div className="form-check custom-checkbox" key={idx}>
                        <input className="form-check-input shadow-none" type="checkbox" id={`dep-${idx}`}
                          checked={selectedDepTimes.includes(time)} onChange={() => toggleArrayItem(setSelectedDepTimes, time)} />
                        <label className="form-check-label text-muted" style={{ fontSize: "13px", cursor: "pointer" }} htmlFor={`dep-${idx}`}>{time}</label>
                      </div>
                    ))}
                  </div>
                )}
                {item === "Arrival time at destination" && (
                  <div className="d-flex flex-column gap-2">
                    {["Before 6 AM", "6 AM to 12 PM", "12 PM to 6 PM", "After 6 PM"].map((time, idx) => (
                      <div className="form-check custom-checkbox" key={idx}>
                        <input className="form-check-input shadow-none" type="checkbox" id={`arr-${idx}`}
                          checked={selectedArrTimes.includes(time)} onChange={() => toggleArrayItem(setSelectedArrTimes, time)} />
                        <label className="form-check-label text-muted" style={{ fontSize: "13px", cursor: "pointer" }} htmlFor={`arr-${idx}`}>{time}</label>
                      </div>
                    ))}
                  </div>
                )}
                {item === "Bus type" && (
                  <div className="d-flex flex-column gap-2">
                    {["Seater", "Sleeper", "AC", "NON AC"].map((bt, idx) => (
                      <div className="form-check custom-checkbox" key={idx}>
                        <input className="form-check-input shadow-none" type="checkbox" id={`bt-${idx}`}
                          checked={selectedBusTypes.includes(bt)} onChange={() => toggleArrayItem(setSelectedBusTypes, bt)} />
                        <label className="form-check-label text-muted" style={{ fontSize: "13px", cursor: "pointer" }} htmlFor={`bt-${idx}`}>{bt}</label>
                      </div>
                    ))}
                  </div>
                )}
                {item === "Boarding points" && (
                  <div className="d-flex flex-column gap-2 custom-scrollbar" style={{ maxHeight: "150px", overflowY: "auto" }}>
                    {boardingPoints.length > 0 ? boardingPoints.map((bp, idx) => {
                      const val = typeof bp === "string" ? bp : bp.stage || bp.name || "Unknown Point";
                      return (
                        <div className="form-check custom-checkbox" key={idx}>
                          <input className="form-check-input shadow-none" type="checkbox" id={`bp-${idx}`}
                            checked={selectedBoarding.includes(val)} onChange={() => toggleArrayItem(setSelectedBoarding, val)} />
                          <label className="form-check-label text-muted" style={{ fontSize: "13px", cursor: "pointer" }} htmlFor={`bp-${idx}`}>{val}</label>
                        </div>
                      );
                    }) : <span style={{ fontSize: "12px", color: "#999" }}>No boarding points found</span>}
                  </div>
                )}
                {item === "Bus Operator" && (
                  <div className="d-flex flex-column gap-2 bus-operator-list">
                    {busOperators.length > 0 ? busOperators.map((op, idx) => {
                      const displayOp = translatedNames[op] || op;
                      return (
                        <div className="form-check custom-checkbox" key={idx}>
                          <input className="form-check-input shadow-none" type="checkbox" id={`op-${idx}`}
                            checked={selectedOperators.includes(op)} onChange={() => toggleArrayItem(setSelectedOperators, op)} />
                          <label className="form-check-label text-muted" style={{ fontSize: "13px", cursor: "pointer" }} htmlFor={`op-${idx}`}>{displayOp}</label>
                        </div>
                      );
                    }) : <span style={{ fontSize: "12px", color: "#999" }}>No operators found</span>}
                  </div>
                )}
                {item === "Dropping points" && (
                  <div className="d-flex flex-column gap-2 custom-scrollbar" style={{ maxHeight: "150px", overflowY: "auto" }}>
                    {droppingPoints.length > 0 ? droppingPoints.map((dp, idx) => {
                      const val = typeof dp === "string" ? dp : dp.stage || dp.name || "Unknown Point";
                      return (
                        <div className="form-check custom-checkbox" key={idx}>
                          <input className="form-check-input shadow-none" type="checkbox" id={`dp-${idx}`}
                            checked={selectedDropping.includes(val)} onChange={() => toggleArrayItem(setSelectedDropping, val)} />
                          <label className="form-check-label text-muted" style={{ fontSize: "13px", cursor: "pointer" }} htmlFor={`dp-${idx}`}>{val}</label>
                        </div>
                      );
                    }) : <span style={{ fontSize: "12px", color: "#999" }}>No dropping points found</span>}
                  </div>
                )}
                {item === "Amenities" && (
                  <div className="d-flex flex-column gap-2">
                    {["WIFI", "Water Bottle", "Blankets", "Charging Point", "Reading Light", "M-ticket"].map((amenity, idx) => (
                      <div className="form-check custom-checkbox" key={idx}>
                        <input className="form-check-input shadow-none" type="checkbox" id={`amenity-${idx}`}
                          checked={selectedAmenities.includes(amenity)} onChange={() => toggleArrayItem(setSelectedAmenities, amenity)} />
                        <label className="form-check-label text-muted" style={{ fontSize: "13px", cursor: "pointer" }} htmlFor={`amenity-${idx}`}>{amenity}</label>
                      </div>
                    ))}
                  </div>
                )}
                {item === "Special bus features" && (
                  <div className="d-flex flex-column gap-2">
                    {["Live Tracking", "Deep Cleaned Buses", "Vaccinated Staff", "Flexi Ticket"].map((feat, idx) => (
                      <div className="form-check custom-checkbox" key={idx}>
                        <input className="form-check-input shadow-none" type="checkbox" id={`feat-${idx}`}
                          checked={selectedFeatures.includes(feat)} onChange={() => toggleArrayItem(setSelectedFeatures, feat)} />
                        <label className="form-check-label text-muted" style={{ fontSize: "13px", cursor: "pointer" }} htmlFor={`feat-${idx}`}>{feat}</label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="bus-page-container large-screen-container">
      <ToastContainer />

      <style>{`
        .bus-operator-list {
          max-height: 220px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #0D2B4C #E5E7EB;
        }
        .bus-operator-list::-webkit-scrollbar {
          width: 8px;
        }
        .bus-operator-list::-webkit-scrollbar-track {
          background: #E5E7EB;
        }
        .bus-operator-list::-webkit-scrollbar-thumb {
          background: #0D2B4C;
          border-radius: 10px;
        }
        .filter-search-wrapper {
          position: relative;
          width: 90%;
          margin: 0 auto;
        }
        .ezzy-filter-search {
          width: 100%;
          height: 40px;
          border: 1px solid #cfd6e4;
          border-radius: 9999px !important;
          padding: 0 44px 0 14px !important;
          font-size: 14px;
        }
        .search-icon {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          color: #6b7280;
          z-index: 2;
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="navbar-custom sticky-top bg-white" style={{ zIndex: 1030 }}>
        <div className="container-fluid px-3 px-lg-5 py-3 d-flex justify-content-between align-items-center">
          <img src={logo.src} alt="YesGoBus" style={{ height: "42px", cursor: "pointer" }} onClick={() => router.push('/')} />

          <div className="d-none d-md-flex align-items-center gap-4 fw-medium" style={{ fontSize: "18px", color: "#374151" }}>
            <div className="position-relative">
              <div className="d-flex align-items-center gap-1 interactive-nav" style={{ cursor: "pointer" }} onClick={() => setShowLangDropdown(!showLangDropdown)}>
                {selectedLang} <i className="bi bi-chevron-down" style={{ fontSize: "14px" }}></i>
              </div>
              {showLangDropdown && (
                <ul className="list-group position-absolute shadow text-start" style={{ top: '100%', right: 0, zIndex: 1050, minWidth: '130px', marginTop: '10px' }}>
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <li key={lang.code} className="list-group-item list-group-item-action py-2"
                      style={{ cursor: 'pointer', fontSize: '15px' }}
                      onMouseDown={() => { handleLanguageChange(lang.code); setShowLangDropdown(false); }}>
                      {lang.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="d-flex align-items-center gap-1 interactive-nav" style={{ cursor: "pointer" }} onClick={() => router.push('/my-bookings')}>
              <i className="bi bi-list"></i> {t.bookings || "Bookings"}
            </div>

            <button onClick={() => router.push("/travel")} className="btn btn-primary-custom" style={{ fontSize: "18px" }}>
              {t.planMyTour || "Plan my tour"}
            </button>
          </div>

          <button className="btn border-0 shadow-none d-md-none p-0" data-bs-toggle="offcanvas" data-bs-target="#mobileSidebar">
            <i className="bi bi-list fs-2 text-dark"></i>
          </button>
        </div>
      </nav>

      {/* MOBILE OFFCANVAS MENU */}
      <div className="offcanvas offcanvas-start" tabIndex={-1} id="mobileSidebar">
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title fw-bold text-dark">Menu</h5>
          <button type="button" className="btn-close shadow-none" data-bs-dismiss="offcanvas"></button>
        </div>
        <div className="offcanvas-body">
          <ul className="list-unstyled fw-medium text-dark" style={{ fontSize: "18px" }}>
            <li className="mb-4 d-flex align-items-center gap-3">
              <i className="bi bi-globe fs-5"></i>
              <select className="form-select border-0 shadow-none p-0 fw-medium text-dark bg-transparent"
                style={{ fontSize: "18px", width: "auto" }} value={selectedLang} onChange={(e) => handleLanguageChange(e.target.value)}>
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </li>
            <li className="mb-4 d-flex align-items-center gap-3" style={{ cursor: "pointer" }} onClick={() => router.push('/my-bookings')} data-bs-dismiss="offcanvas">
              <i className="bi bi-list fs-5"></i> {t.bookings || "Bookings"}
            </li>
            <li className="mb-4 d-flex align-items-center gap-3"><i className="bi bi-question-circle fs-5"></i> {t.help || "Help"}</li>
            <li className="mt-5">
              <button onClick={() => router.push("/travel")} data-bs-dismiss="offcanvas" className="btn btn-primary-custom w-100 py-3 fs-6">
                {t.planMyTour || "Plan my tour"}
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="container-fluid px-3 px-lg-5">

        {/* TOP SEARCH BAR */}
        <div className="sticky-top bg-white pt-3 pb-2" style={{ top: "68px", zIndex: 1020 }}>
          <div className="responsive-search-bar flex-column flex-lg-row border rounded shadow-sm">
            <div className="px-3 px-lg-4 py-3 d-flex align-items-center flex-fill w-100 input-stage-focus border-bottom border-lg-0" style={{ position: "relative" }}>
              <img src={barIcon1.src} width="22" className="me-3" alt="from" />
              <div className="d-flex flex-column w-100 position-relative">
                <span style={{ fontSize: "12px", color: "#6B7280" }}>{t.from || "From"}</span>
                <input type="text" value={inputSource} onChange={handleSourceChange}
                  onFocus={async () => {
                    setShowSourceDropdown(true);
                    if (inputSource.length === 0) {
                      const recent = JSON.parse(localStorage.getItem("recentCities") || "[]");
                      if (recent.length > 0) {
                        setSourceOptions(recent);
                      } else {
                        const results = await fetchCitySuggestions("a");
                        setSourceOptions(results.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
                      }
                    }
                  }} onBlur={() => setTimeout(() => setShowSourceDropdown(false), 200)}
                  className="search-input" />
                {showSourceDropdown && sourceOptions.length > 0 && (
                  <ul className="list-group position-absolute w-100 shadow" style={{ zIndex: 1050, top: '100%', left: 0, maxHeight: '250px', overflowY: 'auto' }}>
                    {sourceOptions.map((city, idx) => (
                      <li key={idx} className="list-group-item list-group-item-action py-2" style={{ cursor: 'pointer', fontSize: '14px' }}
                        onMouseDown={() => { 
                          setInputSource(city.name); 
                          setSelectedSource(city); 
                          setShowSourceDropdown(false); 
                          const recent = JSON.parse(localStorage.getItem("recentCities") || "[]");
                          const updated = [city, ...recent.filter((c: any) => c.name !== city.name)].slice(0, 5);
                          localStorage.setItem("recentCities", JSON.stringify(updated));
                        }}>
                        <i className="bi bi-geo-alt me-2 text-muted"></i>
                        <span className="fw-medium">{city.name}</span>
                        <span className="text-muted small ms-1">, {city.state}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {divider}

            <div className="px-3 px-lg-4 py-3 d-flex align-items-center flex-fill w-100 input-stage-focus border-bottom border-lg-0" style={{ position: "relative" }}>
              <img src={barIcon1.src} width="22" className="me-3" alt="to" />
              <div className="d-flex flex-column w-100 position-relative">
                <span style={{ fontSize: "12px", color: "#6B7280" }}>{t.to || "To"}</span>
                <input type="text" value={inputDest} onChange={handleDestChange}
                  onFocus={async () => {
                    setShowDestDropdown(true);
                    if (inputDest.length === 0) {
                      const recent = JSON.parse(localStorage.getItem("recentCities") || "[]");
                      if (recent.length > 0) {
                        setDestOptions(recent);
                      } else {
                        const results = await fetchCitySuggestions("a");
                        setDestOptions(results.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
                      }
                    }
                  }} onBlur={() => setTimeout(() => setShowDestDropdown(false), 200)}
                  className="search-input" />
                {showDestDropdown && destOptions.length > 0 && (
                  <ul className="list-group position-absolute w-100 shadow" style={{ zIndex: 1050, top: '100%', left: 0, maxHeight: '250px', overflowY: 'auto' }}>
                    {destOptions.map((city, idx) => (
                      <li key={idx} className="list-group-item list-group-item-action py-2" style={{ cursor: 'pointer', fontSize: '14px' }}
                        onMouseDown={() => { 
                          setInputDest(city.name); 
                          setSelectedDest(city); 
                          setShowDestDropdown(false); 
                          const recent = JSON.parse(localStorage.getItem("recentCities") || "[]");
                          const updated = [city, ...recent.filter((c: any) => c.name !== city.name)].slice(0, 5);
                          localStorage.setItem("recentCities", JSON.stringify(updated));
                        }}>
                        <i className="bi bi-geo-alt me-2 text-muted"></i>
                        <span className="fw-medium">{city.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {divider}

            <div className="px-3 px-lg-4 py-3 d-flex align-items-center flex-fill w-100 interactive-nav border-bottom border-lg-0"
              style={{ cursor: "pointer", position: "relative" }} onClick={openCalendar}>
              <img src={barIcon2.src} width="22" className="me-3" alt="date" />
              <div className="d-flex flex-column">
                <span style={{ fontSize: "12px", color: "#6B7280" }}>{t.dateOfJourney || "Date"}</span>
                <span style={{ fontWeight: "700", fontSize: "16px" }}>{journeyDate}</span>
              </div>
              <input ref={dateInputRef} type="date" onChange={handleDateChange}
                style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
            </div>

            <div className="search-action-area d-flex align-items-center w-100 w-lg-auto px-3 py-3 py-lg-0 gap-2">
              <button onClick={handleToday} className={`day-btn ${selectedDay === "today" ? "active" : ""}`}>{t.today || "Today"}</button>
              <button onClick={handleTomorrow} className={`day-btn ${selectedDay === "tomorrow" ? "active" : ""}`}>{t.tomorrow || "Tomorrow"}</button>
              <button onClick={handleSearchClick} className="search-btn-circle ms-auto ms-lg-2">
                <img src={searchIcon.src} width="18" alt="search" />
              </button>
            </div>
          </div>
        </div>

        {/* BREADCRUMB */}
        <div className="d-flex align-items-center mb-4 mt-4 text-muted w-100 flex-wrap" style={{ fontSize: "14px" }}>
          <i className="bi bi-arrow-left text-dark me-2" style={{ cursor: "pointer" }} onClick={() => router.back()}></i>
          <span className="fw-bold text-dark fs-5">{urlSourceName}</span>
          <i className="bi bi-arrow-right mx-2"></i>
          <span className="fw-bold text-dark fs-5">{urlDestName}</span>
          <span className="ms-auto fw-medium d-none d-sm-block" style={{ fontSize: "13px", color: "#9CA3AF" }}>
            {urlSourceName} to {urlDestName} Bus
          </span>
        </div>

        <div className="row g-4 align-items-start">
          
          {/* SIDEBAR */}
          <div className="col-lg-3 d-none d-lg-block">
            <div className="custom-scrollbar pe-2" style={{ 
              position: "sticky", 
              top: "175px",
              zIndex: 1 
            }}>
              {renderFilters()}
            </div>
          </div>

          {/* BUS LIST */}
          <div className="col-lg-9">
            <div className="bg-white p-3 p-lg-4 rounded shadow-sm mb-4" style={{ border: `1px solid ${theme.border}` }}>
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center pb-3">
                <h5 className="fw-bold mb-3 mb-md-0 text-dark" style={{ fontSize: "20px" }}>
                  {loading ? (t.searching || "Searching...") : `${displayedBuses.length} ${t.busesFound || "Buses Found"}`}
                </h5>
                <div className="d-flex gap-3 gap-md-4 text-muted align-items-center flex-wrap" style={{ fontSize: "14px" }}>
                  <span>{t.sortBy || "Sort By"}</span>
                  <span className={`sort-tab ${sortBy === "Ratings" ? "active" : ""}`} onClick={() => setSortBy("Ratings")}>{t.ratings || "Ratings"}</span>
                  <span className={`sort-tab ${sortBy === "Departure time" ? "active" : ""}`} onClick={() => setSortBy("Departure time")}>{t.departureTime || "Departure Time"}</span>
                  <span className={`sort-tab ${sortBy === "Price" ? "active" : ""}`} onClick={() => setSortBy("Price")}>{t.price || "Price"}</span>
                </div>
              </div>
              <hr className="m-0 mb-3" style={{ borderTop: `1px solid ${theme.border}`, opacity: 1 }} />
              <div className="py-2 px-3 rounded-pill text-center d-inline-block bg-info-custom fw-semibold" style={{ fontSize: "13px" }}>
                50000+ searches on this route last month
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary-custom" style={{ width: '3rem', height: '3rem' }}></div>
              </div>
            ) : displayedBuses.length === 0 ? (
              <div className="text-center py-5 text-muted">{t.noBusesFound || "No buses found"}</div>
            ) : (
              displayedBuses.map((bus) => {
                const displayBusName = translatedNames[bus.operatorName] || bus.operatorName || "V Bus Holidays";
                const raw = bus.originalData || {};
                const displayBusType = getBusType(bus);
                
                console.log(
                  bus.operatorName,
                  bus.apiProvider,
                  bus.price,
                  bus.originalData
                );

                const displayDepTime = formatTime(bus.departureTime || "");

                let arrivalTime = bus.arrivalTime || "--:--";
                if (bus.apiProvider === 'VRL') {
                  arrivalTime = getVrlArrivalTime(raw);
                }
                const displayArrTime = formatTime(arrivalTime);
                let displayDuration = bus.duration;
                if (!displayDuration || displayDuration === "---" || displayDuration === "NaNh NaNm" || displayDuration === "--") {
                  displayDuration = raw.TravelTime || raw.Duration || raw.duration || "---";
                  if (raw.travelTime && !isNaN(parseInt(raw.travelTime))) {
                    const mins = parseInt(raw.travelTime);
                    displayDuration = `${Math.floor(mins / 60)}h ${mins % 60}m`;
                  }
                }
                if (displayDuration === "NaNh NaNm") displayDuration = "---";
                displayDuration = formatDuration(displayDuration);

                const displaySeats = getAvailableSeats(bus);

                const depTimeMatch = displayDepTime.match(/^([\d:]+)\s*([A-Z]{2})$/i);
                const depTimeVal = depTimeMatch ? depTimeMatch[1] : displayDepTime;
                const depTimeAmPm = depTimeMatch ? depTimeMatch[2] : "";

                const arrTimeMatch = displayArrTime.match(/^([\d:]+)\s*([A-Z]{2})$/i);
                const arrTimeVal = arrTimeMatch ? arrTimeMatch[1] : displayArrTime;
                const arrTimeAmPm = arrTimeMatch ? arrTimeMatch[2] : "";

                return (
                  <div key={bus.id} className="bus-card card border-0 shadow-sm mb-4" onMouseEnter={() => handlePrefetchSeats(bus)}>
                    <div className="card-body p-3 py-4">
                      <div className="row align-items-center g-3">

                        {/* Left: Operator */}
                        <div className="col-12 col-md-4 d-flex justify-content-between align-items-start pe-md-3">
                          <div className="overflow-hidden pe-2 flex-grow-1">
                            <div className="fw-bold mb-1" style={{ fontSize: "12px", letterSpacing: "0.5px" }}>
                              <span style={{ color: "#00AEEF" }}>YesGo</span><span style={{ color: "#0D2B4C" }}>Bus</span>
                            </div>
                            <h6 className="fw-bold mb-1 text-dark text-truncate" style={{ fontSize: "15px" }} title={displayBusName}>{displayBusName}</h6>
                            <p className="text-muted m-0 text-truncate" style={{ fontSize: "12px" }} title={displayBusType}>
                              {displayBusType}
                            </p>
                          </div>
                          <div className="text-end ms-2 flex-shrink-0 d-flex flex-column align-items-end">
                            <div className="d-inline-flex align-items-center justify-content-center text-white fw-bold rounded" 
                                 style={{ backgroundColor: Number(bus.rating) >= 4.0 ? '#10B981' : '#F59E0B', padding: '4px 8px', fontSize: '12px' }}>
                              <i className="bi bi-star-fill me-1" style={{ fontSize: '10px' }}></i> {bus.rating || "4.6"}
                            </div>
                            <div className="text-muted mt-1 d-flex align-items-center gap-1 fw-medium" style={{ fontSize: "11px" }}>
                              <i className="bi bi-people-fill"></i>
                              {(bus as any).availableSeaterCount || displaySeats} Seats Left
                            </div>
                          </div>
                        </div>

                        {/* Middle: Timings */}
                        <div className="col-12 col-md-5 d-flex justify-content-between align-items-center my-3 my-md-0 px-2 px-md-4">
                          <div className="text-end flex-shrink-0" style={{ width: '60px' }}>
                            <div className="fw-bold text-dark lh-1" style={{ fontSize: "18px" }}>{depTimeVal}</div>
                            <div className="text-muted mt-1 fw-bold" style={{ fontSize: "11px" }}>{depTimeAmPm}</div>
                          </div>
                          <div className="text-center flex-grow-1 px-3 d-flex flex-column align-items-center">
                            <div className="text-muted small fw-medium" style={{ fontSize: "11px" }}>{displayDuration !== "---" ? displayDuration : "6h 55m"}</div>
                            <div style={{ width: '100%', height: '1px', backgroundColor: '#E2E8F0', margin: '4px 0' }}></div>
                          </div>
                          <div className="text-start flex-shrink-0" style={{ width: '60px' }}>
                            <div className="fw-bold text-dark lh-1" style={{ fontSize: "18px" }}>{arrTimeVal}</div>
                            <div className="text-muted mt-1 fw-bold" style={{ fontSize: "11px" }}>{arrTimeAmPm}</div>
                          </div>
                        </div>

                        {/* Right: Price & CTA */}
                        <div className="col-12 col-md-3 d-flex flex-row flex-md-column justify-content-between align-items-center align-items-md-end mt-1 mt-md-0 ps-md-2">
                          <div className="d-flex flex-column align-items-start align-items-md-end flex-shrink-0">
                            <span className="text-muted mb-1 d-none d-md-block" style={{ fontSize: "11px" }}>Starts from</span>
                            <div className="d-flex align-items-baseline gap-1 mb-0 mb-md-2"> {/* Use bus.price directly */}
                              <span className="fw-bold text-dark lh-1" style={{ fontSize: "20px" }}>₹{bus.price > 0 ? bus.price : 750}</span>
                            </div>
                          </div>
                          <button onClick={() => handleViewSeats(bus)} className="view-seats-btn shadow-sm w-100 ms-3 ms-md-0" style={{ fontSize: '13px', padding: '8px 0', maxWidth: '140px' }}>
                            {t.viewSeats || "View Seats"}
                          </button>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* MOBILE FLOATING FILTER */}
      <div className="d-lg-none fixed-bottom text-center mb-4" style={{ zIndex: 1050 }}>
        <button className="btn text-white shadow-lg rounded-pill px-4 py-2 fw-bold d-inline-flex align-items-center gap-2"
          data-bs-toggle="offcanvas" data-bs-target="#mobileFilterDrawer" style={{ backgroundColor: "#0D2B4C" }}>
          <i className="bi bi-filter-left fs-5"></i> FILTER
        </button>
      </div>

      {/* MOBILE FILTER DRAWER */}
      <div className="offcanvas offcanvas-bottom h-75 rounded-top-4" tabIndex={-1} id="mobileFilterDrawer">
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title fw-bold">Filters</h5>
          <button type="button" className="btn-close shadow-none" data-bs-dismiss="offcanvas"></button>
        </div>
        <div className="offcanvas-body p-3 p-md-4 custom-scrollbar">{renderFilters()}</div>
        <div className="offcanvas-footer bg-white p-3 border-top text-center">
          <button className="btn text-white w-100 py-3 fw-bold rounded-3"
            style={{ backgroundColor: "#00AEEF", border: "none" }} data-bs-dismiss="offcanvas">
            APPLY FILTERS
          </button>
        </div>
      </div>

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered mx-3 mx-md-auto">
            <div className="modal-content border-0 overflow-hidden shadow-lg" style={{ borderRadius: '15px' }}>
              <div className="row g-0">
                {/* Left branding */}
                <div className="col-md-5 text-white d-none d-md-flex flex-column align-items-center justify-content-center p-5"
                  style={{ background: 'linear-gradient(180deg, #0e3153 0%, #00AEEF 100%)' }}>
                  <img src={logo.src} alt="Logo" width="180" />
                  <h3 className="mt-4 fw-bold text-center">Welcome to YesGoBus</h3>
                  <button onClick={() => handleGoogleLogin()}
                    className="btn btn-light w-100 mt-5 py-2 shadow-sm d-flex align-items-center justify-content-center border-0 fw-bold"
                    style={{ color: '#5f6368', fontSize: '14px', borderRadius: '8px' }}>
                    <svg className="me-2" width="18" height="18" viewBox="0 0 18 18">
                      <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84c-.21 1.12-.84 2.07-1.79 2.7l2.85 2.21c1.67-1.53 2.63-3.79 2.63-6.56z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.85-2.21c-.79.53-1.8.85-3.11.85-2.39 0-4.41-1.61-5.14-3.77L.94 13.09C2.42 16.03 5.48 18 9 18z" fill="#34A853"/>
                      <path d="M3.86 10.74c-.19-.56-.3-1.16-.3-1.74s.11-1.18.3-1.74L.94 4.91C.34 6.13 0 7.52 0 9s.34 2.87.94 4.09l2.92-2.35z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0 5.48 0 2.42 1.97.94 4.91l2.92 2.35c.73-2.16 2.75-3.77 5.14-3.77z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                </div>

                {/* Right form */}
                <div className="col-12 col-md-7 p-4 p-md-5 bg-white position-relative">
                  <button onClick={() => { setShowAuthModal(false); setIsOtpSent(false); }}
                    className="btn-close position-absolute top-0 end-0 m-3 shadow-none"></button>
                  <h4 className="fw-bold mb-4" style={{ color: '#033564' }}>{authMode === 'login' ? 'Login' : 'Create Account'}</h4>

                  <button onClick={() => handleGoogleLogin()}
                    className="btn border w-100 mb-4 py-2 shadow-sm d-flex d-md-none align-items-center justify-content-center fw-bold bg-white"
                    style={{ color: '#5f6368', fontSize: '14px', borderRadius: '8px' }}>
                    <svg className="me-2" width="18" height="18" viewBox="0 0 18 18">
                      <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84c-.21 1.12-.84 2.07-1.79 2.7l2.85 2.21c1.67-1.53 2.63-3.79 2.63-6.56z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.85-2.21c-.79.53-1.8.85-3.11.85-2.39 0-4.41-1.61-5.14-3.77L.94 13.09C2.42 16.03 5.48 18 9 18z" fill="#34A853"/>
                      <path d="M3.86 10.74c-.19-.56-.3-1.16-.3-1.74s.11-1.18.3-1.74L.94 4.91C.34 6.13 0 7.52 0 9s.34 2.87.94 4.09l2.92-2.35z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0 5.48 0 2.42 1.97.94 4.91l2.92 2.35c.73-2.16 2.75-3.77 5.14-3.77z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>

                  <div className="d-flex gap-2 mb-4 p-1 bg-light rounded-pill border">
                    <button onClick={() => { setAuthMode('login'); setIsOtpSent(false); }}
                      className={`btn flex-fill rounded-pill fw-bold py-2 ${authMode === 'login' ? 'btn-primary border-0 shadow' : 'btn-light border-0 text-muted'}`}>Login</button>
                    <button onClick={() => { setAuthMode('signup'); setIsOtpSent(false); }}
                      className={`btn flex-fill rounded-pill fw-bold py-2 ${authMode === 'signup' ? 'btn-primary border-0 shadow' : 'btn-light border-0 text-muted'}`}>Signup</button>
                  </div>

                  {!isOtpSent ? (
                    <form onSubmit={handleAuthAction}>
                      {authMode === 'signup' && (
                        <input type="text" className="form-control py-3 mb-3 bg-light border-0 shadow-sm" placeholder="Full Name"
                          value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
                      )}
                      <input type="tel" className="form-control py-3 mb-3 bg-light border-0 shadow-sm" placeholder="Mobile Number"
                        value={formData.mobileNumber} onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })} required />
                      {authMode === 'signup' && (
                        <>
                          <input type="email" className="form-control py-3 mb-3 bg-light border-0 shadow-sm" placeholder="Email"
                            value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                          <div className="d-flex gap-2 mb-4">
                            {['Male', 'Female', 'Other'].map(g => (
                              <button key={g} type="button" onClick={() => setFormData({ ...formData, gender: g })}
                                className={`btn flex-fill py-2 rounded-pill border ${formData.gender === g ? 'btn-primary border-0' : 'btn-outline-secondary'}`}
                                style={formData.gender === g ? { background: '#033564', color: 'white' } : { fontSize: '14px' }}>{g}</button>
                            ))}
                          </div>
                        </>
                      )}
                      <button type="submit" className="btn btn-primary w-100 py-3 fw-bold border-0 shadow"
                        style={{ background: '#00AEEF', borderRadius: '8px' }} disabled={loadingAuth}>
                        {loadingAuth ? 'Sending...' : 'Get OTP'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerify} className="text-center">
                      <p className="text-muted small">6-digit OTP sent to +91 {formData.mobileNumber}</p>
                      <input type="text" className="form-control py-3 mb-4 text-center fw-bold fs-3 border-primary shadow-none ls-lg"
                        placeholder="XXXXXX" maxLength={6} value={formData.otp}
                        onChange={(e) => setFormData({ ...formData, otp: e.target.value })} required />
                      <button type="submit" className="btn btn-success w-100 py-3 fw-bold border-0 shadow mb-3" style={{ borderRadius: '8px' }}>Verify & Login</button>
                      <div className="d-flex justify-content-between">
                        <button type="button" className="btn btn-link text-decoration-none shadow-none p-0 small fw-medium" onClick={() => setIsOtpSent(false)}>Change Number</button>
                        <button type="button" className="btn btn-link text-decoration-none shadow-none p-0 small fw-medium" onClick={handleAuthAction}>Resend OTP</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BusListPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-5">
        <div className="spinner-border text-primary-custom" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    }>
      <BusListContent />
    </Suspense>
  );
}