"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image'; // Import Next.js Image component
import playStoreQr from '../assest/PlaystoreQr.jpeg'; // QR for Play Store
import appStoreQr from '../assest/AppstoeQr.jpeg'; // QR for App Store (using same for now)
import playStore from '../assest/playstore.png';
import appStore from '../assest/appstore.png';
// import windowsStore from '../assest/window.png';
import styles from '../css/Home.module.css';

import Footer from '../footer/page'; 
import { FAQ_CONTENT, FAQItem } from '../content/content';

// --- LOCAL TRANSLATIONS FOR APP BANNER & FAQ SECTION ---
const translations: Record<string, any> = {
  EN: {
    bannerTitle1: "Best Buses, Best Deals.",
    bannerTitle2: "Only on the YesGoBus",
    bannerTitle3: "Travels App.",
    list1: "Get exclusive Discounts",
    list2: "Receive Instant Fare Alerts",
    list3: "Track Bus Status",
    list4: "Quick access",
    list5: "10% Flat Discount",
    enterMobile: "Enter your Mobile number and get Mobile App link",
    mobilePlaceholder: "Mobile Number",
    getLink: "Get Link",
    bookFaster: "Book Tickets Faster. Download Our Apps",
    scanQr1: "Scan QR Code to",
    scanQr2: "Download the App",
    faqTitle1: "FAQs",
    faqTitle2: "Related to Bus Tickets Booking"
  },
  TA: {
    bannerTitle1: "சிறந்த பேருந்துகள், சிறந்த சலுகைகள்.",
    bannerTitle2: "YesGoBus பயன்பாட்டில்",
    bannerTitle3: "மட்டுமே.",
    list1: "பிரத்யேக தள்ளுபடிகளைப் பெறுங்கள்",
    list2: "உடனடி கட்டண விழிப்பூட்டல்களைப் பெறுங்கள்",
    list3: "பேருந்து நிலையை கண்காணிக்கவும்",
    list4: "விரைவான அணுகல்",
    list5: "10% தள்ளுபடி",
    enterMobile: "உங்கள் மொபைல் எண்ணை உள்ளிட்டு மொபைல் ஆப் இணைப்பைப் பெறுங்கள்",
    mobilePlaceholder: "மொபைல் எண்",
    getLink: "இணைப்பைப் பெறுங்கள்",
    bookFaster: "டிக்கெட்டுகளை வேகமாக முன்பதிவு செய்யுங்கள். எங்கள் செயலியை பதிவிறக்கவும்",
    scanQr1: "QR குறியீட்டை ஸ்கேன் செய்து",
    scanQr2: "செயலியைப் பதிவிறக்கவும்",
    faqTitle1: "அடிக்கடி கேட்கப்படும் கேள்விகள்",
    faqTitle2: "பேருந்து டிக்கெட் முன்பதிவு தொடர்பானவை"
  },
  KN: {
    bannerTitle1: "ಅತ್ಯುತ್ತಮ ಬಸ್‌ಗಳು, ಅತ್ಯುತ್ತಮ ಕೊಡುಗೆಗಳು.",
    bannerTitle2: "YesGoBus ನಲ್ಲಿ",
    bannerTitle3: "ಮಾತ್ರ.",
    list1: "ವಿಶೇಷ ರಿಯಾಯಿತಿಗಳನ್ನು ಪಡೆಯಿರಿ",
    list2: "ತ್ವರಿತ ದರ ಎಚ್ಚರಿಕೆಗಳನ್ನು ಪಡೆಯಿರಿ",
    list3: "ಬಸ್ ಸ್ಥಿತಿಯನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ",
    list4: "ತ್ವರಿತ ಪ್ರವೇಶ",
    list5: "10% ಫ್ಲಾಟ್ ರಿಯಾಯಿತಿ",
    enterMobile: "ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ ಮತ್ತು ಮೊಬೈಲ್ ಅಪ್ಲಿಕೇಶನ್ ಲಿಂಕ್ ಪಡೆಯಿರಿ",
    mobilePlaceholder: "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ",
    getLink: "ಲಿಂಕ್ ಪಡೆಯಿರಿ",
    bookFaster: "ಟಿಕೆಟ್‌ಗಳನ್ನು ವೇಗವಾಗಿ ಬುಕ್ ಮಾಡಿ. ನಮ್ಮ ಅಪ್ಲಿಕೇಶನ್‌ಗಳನ್ನು ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
    scanQr1: "QR ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",
    scanQr2: "ಅಪ್ಲಿಕೇಶನ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
    faqTitle1: "FAQ ಗಳು",
    faqTitle2: "ಬಸ್ ಟಿಕೆಟ್ ಬುಕಿಂಗ್‌ಗೆ ಸಂಬಂಧಿಸಿದೆ"
  },
  TE: {
    bannerTitle1: "ఉత్తమ బస్సులు, ఉత్తమ డీల్స్.",
    bannerTitle2: "YesGoBus లో",
    bannerTitle3: "మాత్రమే.",
    list1: "ప్రత్యేక తగ్గింపులను పొందండి",
    list2: "తక్షణ ఛార్జీల హెచ్చరికలను పొందండి",
    list3: "బస్సు స్థితిని ట్రాక్ చేయండి",
    list4: "శీఘ్ర ప్రాప్యత",
    list5: "10% ఫ్లాట్ డిస్కౌంట్",
    enterMobile: "మీ మొబైల్ నంబర్‌ను నమోదు చేసి మొబైల్ యాప్ లింక్‌ను పొందండి",
    mobilePlaceholder: "మొబైల్ నంబర్",
    getLink: "లింక్ పొందండి",
    bookFaster: "టిక్కెట్లను వేగంగా బుక్ చేసుకోండి. మా యాప్‌లను డౌన్‌లోడ్ చేసుకోండి",
    scanQr1: "క్యూఆర్ కోడ్‌ను స్కాన్ చేసి",
    scanQr2: "యాప్‌ను డౌన్‌లోడ్ చేయండి",
    faqTitle1: "తరచుగా అడిగే ప్రశ్నలు",
    faqTitle2: "బస్సు టిక్కెట్ల బుకింగ్‌కు సంబంధించినవి"
  },
  ML: {
    bannerTitle1: "മികച്ച ബസുകൾ, മികച്ച ഡീലുകൾ.",
    bannerTitle2: "YesGoBus-ൽ",
    bannerTitle3: "മാത്രം.",
    list1: "എക്സ്ക്ലൂസീവ് കിഴിവുകൾ നേടുക",
    list2: "തൽക്ഷണ നിരക്ക് അലേർട്ടുകൾ നേടുക",
    list3: "ബസ് സ്റ്റാറ്റസ് ട്രാക്ക് ചെയ്യുക",
    list4: "പെട്ടെന്നുള്ള ആക്സസ്",
    list5: "10% ഫ്ലാറ്റ് കിഴിവ്",
    enterMobile: "നിങ്ങളുടെ മൊബൈൽ നമ്പർ നൽകി മൊബൈൽ ആപ്പ് ലിങ്ക് നേടുക",
    mobilePlaceholder: "മൊബൈൽ നമ്പർ",
    getLink: "ലിങ്ക് നേടുക",
    bookFaster: "ടിക്കറ്റുകൾ വേഗത്തിൽ ബുക്ക് ചെയ്യുക. ഞങ്ങളുടെ ആപ്പുകൾ ഡൗൺലോഡ് ചെയ്യുക",
    scanQr1: "QR കോഡ് സ്കാൻ ചെയ്ത്",
    scanQr2: "ആപ്പ് ഡൗൺലോഡ് ചെയ്യുക",
    faqTitle1: "പതിവുചോദ്യങ്ങൾ",
    faqTitle2: "ബസ് ടിക്കറ്റ് ബുക്കിംഗുമായി ബന്ധപ്പെട്ടവ"
  }
};

