# Google Analytics 4

Current provider: Google Analytics 4. This replaces the previous Plausible integration.

- Measurement ID: `G-YFK8HNQPSW`.
- Production hosts: auroratransport.se, www.auroratransport.se.
- Consent storage key: `aurora_ga4_consent_v1`.
- No GA4 library or events before analytics consent. Refused events are not buffered or replayed.
- SPA pageviews are sent exactly once by `ga4Runtime.ts`. Enhanced measurement is disabled in the GA4 web stream.
- Existing business-event helpers keep their public names for compatibility; the transport converts event names to lower_snake_case (for example `Form Submitted` → `form_submitted`).
- Private routes, query strings, fragments, personal identifiers and unsafe event properties are filtered. Download tracking sends the file extension only.
- Google Signals and advertising personalization are disabled for GA4. Existing Ads conversion code, where present, has its own marketing consent.
- A persistent Cookieinställningar button allows visitors to change or withdraw their choice.
- Old Plausible setup documents are historical; do not reinstall that tracker or re-enable automatic GA4 pageviews on top of this transport.

## Confirmed lead outcome

`Generate Lead` (GA4: `generate_lead`) is the common completed lead event for the contact form, Swedish/English demo modal, standalone demo page and mobile demo modal. It is emitted only after the `leads` insert succeeds. Its `lead_source` identifies the form placement. The existing GA4 key event remains `generate_lead`.

Use this one event for the lead key event. It represents a saved request for contact/demo, not a completed demo, sale or revenue. The `demo_requested` detail event is retained for historical reporting and must not also be marked as a key event. Do not sum `generate_lead`, `demo_requested`, `lead_submit_success` or `demo_submit_success`: they include aliases of the same request. Success text on the page no longer creates a lead outcome. `demo_submit_success` remains a diagnostic event on the standalone/mobile forms.

The separate `transport_booking_submit_success` UI diagnostic is unchanged and is not the lead key event; it should not be treated as proof of a saved booking without checking its own submission flow.

GA4 key-event settings are configured separately in the property and apply prospectively. This code change does not import events into Google Ads or assign monetary values. Live receipt is checked after publication with statistics consent.

Reference: [Google SPA measurement](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications), [Google cookie reference](https://support.google.com/analytics/answer/11397207).

Validation: production build plus existing event-helper tests and common runtime tests where a browser test environment is available. The common runtime tests cover consent, single SPA pageviews, URL/parameter redaction, withdrawal and callback fallback. Live delivery is verified separately after publication.
