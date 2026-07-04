/**
 * Public canonical site URL used for customer-facing links (tracking, portal).
 *
 * IMPORTANT: Do not use `window.location.origin` for links that end up in
 * customer emails. In the native driver app (Capacitor) that resolves to
 * `capacitor://localhost`, which produces dead links in the recipient's inbox.
 */
export const PUBLIC_SITE_URL = 'https://auroratransport.se';