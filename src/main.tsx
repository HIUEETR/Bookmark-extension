import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { I18nProvider } from "./context/I18nContext";
import "./styles.css";

function BannerAmbient() {
  return (
    <div className="banner-ambient" aria-hidden="true">
      <div className="glow glow-1" />
      <div className="glow glow-2" />
      <div className="glow glow-3" />
      <div className="band band-1" />
      <div className="band band-2" />
      <div className="track track-1" />
      <div className="track track-2" />
      <div className="particles" />
      <svg className="float-bookmark bk-1" viewBox="0 0 50 90">
        <path d="M5 5 V85 L25 68 L45 85 V5 Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <svg className="float-bookmark bk-2" viewBox="0 0 50 90">
        <path d="M5 5 V85 L25 68 L45 85 V5 Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BannerAmbient />
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>
);
