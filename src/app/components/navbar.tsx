'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { GoogleLogin } from '@react-oauth/google';
import { ToastContainer, toast } from 'react-toastify';


// Assets
import logo from './assest/logo.svg';
import icon1 from './assest/icon 1.svg';
import icon2 from './assest/icon 2.svg';
import icon3 from './assest/icon 3.svg';
import icon4 from './assest/icon 4.svg';
import icon5 from './assest/icon 5.svg';
import icon6 from './assest/icon 6.svg';

// API
import { requestLoginOtp, requestSignupOtp, verifyOtp } from './api';

// Supported Languages List
const SUPPORTED_LANGUAGES = [
  { code: 'EN', name: 'English' },
  { code: 'TA', name: 'Tamil' },
  { code: 'KN', name: 'Kannada' },
  { code: 'TE', name: 'Telugu' },
  { code: 'ML', name: 'Malayalam' }
];

// Local Navbar Translations
const navbarTranslations: Record<string, any> = {
  EN: { bus: "Bus", travel: "Tours & Travel", offers: "Offers", about: "About Us", help: "Need Help", login: "Login/Signup", logout: "Logout", menu: "Menu", welcome: "Welcome to YesGoBus", continueGoogle: "Continue with Google", lang: "Language" },
  TA: { bus: "பேருந்து", travel: "சுற்றுலா & பயணம்", offers: "சலுகைகள்", about: "எங்களை பற்றி", help: "உதவி தேவை", login: "உள்நுழை/பதிவுசெய்", logout: "வெளியேறு", menu: "பட்டியல்", welcome: "YesGoBus-க்கு வரவேற்கிறோம்", continueGoogle: "Google உடன் தொடரவும்", lang: "மொழி" },
  KN: { bus: "ಬಸ್", travel: "ಪ್ರವಾಸ ಮತ್ತು ಪ್ರಯಾಣ", offers: "ಕೊಡುಗೆಗಳು", about: "ನಮ್ಮ ಬಗ್ಗೆ", help: "ಸಹಾಯ ಬೇಕೇ", login: "ಲಾಗಿನ್/ಸೈನ್ ಅಪ್", logout: "ಲಾಗ್ ಔಟ್", menu: "ಮೆನು", welcome: "YesGoBus ಗೆ ಸುಸ್ವಾಗತ", continueGoogle: "Google ನೊಂದಿಗೆ ಮುಂದುವರಿಯಿರಿ", lang: "ಭಾಷೆ" },
  TE: { bus: "బస్సు", travel: "టూర్స్ & ట్రావెల్", offers: "ఆఫర్లు", about: "మా గురించి", help: "సహాయం కావాలా", login: "లాగిన్/సైన్ అప్", logout: "లాగ్ అవుట్", menu: "మెను", welcome: "YesGoBus కు స్వాగతం", continueGoogle: "Google తో కొనసాగండి", lang: "భాష" },
  ML: { bus: "ബസ്", travel: "ടൂർസ് & ട്രാവൽ", offers: "ഓഫറുകൾ", about: "ഞങ്ങളെക്കുറിച്ച്", help: "സഹായം ആവശ്യമുണ്ടോ", login: "ലോഗിൻ/സൈൻഅപ്പ്", logout: "ലോഗൗട്ട്", menu: "മെനു", welcome: "YesGoBus-ലേക്ക് സ്വാഗതം", continueGoogle: "Google ഉപയോഗിച്ച് തുടരുക", lang: "ഭാഷ" }
};

const Navbar = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Language State
  const [currentLangCode, setCurrentLangCode] = useState('EN');

  const [user, setUser] = useState<{
    name: string;
    email?: string;
    phone?: string;
    _id?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    mobileNumber: '',
    fullName: '',
    email: '',
    gender: '',
    otp: ''
  });

  useEffect(() => {
    // Load User
    const savedUser = localStorage.getItem('yesgo_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user session.");
      }
    }

    // Load Language
    const savedLang = localStorage.getItem('yesgo_lang');
    if (savedLang) {
      setCurrentLangCode(savedLang);
    }

    // 🔥 THIS LISTENS FOR THE EVENT FROM BUS LIST
    const handleOpenModal = () => setShowAuthModal(true);
    window.addEventListener('openAuthModal', handleOpenModal);

    return () => {
      window.removeEventListener('openAuthModal', handleOpenModal);
    };
  }, []);

  // Handle language change and notify other components
  const handleLanguageChange = (code: string) => {
    setCurrentLangCode(code);
    localStorage.setItem('yesgo_lang', code);
    window.dispatchEvent(new Event('languageChanged'));
  };

  // Get current translations based on selected language
  const t = navbarTranslations[currentLangCode] || navbarTranslations['EN'];
  const currentLangName = SUPPORTED_LANGUAGES.find(l => l.code === currentLangCode)?.name || 'English';

  const navItems = [
    { name: t.bus, icon: icon1, link: '/' },
    { name: t.travel, icon: icon2, link: '/travel' },
    { name: t.offers, icon: icon3, link: '#' },
    { name: t.about, icon: icon4, link: '#' },
    { name: t.help, icon: icon5, link: '#' },
  ];

  // Custom clean toast configuration
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    toast(msg, {
      type: type,
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: true,
      theme: "light",
      style: {
        borderRadius: '10px',
        fontWeight: '600',
        fontSize: '14px',
        color: '#033564',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }
    });
  };

