import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

Sentry.init({
  dsn: "https://d838e2cf945e668ad9d1f63d7586ba00@o4511191910383616.ingest.de.sentry.io/4511191916675152",
  sendDefaultPii: true,
  enabled: import.meta.env.PROD,
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

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
