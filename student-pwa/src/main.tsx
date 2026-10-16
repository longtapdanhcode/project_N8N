import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/be-vietnam-pro/latin-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/latin-500.css";
import "@fontsource/be-vietnam-pro/vietnamese-500.css";
import "@fontsource/be-vietnam-pro/latin-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "./style.css";
import "./workspace.css";
import { App } from "./App";
import { Capacitor } from "@capacitor/core";
import { PortalGate } from "./components/PortalGate";

createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    {import.meta.env.VITE_PORTAL === "true" ? <PortalGate><App /></PortalGate> : <App />}
  </React.StrictMode>,
);

// Capacitor already bundles the shell. A web SW can interfere with its native bridge.
if (
  !Capacitor.isNativePlatform() &&
  "serviceWorker" in navigator &&
  import.meta.env.PROD
) {
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL}).catch(() => {
    window.dispatchEvent(new Event("sw-error"));
  });
}