const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = authMode === 'login' 
        ? await requestLoginOtp(formData.mobileNumber)
        : await requestSignupOtp({
            mobileNumber: formData.mobileNumber,
            fullName: formData.fullName,
            email: formData.email,
            gender: formData.gender
          });

      if (result.status === 200 || result.message?.toLowerCase().includes("sent")) {
        setIsOtpSent(true);
        showToast(`OTP Sent to +91 ${formData.mobileNumber}`);
      } else if (result.message?.toLowerCase().includes("already in use")) {
        showToast("Account exists. Switching to Login.", "info");
        setAuthMode('login');
        setIsOtpSent(false);
      } else if (result.message?.toLowerCase().includes("not found")) { 
        // 👇 ADD THIS BLOCK 👇
        showToast("Number not registered. Switching to Signup.", "info");
        setAuthMode('signup');
        setIsOtpSent(false);
      } else {
        showToast(result.message || "Request failed", "error");
      }
    } catch (err) { 
      showToast("Server connection error", "error"); 
    }
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await verifyOtp(formData.mobileNumber, formData.otp, authMode);
      
      if (result.status === 200 || result.success) {
        const userData = result?.data?.user || result?.user || result?.data || {};
        
        const userId = userData?._id || userData?.id || userData?.userId || null;

        const extractedName = userData?.name || userData?.fullName || userData?.firstName || formData.fullName || "User";

        loginUser({ 
          name: extractedName, 
          email: userData?.email || formData.email || '',
          phone: userData?.mobileNumber || formData.mobileNumber,
          _id: userId 
        });
        
        showToast(`Welcome back, ${extractedName}!`);
      } else {
        showToast(result.message || "Invalid OTP. Please check and try again.", "error");
      }
    } catch (err) { 
      showToast("Verification failed", "error"); 
    }
    setLoading(false);
  };

  const loginUser = (userData: any) => {
    const finalName = userData.name || 'User';

    setUser({ 
      name: finalName, 
      email: userData.email,
      phone: userData.phone,
      _id: userData._id
    });
    
    localStorage.setItem('yesgo_user', JSON.stringify({ 
      name: finalName, 
      email: userData.email,
      phone: userData.phone,
      _id: userData._id
    }));

    localStorage.setItem('name', finalName);
    
    if (userData._id) localStorage.setItem('userId', userData._id);
    if (userData.phone) localStorage.setItem('phone', userData.phone);
    if (userData.email) localStorage.setItem('email', userData.email);

    setShowAuthModal(false);
    setIsOtpSent(false);
    setFormData({ mobileNumber: '', fullName: '', email: '', gender: '', otp: '' });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('yesgo_user');
    
    localStorage.removeItem('userId');
    localStorage.removeItem('phone');
    localStorage.removeItem('email');
    localStorage.removeItem('name');
    
    showToast("You have been logged out.", "info");
  };

  return (
    <>
      <style>{`
        .nav-link-wrapper {
          transition: all 0.3s ease;
        }
        .nav-text-hover {
          color: #033564;
          transition: color 0.3s ease;
        }
        .nav-link-wrapper:hover .nav-text-hover,
        .nav-link-wrapper:active .nav-text-hover {
          color: #00AEEF !important;
        }
        .nav-link-wrapper img {
          transition: transform 0.3s ease;
        }
        .nav-link-wrapper:hover img {
          transform: scale(1.15);
        }
      `}</style>

      <ToastContainer />
      <div className="large-screen-container">
      <nav className="navbar navbar-expand-xl p-0 sticky-top w-100 bg-white border-bottom shadow-sm" 
           style={{ background: 'linear-gradient(90deg, #FFFFFF 0%, #B4E7F3 35%)', minHeight: '103px' }}>
        <div className="container-fluid px-3 px-lg-5 d-flex align-items-center justify-content-between h-100" >
          
          {/* DESKTOP LOGO (Hidden on mobile) */}
          <Link href="/" className="navbar-brand d-none d-xl-block" style={{ cursor: 'pointer' }}>
            <Image src={logo} alt="YesGoBus" width={150} height={50} priority />
          </Link>

          {/* MOBILE QUICK LINKS (Visible only on mobile, replacing the logo in the center) */}
          <div className="d-flex d-xl-none flex-grow-1 justify-content-end align-items-center gap-4 pe-3">
            <Link href="/" className="d-flex align-items-center text-decoration-none nav-link-wrapper" style={{ cursor: 'pointer' }}>
              <Image src={icon1} alt="Bus" width={22} height={22} className="me-2" />
              <span className="fw-semibold nav-text-hover" style={{ fontSize: '15px', color: '#033564' }}>{t.bus}</span>
            </Link>
            <Link href="/travel" className="d-flex align-items-center text-decoration-none nav-link-wrapper" style={{ cursor: 'pointer' }}>
              <Image src={icon2} alt="Tours & Travel" width={22} height={22} className="me-2" />
              <span className="fw-semibold nav-text-hover" style={{ fontSize: '15px', color: '#033564' }}>{t.travel}</span>
            </Link>
          </div>

          {/* TOGGLER */}
          <button className="navbar-toggler border-0 shadow-none text-primary" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasNavbar">
            <i className="bi bi-list display-6"></i>
          </button>

          <div className="d-none d-xl-flex align-items-center h-100">
            {navItems.map((item, index) => (
              <Link href={item.link} key={index} className="d-flex align-items-center ms-4 ms-xxl-5 text-nowrap text-decoration-none nav-link-wrapper" style={{ cursor: 'pointer' }}>
                <Image src={item.icon} alt={item.name} width={22} height={22} className="me-2" />
                <span className="fw-medium nav-text-hover" style={{ fontSize: '15px' }}>{item.name}</span>
              </Link>
            ))}

            {/* LANGUAGE SELECTOR - DESKTOP */}
            <div className="dropdown ms-4 ms-xxl-5">
              <div className="d-flex align-items-center text-nowrap dropdown-toggle nav-link-wrapper" data-bs-toggle="dropdown" style={{ cursor: 'pointer' }}>
                <i className="bi bi-translate fs-5 me-2 nav-text-hover"></i>
                <span className="fw-medium nav-text-hover" style={{ fontSize: '15px' }}>{currentLangName}</span>
              </div>
              <ul className="dropdown-menu shadow-sm border-0 mt-3 py-2" style={{ borderRadius: '10px', minWidth: '120px' }}>
                {SUPPORTED_LANGUAGES.map((lang, index) => (
                  <li key={index}>
                    <button 
                      className="dropdown-item py-2 fw-medium nav-link-wrapper" 
                      onClick={() => handleLanguageChange(lang.code)} 
                      style={{ cursor: 'pointer' }}
                    >
                      {lang.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            
            {user ? (
              <div className="dropdown ms-4 ms-xxl-4">
                <div className="d-flex align-items-center text-nowrap dropdown-toggle nav-link-wrapper" data-bs-toggle="dropdown" style={{ cursor: 'pointer' }}>
                  <i className="bi bi-person-circle fs-4 me-2 nav-text-hover"></i>
                  <span className="fw-medium nav-text-hover" style={{ fontSize: '15px' }}>{user.name}</span>
                </div>
                <ul className="dropdown-menu shadow-sm border-0 mt-3 py-2" style={{ borderRadius: '10px', minWidth: '150px' }}>
                  <li>
                    <button className="dropdown-item text-danger py-2 d-flex align-items-center fw-medium nav-link-wrapper" onClick={handleLogout} style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}>
                      <i className="bi bi-box-arrow-right me-3 fs-5"></i>{t.logout}
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="d-flex align-items-center ms-4 ms-xxl-4 text-nowrap nav-link-wrapper" onClick={() => setShowAuthModal(true)} style={{ cursor: 'pointer' }}>
                <Image src={icon6} alt="Login" width={22} height={22} className="me-2" />
                <span className="fw-medium nav-text-hover" style={{ fontSize: '15px' }}>{t.login}</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* AUTH MODAL */}
      {/* Disabled the login modal window without breaking inner comments */}
      {showAuthModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered mx-3 mx-md-auto">
            <div className="modal-content border-0 overflow-hidden shadow-lg" style={{ borderRadius: '15px' }}>
              <div className="row g-0">
                {/* Left Branding Side (Desktop Only) */}
                <div className="col-md-5 text-white d-none d-md-flex flex-column align-items-center justify-content-center p-5" 
                     style={{ background: 'linear-gradient(180deg, #0e3153 0%, #00AEEF 100%)' }}>
                  <Image src={logo} alt="Logo" width={180} />
                  <h3 className="mt-4 fw-bold text-center">{t.welcome}</h3>
                  
                  <div className="mt-5 w-100">
                    <GoogleLogin
                      onSuccess={async (credentialResponse) => {
                        console.log("========== GOOGLE ==========");
                        console.log("JWT Token:");
                        console.log(credentialResponse.credential);

                        const response = await fetch(
                          "https://apis.yesgobus.com/api/user/googleSignIn",
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              jwtToken: credentialResponse.credential,
                            }),
                          }
                        );

                        const result = await response.json();

                        console.log("Backend Response:");
                        console.log(result);

                        if (result.status === 200) {
                          const userData = {
                            name: result.data.fullName,
                            email: result.data.email,
                            phone: result.data.phoneNumber,
                            _id: result.data._id,
                          };
                          loginUser(userData);
                          console.log("Saved User", {
                            name: result.data.fullName,
                            email: result.data.email,
                            phone: result.data.phoneNumber,
                          });
                        }
                      }}
                      onError={() => {
                        console.log("Google Login Failed");
                      }}
                    />
                  </div>
                </div>

                {/* Right Form Side (All Devices) */}
                <div className="col-12 col-md-7 p-4 p-md-5 bg-white position-relative">
                  <button onClick={() => {setShowAuthModal(false); setIsOtpSent(false);}} className="btn-close position-absolute top-0 end-0 m-3 shadow-none"></button>
                  <h4 className="fw-bold mb-4" style={{ color: '#033564' }}>{authMode === 'login' ? 'Login' : 'Create Account'}</h4>

                  {/* Mobile-only Google Login Button */}
                  <div className="d-md-none mb-4">
                    <GoogleLogin
                      onSuccess={async (credentialResponse) => {
                        console.log("========== GOOGLE ==========");
                        console.log("JWT Token:");
                        console.log(credentialResponse.credential);

                        const response = await fetch(
                          "https://apis.yesgobus.com/api/user/googleSignIn",
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              jwtToken: credentialResponse.credential,
                            }),
                          }
                        );

                        const result = await response.json();

                        console.log("Backend Response:");
                        console.log(result);

                        if (result.status === 200) {
                          const userData = {
                            name: result.data.fullName,
                            email: result.data.email,
                            phone: result.data.phoneNumber,
                            _id: result.data._id,
                          };
                          loginUser(userData);
                          console.log("Saved User", {
                            name: result.data.fullName,
                            email: result.data.email,
                            phone: result.data.phoneNumber,
                          });
                        }
                      }}
                      onError={() => {
                        console.log("Google Login Failed");
                      }}
                    />
                  </div>

                  <div className="d-flex gap-2 mb-4 p-1 bg-light rounded-pill border">
                    <button onClick={() => {setAuthMode('login'); setIsOtpSent(false);}} className={`btn flex-fill rounded-pill fw-bold py-2 ${authMode === 'login' ? 'btn-primary border-0 shadow' : 'btn-light border-0 text-muted'}`}>Login</button>
                    <button onClick={() => {setAuthMode('signup'); setIsOtpSent(false);}} className={`btn flex-fill rounded-pill fw-bold py-2 ${authMode === 'signup' ? 'btn-primary border-0 shadow' : 'btn-light border-0 text-muted'}`}>Signup</button>
                  </div>

                  {!isOtpSent ? (
                    <form onSubmit={handleAuthAction}>
                      {authMode === 'signup' && (
                        <input type="text" className="form-control py-3 mb-3 bg-light border-0 shadow-sm" placeholder="Full Name" 
                               value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} required />
                      )}
                      <input type="tel" className="form-control py-3 mb-3 bg-light border-0 shadow-sm" placeholder="Mobile Number" 
                             value={formData.mobileNumber} onChange={(e) => setFormData({...formData, mobileNumber: e.target.value})} required />
                      {authMode === 'signup' && (
                        <>
                          <input type="email" className="form-control py-3 mb-3 bg-light border-0 shadow-sm" placeholder="Email" 
                                 value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                          <div className="d-flex gap-2 mb-4">
                            {['Male', 'Female', 'Other'].map(g => (
                              <button key={g} type="button" onClick={() => setFormData({...formData, gender: g})} 
                                      className={`btn flex-fill py-2 rounded-pill border ${formData.gender === g ? 'btn-primary border-0' : 'btn-outline-secondary'}`}
                                      style={formData.gender === g ? {background: '#033564', color: 'white'} : {fontSize: '14px'}}>{g}</button>
                            ))}
                          </div>
                        </>
                      )}
                      <button type="submit" className="btn btn-primary w-100 py-3 fw-bold border-0 shadow" style={{ background: '#00AEEF', borderRadius: '8px' }} disabled={loading}>
                        {loading ? 'Sending...' : 'Get OTP'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerify} className="text-center">
                      <p className="text-muted small">6-digit OTP sent to +91 {formData.mobileNumber}</p>
                      <input type="text" className="form-control py-3 mb-4 text-center fw-bold fs-3 border-primary shadow-none ls-lg" 
                             placeholder="XXXXXX" maxLength={6} value={formData.otp} 
                             onChange={(e) => setFormData({...formData, otp: e.target.value})} required />
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

      {/* MOBILE SIDEBAR */}
      <div className="offcanvas offcanvas-end border-0" tabIndex={-1} id="offcanvasNavbar">
        <div className="offcanvas-header border-bottom py-4 bg-light">
          {user ? (
            <div className="d-flex align-items-center">
               <i className="bi bi-person-circle fs-1 me-3" style={{ color: '#033564' }}></i>
               <div>
                  <h5 className="offcanvas-title fw-bold m-0" style={{ color: '#033564' }}>{user.name}</h5>
               </div>
            </div>
          ) : (
            <h5 className="offcanvas-title fw-bold" style={{ color: '#033564' }}>{t.menu}</h5>
          )}
          <button type="button" className="btn-close shadow-none" data-bs-dismiss="offcanvas"></button>
        </div>
        <div className="offcanvas-body p-0">
          <ul className="navbar-nav justify-content-end flex-grow-1">
            {navItems.map((item, index) => (
              <li key={index} className="nav-item border-bottom nav-link-wrapper">
                <Link href={item.link} className="nav-link d-flex align-items-center p-4 text-decoration-none" data-bs-dismiss="offcanvas">
                  <Image src={item.icon} alt={item.name} width={24} height={24} className="me-3" />
                  <span className="fw-semibold nav-text-hover" style={{ fontSize: '16px' }}>{item.name}</span>
                </Link>
              </li>
            ))}

            {/* LANGUAGE SELECTOR - MOBILE */}
            <li className="nav-item border-bottom nav-link-wrapper">
              <div className="dropdown w-100">
                <div className="nav-link d-flex align-items-center p-4 w-100 dropdown-toggle" data-bs-toggle="dropdown" style={{ cursor: 'pointer' }}>
                  <i className="bi bi-translate fs-4 me-3 nav-text-hover"></i>
                  <span className="fw-semibold nav-text-hover" style={{ fontSize: '16px' }}>{t.lang} ({currentLangName})</span>
                </div>
                <ul className="dropdown-menu shadow-sm border-0 w-100 py-2">
                  {SUPPORTED_LANGUAGES.map((lang, index) => (
                    <li key={index}>
                      <button 
                        className="dropdown-item py-2 px-4 fw-medium nav-link-wrapper" 
                        onClick={() => handleLanguageChange(lang.code)} 
                        style={{ cursor: 'pointer' }}
                      >
                        {lang.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
            
            {user ? (
               <li className="nav-item border-bottom nav-link-wrapper">
                  <button className="nav-link d-flex align-items-center p-4 w-100 border-0 bg-transparent text-danger fw-bold shadow-none" onClick={() => { handleLogout(); }} data-bs-dismiss="offcanvas">
                    <i className="bi bi-box-arrow-right me-3 fs-4"></i>
                    <span style={{ fontSize: '16px' }}>{t.logout}</span>
                  </button>
               </li>
            ) : (
              <li className="nav-item border-bottom nav-link-wrapper" onClick={() => setShowAuthModal(true)}>
                <div className="nav-link d-flex align-items-center p-4" data-bs-dismiss="offcanvas" style={{ cursor: 'pointer' }}>
                  <Image src={icon6} alt="Login" width={24} height={24} className="me-3" />
                  <span className="fw-semibold nav-text-hover" style={{ fontSize: '16px' }}>{t.login}</span>
                </div>
              </li>
            )}
          </ul>
        </div>
      </div>
      </div>
    </>
  );
};

export default Navbar;