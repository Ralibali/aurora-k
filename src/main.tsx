import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { registerSW } from "virtual:pwa-register";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import { FormAnalyticsObserver } from "./components/FormAnalyticsObserver";
import { LandingMobileNavigation } from "./components/LandingMobileNavigation";
import { MobileConversionShell, StandaloneDemoPage } from "./components/MobileConversionShell";
import "./index.css";

Sentry.init({
  dsn: "https://d838e2cf945e668ad9d1f63d7586ba00@o4511191910383616.ingest.de.sentry.io/4511191916675152",
  sendDefaultPii: true,
  enabled: import.meta.env.PROD,
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// PWA: Guard service worker registration against preview/iframe, prerender and Capacitor native contexts
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const hostname = window.location.hostname;

const isPreviewHost =
  hostname.includes("id-preview--") ||
  hostname.includes("lovableproject.com");

const isLocalHost =
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "0.0.0.0";

const isNative = Capacitor.isNativePlatform();
const isSecureWeb = window.location.protocol === "https:";
const shouldUseServiceWorker =
  import.meta.env.PROD &&
  isSecureWeb &&
  !isLocalHost &&
  !isPreviewHost &&
  !isInIframe &&
  !isNative;

if (shouldUseServiceWorker) {
  registerSW({ immediate: true });
} else if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}

const root = createRoot(document.getElementById("root")!);

if (window.location.pathname === "/boka-demo") {
  root.render(<StandaloneDemoPage />);
} else {
  root.render(
    <>
      <App />
      <FormAnalyticsObserver />
      <MobileConversionShell />
      <LandingMobileNavigation />
    </>,
  );
}
