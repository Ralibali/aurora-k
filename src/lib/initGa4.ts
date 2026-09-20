import { initGa4 } from './ga4Runtime';
initGa4({
  "measurementId": "G-YFK8HNQPSW",
  "hosts": [
    "auroratransport.se",
    "www.auroratransport.se"
  ],
  "excluded": [
    "/admin",
    "/driver",
    "/platform",
    "/portal",
    "/track",
    "/onboarding"
  ],
  "consentKey": "aurora_ga4_consent_v1"
});
