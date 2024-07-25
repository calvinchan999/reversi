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

import ProtectedRoute from "./guards/protectedRoute";
import Login from "./components/login";
import Game from "./components/game"; // Your main game component

function LanguageHandler({ children }) {
  console.log(process.env)
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

function AppContent() {
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
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
