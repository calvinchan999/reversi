import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import i18n from "./i18n";
import App from "./App";
import { I18nextProvider } from "react-i18next";
import { GoogleOAuthProvider } from "@react-oauth/google";

const root = ReactDOM.createRoot(document.getElementById("root"));

function AppWrapper() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(
          `/config/config-${process.env.NODE_ENV === "prod" ? "production" : "development"}.json`
        );
        const data = await response.json();
        console.log('Config loaded:', data);
        setConfig(data);
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    };

    fetchConfig();
  }, []);

  if (!config) {
    return <div>Loading configuration...</div>;
  }

  return (
    <React.StrictMode>
      <GoogleOAuthProvider clientId={config.GOOGLE_SSO_CLIENT_ID}>
        <I18nextProvider i18n={i18n}>
          <App />
        </I18nextProvider>
      </GoogleOAuthProvider>
    </React.StrictMode>
  );
}

root.render(<AppWrapper />);
