import "./login.css";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

function Login() {
  const { t } = useTranslation();

  const handleGoogleLoginSuccess = (credentialResponse) => {
    const { credential } = credentialResponse;
    const decodedToken = jwtDecode(credential);

    console.log("Decoded token:", decodedToken);

    const {
      email,
      name,
      picture,
      given_name,
      family_name,
      sub: googleId,
    } = decodedToken;
  };

  const handleGoogleLoginError = () => {
    console.log("Google Login Failed");
  };

  return (
    <div className="app">
      {/* <h1>{t("login")}</h1> */}
      <div className="login-container">
        <div className="login-options">
          <div className="btn-google-sso">
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={handleGoogleLoginError}
            />
          </div>
          <button className="btn-anonymous">{t("play_as_guest")}</button>
        </div>
      </div>
    </div>
  );
}

export default Login;
