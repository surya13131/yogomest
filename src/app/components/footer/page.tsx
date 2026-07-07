"use client";

import React, { useState, useEffect } from 'react';

import styles from '../css/Home.module.css';
import { FOOTER_CONTENT } from '../content/content';

// Asset Imports
import facebookIcon from '../assest/facebook.png';
import twitterIcon from '../assest/twitter.png';
import instagramIcon from '../assest/instagram.png';
import linkedinIcon from '../assest/linkedin.png';
import whatsappIcon from '../assest/whatsapp.png';
import youtubeIcon from '../assest/youtube.png';
import whiteLogo from '../assest/whitelogo.png'; 
import helpIcon from '../assest/chat.png'; 

// --- STATIC TEXTS TO TRANSLATE ---
const STATIC_TEXTS = {
  desc: "Your gate for Easy and Reliable Bus Bookings, Linking Travelers with Diverse Routes Seamlessly.",
  policies: "Policies",
  security: "Security Safeguards",
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  delete: "Delete Account Details",
  connect: "Connect with us on Social",
  help: "For Help",
  copyright: "© 2025 ShineGobus India Private Limited"
};

// Global cache so we don't spam the translation API
const translationCache: Record<string, string> = {};

const Footer: React.FC = () => {
  const categories = Object.keys(FOOTER_CONTENT) as Array<keyof typeof FOOTER_CONTENT>;
  const [activeTab, setActiveTab] = useState<string>(categories[0]);
  
  // Language & Translation States
  const [currentLang, setCurrentLang] = useState('EN');
  const [translatedCategories, setTranslatedCategories] = useState<Record<string, string>>({});
  const [translatedContent, setTranslatedContent] = useState<any>(null);
  const [translatedStatic, setTranslatedStatic] = useState(STATIC_TEXTS);

  // GLOBAL LANGUAGE LISTENER (Listens to the Navbar)
  useEffect(() => {
    const savedLang = localStorage.getItem('yesgo_lang') || 'EN';
    setCurrentLang(savedLang);

    const handleLanguageUpdate = () => {
      setCurrentLang(localStorage.getItem('yesgo_lang') || "EN");
    };

    window.addEventListener('languageChanged', handleLanguageUpdate);
    return () => window.removeEventListener('languageChanged', handleLanguageUpdate);
  }, []);

  // TRANSLATION API LOGIC
  useEffect(() => {
    const translate = async () => {
      // If English, reset to default content
      if (currentLang === 'EN') {
        setTranslatedCategories(categories.reduce((acc, cat) => ({...acc, [cat]: cat}), {}));
        setTranslatedContent(FOOTER_CONTENT[activeTab as keyof typeof FOOTER_CONTENT]);
        setTranslatedStatic(STATIC_TEXTS);
        return;
      }

      // Map our language codes to Google Translate codes
      const langCodeMap: Record<string, string> = { TA: "ta", ML: "ml", TE: "te", KN: "kn" };
      const targetLang = langCodeMap[currentLang];
      if (!targetLang) return;

      // API Helper Function
      const translateText = async (text: string) => {
        const cacheKey = `${targetLang}_${text}`;
        if (translationCache[cacheKey]) return translationCache[cacheKey];

        try {
          const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
          const data = await res.json();
          const translated = data[0].map((item: any) => item[0]).join('');
          translationCache[cacheKey] = translated; // Save to cache
          return translated;
        } catch (e) {
          console.error("Translation Error:", e);
          return text; // Fallback to original text if API fails
        }
      };

      // 1. Translate Top Categories Concurrently
      const newCats: Record<string, string> = {};
      await Promise.all(categories.map(async (cat) => {
        newCats[cat] = await translateText(cat);
      }));
      setTranslatedCategories(newCats);

      // 2. Translate Static UI Texts Concurrently
      const newStatic: any = {};
      await Promise.all(Object.entries(STATIC_TEXTS).map(async ([key, value]) => {
        newStatic[key] = await translateText(value);
      }));
      setTranslatedStatic(newStatic);

      // 3. Translate the Active Tab's Content Concurrently
      const baseContent = FOOTER_CONTENT[activeTab as keyof typeof FOOTER_CONTENT];
      
      if (typeof baseContent === 'string') {
        // Translate paragraph
        setTranslatedContent(await translateText(baseContent));
      } else {
        // Translate columns array
        const newContent: any = {};
        await Promise.all(Object.entries(baseContent).map(async ([colKey, items]) => {
          newContent[colKey] = await Promise.all((items as string[]).map(async (item) => await translateText(item)));
        }));
        setTranslatedContent(newContent);
      }
    };

    translate();
  }, [currentLang, activeTab]);

  // Use translated content if ready, otherwise fallback to English while loading
  const displayContent = translatedContent || FOOTER_CONTENT[activeTab as keyof typeof FOOTER_CONTENT];

  return (
    <>
      {/* Add custom CSS for the curved bracket borders */}
      <style>{`
        .curved-column {
          border-left: 1px solid rgba(255, 255, 255, 0.2);
          border-top-left-radius: 20px;
          border-bottom-left-radius: 20px;
          border-top: 1px solid transparent;
          border-bottom: 1px solid transparent;
          padding-left: 20px;
          height: 100%;
        }
      `}</style>

      {/* Changed bg-dark to custom YesGoBus Blue to match your image */}
      <footer className={`${styles.footerContainer} text-white`} style={{ backgroundColor: '#033564' }}>

        <div className="container-fluid px-3 px-md-5 py-5">

          {/* 🔥 FIX: SEPARATE UNDERLINES FOR EACH TAB */}
          <div className="row text-center mb-5">
            {categories.map((cat) => (
              <div key={cat} className="col-12 col-md mb-4 mb-md-0 text-center">

                <h5
                  onClick={() => setActiveTab(cat)}
                  className={`${styles.footerHeader} fw-bold`}
                  style={{
                    cursor: "pointer",
                    color: activeTab === cat ? "#FFC107" : "#FFFFFF",
                    marginBottom: "10px",
                    transition: "color 0.3s ease",
                    whiteSpace: "nowrap"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "#FFC107"}
                  onMouseLeave={(e) =>
                    e.currentTarget.style.color = activeTab === cat ? "#FFC107" : "#FFFFFF"
                  }
                >
                  {/* Display Translated Category Name */}
                  {translatedCategories[cat] || cat}
                </h5>

                {/* Separate underline per tab, 90% width to create the gap */}
                <div
                  style={{
                    height: "1px",
                    width: "90%",
                    margin: "0 auto",
                    backgroundColor: activeTab === cat ? "#FFC107" : "rgba(255,255,255,0.25)",
                    transition: "background-color 0.3s ease"
                  }}
                />

              </div>
            ))}
          </div>

          {/* TAB CONTENT WITH CURVED LINES & LEFT ALIGNMENT */}
          <div className="row mb-5 pb-4 justify-content-start" style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}>

            {typeof displayContent === "string" ? (
              
              <div className="col-12 text-start">
                <p className={`${styles.subItem} m-0 small opacity-75`} style={{ lineHeight: "1.8" }}>
                  {displayContent}
                </p>
              </div>

            ) : (

              Object.values(displayContent).map((col: any, index: number) => (
                <div key={index} className="col-12 col-md-6 col-lg-3 mb-4 text-start">
                  <div className="curved-column">
                    <ul className="list-unstyled m-0">
                      {col.map((item: string, i: number) => (
                        <li key={i} className={`${styles.subItem} mb-2 small text-white opacity-75`} style={{ letterSpacing: "0.3px" }}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))

            )}

          </div>

          {/* BRAND + POLICIES + SOCIAL */}
          <div className="row align-items-center">

            {/* Logo */}
            <div className="col-12 col-md-6 col-lg-3 mb-4 mb-lg-0 text-center text-md-start">
              <img src={whiteLogo.src} alt="YesGoBus" className="img-fluid mb-3" style={{ maxWidth: '150px' }} />
              <p className="small opacity-75 mx-auto mx-md-0" style={{ maxWidth: '250px' }}>
                {translatedStatic.desc}
              </p>
            </div>


            {/* Policies */}
            <div className="col-12 col-md-6 col-lg-2 mb-4 mb-lg-0 text-center text-md-start">
              <p className="fw-bold mb-3">{translatedStatic.policies}</p>

              <div className="d-flex flex-column gap-2">
                <a href="#" className="text-white text-decoration-none small opacity-75">{translatedStatic.security}</a>
                <a href="#" className="text-white text-decoration-none small opacity-75">{translatedStatic.terms}</a>
                <a href="#" className="text-white text-decoration-none small opacity-75">{translatedStatic.privacy}</a>
                <a href="#" className="text-white text-decoration-none small opacity-75">{translatedStatic.delete}</a>
              </div>
            </div>


            {/* SOCIAL ICONS */}
            <div className="col-12 col-md-6 col-lg-4 text-center mb-4 mb-lg-0">

              <p className="fw-bold mb-3">{translatedStatic.connect}</p>

              <div className="d-flex justify-content-center align-items-center gap-4">

                <a href="https://youtube.com/@yesgobus?si=tTeiUm9aZ1kNYoB3" target="_blank" rel="noopener noreferrer">
                  <img src={youtubeIcon.src} alt="youtube"
                    style={{ width: '30px', height: '30px', cursor: 'pointer', opacity: '0.9' }}
                  />
                </a>

                <a href="https://www.facebook.com/share/1Ejg8sAmp1/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer">
                  <img src={facebookIcon.src} alt="facebook"
                    style={{ width: '52px', height: '42px', cursor: 'pointer', opacity: '0.9' }}
                  />
                </a>

                <img src={twitterIcon.src} alt="twitter"
                  style={{ width: '30px', height: '30px', cursor: 'pointer', opacity: '0.9' }}
                />

                <a href="https://www.instagram.com/yesgobus?igsh=MTB1ejh4aTRmbTl0ZQ==" target="_blank" rel="noopener noreferrer">
                  <img src={instagramIcon.src} alt="instagram"
                    style={{ width: '30px', height: '30px', cursor: 'pointer', opacity: '0.9' }}
                  />
                </a>

                <a href="https://www.linkedin.com/company/yesgobus/" target="_blank" rel="noopener noreferrer">
                  <img src={linkedinIcon.src} alt="linkedin"
                    style={{ width: '30px', height: '30px', cursor: 'pointer', opacity: '0.9' }}
                  />
                </a>

                {/* WhatsApp slightly bigger */}
                <a href="#" target="_blank" rel="noopener noreferrer">
                  <img src={whatsappIcon.src} alt="whatsapp"
                    style={{ width: '32px', height: '32px', cursor: 'pointer', opacity: '1' }}
                  />
                </a>

              </div>

            </div>


            {/* HELP */}
            <div className="col-12 col-md-6 col-lg-3 text-center text-lg-end">

              <div className="d-flex align-items-center justify-content-center justify-content-lg-end gap-3">

                <span className="fw-bold">{translatedStatic.help}</span>

                <img
                  src={helpIcon.src}
                  alt="Help"
                  className="img-fluid"
                  style={{ width: '55px', height: '55px', cursor: 'pointer' }}
                />

              </div>

            </div>

          </div>

        </div>

        {/* COPYRIGHT */}
        <div className="py-3 bg-black bg-opacity-25 border-top border-white border-opacity-10">

          <div className="container text-center">

            <span className="small opacity-50">
              {translatedStatic.copyright}
            </span>

          </div>

        </div>

      </footer>
    </>
  );
};

export default Footer;