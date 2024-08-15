import "./login.css";
import React from "react";
import { useTranslation } from "react-i18next";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useSelector } from "react-redux";
import axios from "axios";
import store from '../redux/store';
import { setUser } from '../redux/actions';

function Login() {
  const { t } = useTranslation();
  const config = useSelector((state) => state.config);

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    const { credential } = credentialResponse;
    const decodedCredential = jwtDecode(credential);

    console.log("Decoded token:", decodedCredential);

    const response = await axios.post(
      `${config.SERVER_URL}/api/auth/google`,
      decodedCredential
    );

    const { token } = response.data;
    sessionStorage.setItem("accessToken", token);
    store.dispatch(setUser(response.data))
  };

  const handleGoogleLoginError = () => {
    console.log("Google Login Failed");
  };

  const handleAnonymousLogin = async () => {
    const response = await axios.post(
      `${config.SERVER_URL}/api/auth/anonymous`,
      ``
    );

    const { token } = response.data;
    sessionStorage.setItem("accessToken", token);
    store.dispatch(setUser(response.data))
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
          <button className="btn-anonymous" onClick={handleAnonymousLogin}>
            {t("play_as_guest")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
