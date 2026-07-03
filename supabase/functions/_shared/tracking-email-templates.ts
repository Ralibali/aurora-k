const BRAND = {
  primary: '#1e3a5f',
  primaryLight: '#2a5a8f',
  bg: '#f0f4f8',
  cardBg: '#ffffff',
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  success: '#059669',
};

const layout = (content: string) => `
<!DOCTYPE html>
<html lang="sv">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg}"><tr><td align="center" style="padding:40px 16px">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
      <tr><td align="center" style="padding-bottom:32px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${BRAND.primary};width:44px;height:44px;border-radius:12px;text-align:center;vertical-align:middle;font-size:16px;font-weight:700;line-height:44px;color:#ffffff;letter-spacing:0.5px">AT</td><td style="padding-left:12px;font-size:18px;font-weight:700;color:${BRAND.primary};letter-spacing:-0.3px">Aurora Transport</td></tr></table></td></tr>
      <tr><td style="background:${BRAND.cardBg};border-radius:16px;padding:40px 36px;border:1px solid ${BRAND.border};box-shadow:0 1px 3px rgba(0,0,0,0.04)">${content}</td></tr>
      <tr><td style="padding:28px 36px 0;text-align:center"><p style="margin:0;font-size:12px;color:${BRAND.muted};line-height:1.6">Detta är en automatisk avisering från transportören.</p></td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;

const heading = (text: string) => `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.text};line-height:1.3">${text}</h1>`;
const subheading = (text: string) => `<p style="margin:0 0 24px;font-size:15px;color:${BRAND.muted};line-height:1.5">${text}</p>`;
const button = (text: string, url: string) => `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto;text-align:center" width="100%"><tr><td align="center"><a href="${escapeAttr(url)}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;font-weight:600;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.2px;box-shadow:0 2px 8px rgba(30,58,95,0.25)">${text}</a></td></tr></table>`;
const infoBox = (content: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0"><tr><td style="background:${BRAND.bg};border-radius:12px;padding:20px 24px;border:1px solid ${BRAND.border}">${content}</td></tr></table>`;
const detailRow = (label: string, value: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:7px 0;font-size:13px;color:${BRAND.muted};width:40%">${label}</td><td style="padding:7px 0;font-size:13px;color:${BRAND.text};font-weight:600;text-align:right">${value}</td></tr></table>`;
const smallText = (text: string) => `<p style="margin:8px 0 0;font-size:12px;color:${BRAND.muted};line-height:1.5;text-align:center">${text}</p>`;

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const escapeAttr = escapeHtml;
const orderLabel = (value: unknown) => escapeHtml(value || 'uppdraget');

export function trackingStartedEmail(data: {
  orderNumber?: string;
  driverName?: string;
  assignmentTitle?: string;
  trackingUrl: string;
}) {
  const orderNumber = orderLabel(data.orderNumber);
  const html = `
    ${heading('Din transport är på väg')}
    ${subheading(`Uppdrag ${orderNumber} har startats av föraren.`)}
    ${infoBox(`
      ${detailRow('Ordernummer', orderNumber)}
      ${detailRow('Uppdrag', escapeHtml(data.assignmentTitle || 'Transportuppdrag'))}
      ${data.driverName ? detailRow('Förare', escapeHtml(data.driverName)) : ''}
    `)}
    ${button('Följ transporten', data.trackingUrl)}
    ${smallText('Länken visar den senaste statusen för transporten.')}
  `;
  return { subject: `Din transport är på väg – ${escapeHtml(data.orderNumber || '')}`, html: layout(html) };
}

export function deliveryCompletedEmail(data: {
  orderNumber?: string;
  assignmentTitle?: string;
  completedAt?: string;
  recipientName?: string | null;
  trackingUrl?: string;
}) {
  const orderNumber = orderLabel(data.orderNumber);
  const html = `
    ${heading('Din leverans är utförd')}
    ${subheading(`Uppdrag ${orderNumber} har markerats som slutfört.`)}
    ${infoBox(`
      ${detailRow('Ordernummer', orderNumber)}
      ${detailRow('Uppdrag', escapeHtml(data.assignmentTitle || 'Transportuppdrag'))}
      ${data.completedAt ? detailRow('Leveranstid', escapeHtml(data.completedAt)) : ''}
      ${data.recipientName ? detailRow('Mottagare', escapeHtml(data.recipientName)) : ''}
    `)}
    ${data.trackingUrl ? button('Visa leveransstatus', data.trackingUrl) : ''}
    ${smallText('Tack för att du använde vår transporttjänst.')}
  `;
  return { subject: `Din leverans är utförd – ${escapeHtml(data.orderNumber || '')}`, html: layout(html) };
}
