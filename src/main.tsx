import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

// PWA: Guard service worker registration against preview/iframe and Capacitor native contexts
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

const isNative = Capacitor.isNativePlatform();

if (isPreviewHost || isInIframe || isNative) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}

createRoot(document.getElementById("root")!).render(<App />);
