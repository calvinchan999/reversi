// src/App.js
import "./App.css";
import React, { useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";

import ProtectedRoute from "./guards/protectedRoute";
import Login from "./components/login";
import Game from "./components/game"; // Your main game component

import { useSelector } from "react-redux";

function LanguageHandler({ children }) {
  const { lng } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const initialLanguageSetRef = useRef(false);

  useEffect(() => {
    const changeLanguage = async () => {
      if (initialLanguageSetRef.current) return;

      if (lng && ["en", "tc"].includes(lng)) {
        await i18n.changeLanguage(lng);
        initialLanguageSetRef.current = true;
      } else if (location.pathname === "/") {
        navigate("/en/app", { replace: true });
      } else {
        navigate("/en" + location.pathname, { replace: true });
      }
    };

    changeLanguage();
  }, [lng, i18n, navigate, location]);

  return children;
}

const LanguageRedirect = () => {
  const { lng } = useParams();
  return <Navigate to={`/${lng}/app`} replace />;
};

function AppContent({ config }) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    const fetchVersionInfo = async () => {
      const token = sessionStorage.getItem("accessToken");
      try {
        const response = await axios.get(`${config.SERVER_URL}/api/version`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response) {
          if (location.pathname === `/${i18n.language}/login`) {
            navigate(`/${i18n.language}/app`, { replace: true });
          }
        } else {
          sessionStorage.removeItem("accessToken")
          navigate(`/${i18n.language}/login`, { replace: true });
        }
      } catch (err) {
        console.log(err);
        sessionStorage.removeItem("accessToken")
        navigate(`/${i18n.language}/login`, { replace: true });
      }
    };

    if (location.pathname.indexOf("login") < -1 || sessionStorage.getItem("accessToken")) fetchVersionInfo();
  }, []);

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Navigate to="/en/app" replace />} />
        <Route path="/:lng" element={<LanguageRedirect />} />
        <Route
          path="/:lng/login"
          element={
            <LanguageHandler>
              <Login />
            </LanguageHandler>
          }
        ></Route>
        <Route element={<ProtectedRoute />}>
          <Route
            path="/:lng/app"
            element={
              <LanguageHandler>
                <Game />
              </LanguageHandler>
            }
          />
        </Route>
        <Route path="*" element={<div>404 - Not Found</div>} />
      </Routes>
    </div>
  );
}

function App() {
  const config = useSelector((state) => state.config);
  console.log(config);
  return (
    <Router>
      <AppContent config={config} />
    </Router>
  );
}

export default App;
