import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from 'react-redux';
import store from './redux/store';
import "./index.css";
import i18n from "./i18n";
import App from "./App";
import { I18nextProvider } from "react-i18next";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { setConfig } from './redux/actions';

const root = ReactDOM.createRoot(document.getElementById("root"));

async function initializeApp() {
  try {
    const response = await fetch(
      `/config/config-${process.env.NODE_ENV === "prod" ? "production" : "development"}.json`
    );
    const config = await response.json();
    store.dispatch(setConfig(config));

    root.render(
      <React.StrictMode>
        <Provider store={store}>
          <AppWithConfig />
        </Provider>
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Failed to load config:', error);
    root.render(<div>Failed to load configuration. Please try again later.</div>);
  }
}

function AppWithConfig() {
  const config = store.getState().config;

  if (!config) {
    return <div>Loading configuration...</div>;
  }

  return (
    <GoogleOAuthProvider clientId={config.GOOGLE_SSO_CLIENT_ID}>
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    </GoogleOAuthProvider>
  );
}

initializeApp();