const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('General');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Language State
  const [currentLang, setCurrentLang] = useState('EN');

  // GLOBAL LANGUAGE LISTENER (Listens to the Navbar)
  useEffect(() => {
    // 1. Initial Load
    const savedLang = localStorage.getItem('yesgo_lang');
    if (savedLang) {
      setCurrentLang(savedLang);
    }

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
  const t = translations[currentLang] || translations['EN'];

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setOpenIndex(null); 
  };

  const renderTabContent = () => {
    const data = FAQ_CONTENT[activeTab];

    if (activeTab === 'About YesGoBus') {
      return (
        <div className="p-4 text-muted" style={{ lineHeight: '1.8', textAlign: 'justify' }}>
          {data as string}
        </div>
      );
    }

    return (data as FAQItem[]).map((item, index) => (
      <div className="accordion-item border-bottom border-0" key={index}>
        <h2 className="accordion-header">
          <button 
            className={`accordion-button shadow-none bg-transparent d-flex align-items-center ${openIndex === index ? '' : 'collapsed'}`} 
            type="button" 
            onClick={() => toggleAccordion(index)}
            style={{ color: '#003366', fontWeight: 600, padding: '22px 0' }}
          >
            <span className={styles.faqIcon} style={{ 
              transform: openIndex === index ? 'rotate(45deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
              display: 'inline-block',
              marginRight: '10px'
            }}>+</span>
            {item.q}
          </button>
        </h2>
        <div className={`accordion-collapse collapse ${openIndex === index ? 'show' : ''}`} style={{ transition: 'all 0.3s ease' }}>
          <div className="accordion-body text-muted pb-4" style={{ paddingLeft: '40px', lineHeight: '1.6' }}>
            {item.a}
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="container-fluid p-0">
      
      {/* App Download Banner */}
      <section className={styles.banner}>
        <div className="container-fluid py-5 px-3 px-md-5"> 
          <div className="row align-items-center justify-content-between mx-0">
            <div className="col-lg-4 mb-4 mb-lg-0 px-0 text-center text-lg-start">
              <h1 className={styles.bannerTitle}>
                {t.bannerTitle1} <br/> 
                {t.bannerTitle2} <br/> 
                {t.bannerTitle3}
              </h1>
              <ul className={`list-unstyled mt-4 ${styles.bannerList}`}>
                <li>• {t.list1}</li>
                <li>• {t.list2}</li>
                <li>• {t.list3}</li>
                <li>• {t.list4}</li>
                <li className="fw-bold text-info">• {t.list5}</li>
              </ul>
            </div>

            <div className="col-lg-4 text-center mb-4 mb-lg-0">
              <p className={`mb-3 text-black ${styles.navyText}`} style={{ fontWeight: 600 }}>
                {t.enterMobile}
              </p>
              <div className={styles.inputWrapper}>
                <input type="text" className={styles.mobileInput} placeholder={t.mobilePlaceholder} />
                <button className={`btn ${styles.getLinkBtn}`} type="button">{t.getLink}</button>
              </div>
              <p className={styles.bookFasterText + " mt-4"}>
                {t.bookFaster}
              </p>
              
              {/* FIXED IMAGE SECTION */}
              <div className="d-flex flex-wrap justify-content-center align-items-center gap-2 gap-sm-3 mt-3">
                <a
                  href="https://play.google.com/store/apps/details?id=com.yesgobus.bustravel&pcampaignid=web_share"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image 
                    src={playStore} 
                    alt="Get it on Google Play" 
                    className={styles.storeImg}
                    width={135}
                    height={40}
                    style={{ cursor: "pointer" }}
                  />
                </a>
                <a
                  href="https://apps.apple.com/in/app/yesgobus/id6758322155"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image 
                    src={appStore} 
                    alt="Download on the App Store" 
                    className={styles.storeImg}
                    width={135}
                    height={40}
                    style={{ cursor: "pointer" }}
                  />
                </a>
              </div>
            </div>

            <div className="col-lg-3 text-lg-end text-center px-5 mt-4 mt-lg-0">
              <div className="d-flex flex-column align-items-center align-items-lg-end gap-3">
                <div className="text-center">
                  <Image src={playStoreQr} alt="Scan for Play Store" width={120} height={120} />
                  <p className={`small mt-2 ${styles.navyText}`} style={{ fontWeight: 500 }}>
                    Scan for Play Store
                  </p>
                </div>
                <div className="text-center">
                  <Image src={appStoreQr} alt="Scan for App Store" width={120} height={120} />
                  <p className={`small mt-2 ${styles.navyText}`} style={{ fontWeight: 500 }}>
                    Scan for App Store
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Explore / FAQ Section */}
      <section className="py-5 mx-auto" style={{ width: '80%' }}>
        <div className="container-fluid p-0"> 
          <h2
            className="text-center mb-4 fw-bold"
            style={{ color: "#0B3C6D", fontSize: "36px" }}
          >
            {t.faqTitle1}{" "}
            <span style={{ fontWeight: 500, color: "#1B4F8A" }}>
              {t.faqTitle2}
            </span>
          </h2>

          <div
            style={{
              width: "120px",
              height: "4px",
              backgroundColor: "#00AEEF",
              margin: "10px auto 40px auto",
              borderRadius: "2px"
            }}
          ></div>
          
          <div 
            className="d-flex justify-content-start justify-content-md-center gap-2 gap-md-4 border-bottom mb-4 overflow-auto pb-2" 
            style={{ scrollbarWidth: 'none' }}
          >
            <style>{`.overflow-auto::-webkit-scrollbar { display: none; }`}</style>

            {Object.keys(FAQ_CONTENT).map((tab) => (
              <button 
                key={tab}
                onClick={() => handleTabChange(tab)}
                className="btn border-0 fw-bold text-nowrap" 
                style={{ 
                  color: activeTab === tab ? '#003366' : '#999',
                  borderBottom: activeTab === tab ? `3px solid #14BDF3` : '3px solid transparent',
                  borderRadius: 0,
                  paddingBottom: '12px',
                  transition: 'all 0.3s ease'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="accordion accordion-flush" id="faqAccordion">
            {renderTabContent()}
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Home;