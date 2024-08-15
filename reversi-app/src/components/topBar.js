// src/components/TopBar.js
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import "./topBar.css"; // We'll create this file next

import store from '../redux/store';
import { clearUser } from '../redux/actions';

function TopBar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = !!sessionStorage.getItem("accessToken");

  const handleLogin = () => {
    navigate(`/${i18n.language}/login`);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("accessToken");
    navigate(`/${i18n.language}/login`);
  };

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    const newPath = location.pathname.replace(/^\/[^\/]+/, `/${lang}`);
    store.dispatch(clearUser());
    navigate(newPath);
  };

  return (
    <>
      {isLoggedIn && (
        <div className="top-bar-container">
          <div className="top-bar">
            {/* <div className="language-selector">
              <button onClick={() => handleLanguageChange('en')}>EN</button>
              <button onClick={() => handleLanguageChange('tc')}>TC</button>
            </div> */}
            <div className="auth-button">
              <button onClick={handleLogout}>{t("logout")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
  
}

export default TopBar;
