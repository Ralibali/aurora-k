// Aurora Transport – Branded email templates

const BRAND = {
  primary: '#1e3a5f',
  primaryLight: '#2a5a8f',
  accent: '#f59e0b',
  bg: '#f0f4f8',
  cardBg: '#ffffff',
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
};

const layout = (content: string) => `
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg}">
    <tr><td align="center" style="padding:40px 16px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
        <!-- Logo header -->
        <tr><td align="center" style="padding-bottom:32px">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:${BRAND.primary};width:44px;height:44px;border-radius:12px;text-align:center;vertical-align:middle;font-size:22px;line-height:44px">🚛</td>
              <td style="padding-left:12px;font-size:18px;font-weight:700;color:${BRAND.primary};letter-spacing:-0.3px">Aurora Transport</td>
            </tr>
          </table>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:${BRAND.cardBg};border-radius:16px;padding:40px 36px;border:1px solid ${BRAND.border};box-shadow:0 1px 3px rgba(0,0,0,0.04)">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:28px 36px 0;text-align:center">
          <p style="margin:0;font-size:12px;color:${BRAND.muted};line-height:1.6">
            Aurora Transport · <a href="https://auroratransport.se" style="color:${BRAND.muted};text-decoration:underline">auroratransport.se</a>
          </p>
          <p style="margin:6px 0 0;font-size:12px;color:${BRAND.muted}">
            Frågor? <a href="mailto:info@auroratransport.se" style="color:${BRAND.primaryLight}">info@auroratransport.se</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const heading = (text: string) =>
  `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.text};line-height:1.3">${text}</h1>`;

const subheading = (text: string) =>
  `<p style="margin:0 0 24px;font-size:15px;color:${BRAND.muted};line-height:1.5">${text}</p>`;

const paragraph = (text: string) =>
  `<p style="margin:0 0 16px;font-size:15px;color:${BRAND.text};line-height:1.7">${text}</p>`;

const button = (text: string, url: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto;text-align:center" width="100%">
    <tr><td align="center">
      <a href="${url}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;font-weight:600;font-size:15px;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.2px;box-shadow:0 2px 8px rgba(30,58,95,0.25)">${text}</a>
    </td></tr>
  </table>`;

const infoBox = (content: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0">
    <tr><td style="background:${BRAND.bg};border-radius:12px;padding:20px 24px;border:1px solid ${BRAND.border}">
      ${content}
    </td></tr>
  </table>`;

const detailRow = (label: string, value: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:7px 0;font-size:13px;color:${BRAND.muted};width:40%">${label}</td>
      <td style="padding:7px 0;font-size:13px;color:${BRAND.text};font-weight:600;text-align:right">${value}</td>
    </tr>
  </table>`;

const divider = () =>
  `<hr style="border:none;border-top:1px solid ${BRAND.border};margin:24px 0">`;

const featureItem = (emoji: string, text: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="width:28px;vertical-align:top;padding:4px 0;font-size:16px">${emoji}</td>
      <td style="padding:4px 0;font-size:14px;color:${BRAND.text};line-height:1.5">${text}</td>
    </tr>
  </table>`;

const alertBox = (content: string, color: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0">
    <tr><td style="background:${color}12;border-radius:12px;padding:16px 20px;border-left:4px solid ${color}">
      <p style="margin:0;font-size:13px;color:${color};line-height:1.6">${content}</p>
    </td></tr>
  </table>`;

const smallText = (text: string) =>
  `<p style="margin:8px 0 0;font-size:12px;color:${BRAND.muted};line-height:1.5;text-align:center">${text}</p>`;


// ── Templates ───────────────────────────────────────

export function welcomeEmail(data: {
  firstName: string;
  companyName: string;
  dashboardUrl: string;
}) {
  const nextBilling = new Date(Date.now() + 30 * 86400000).toLocaleDateString('sv-SE');
  const html = `
    ${heading(`Välkommen, ${data.firstName}! 👋`)}
    ${subheading('Ditt konto är aktivt och redo att användas.')}
    ${paragraph('Du kan nu börja använda Aurora Transport för att hantera dina uppdrag, förare och fakturor – allt på ett ställe.')}
    ${infoBox(`
      ${detailRow('Företag', data.companyName)}
      ${detailRow('Plan', 'Aurora Pro')}
      ${detailRow('Pris', '449 kr/mån')}
      ${detailRow('Nästa faktura', nextBilling)}
    `)}
    ${button('Öppna dashboarden →', data.dashboardUrl)}
    ${divider()}
    ${smallText('Har du frågor? Svara på detta mail så hjälper vi dig.')}
  `;
  return {
    subject: 'Välkommen till Aurora Transport! 🚛',
    html: layout(html),
  };
}

export function driverInviteEmail(data: {
  adminName: string;
  companyName: string;
  joinUrl: string;
}) {
  const html = `
    ${heading('Du har blivit inbjuden! 🎉')}
    ${subheading(`${data.adminName} på ${data.companyName} vill att du använder Aurora Transport.`)}
    ${paragraph('Med Aurora Transport kan du enkelt hantera dina leveranser direkt i mobilen:')}
    ${infoBox(`
      ${featureItem('📋', 'Se och hantera dina uppdrag i realtid')}
      ${featureItem('📍', 'Automatisk GPS-navigering till leveransadressen')}
      ${featureItem('✍️', 'Digital signering och fotobevis')}
      ${featureItem('📊', 'Tidrapportering och körsträcka')}
    `)}
    ${button('Skapa ditt konto →', data.joinUrl)}
    ${smallText('Länken är giltig i 7 dagar. Kontakta din arbetsgivare om den gått ut.')}
  `;
  return {
    subject: `${data.companyName} har bjudit in dig till Aurora Transport`,
    html: layout(html),
  };
}

export function paymentFailedEmail(data: {
  firstName: string;
  portalUrl: string;
}) {
  const html = `
    ${heading('Betalning misslyckades ⚠️')}
    ${subheading(`Hej ${data.firstName}, vi kunde inte genomföra din betalning.`)}
    ${paragraph('Vi försökte debitera 449 kr för din Aurora Transport-prenumeration, men betalningen gick inte igenom.')}
    ${alertBox('⏰ Ditt konto förblir aktivt i <strong>7 dagar</strong>. Uppdatera dina betalningsuppgifter innan dess för att undvika avbrott.', BRAND.warning)}
    ${button('Uppdatera betalningsuppgifter →', data.portalUrl)}
    ${divider()}
    ${smallText('Om du redan har uppdaterat dina uppgifter kan du ignorera detta meddelande.')}
  `;
  return {
    subject: '⚠️ Betalning misslyckades – Aurora Transport',
    html: layout(html),
  };
}

export function assignmentConfirmationEmail(data: {
  driverName: string;
  title: string;
  address: string;
  scheduledStart: string;
  customerName: string;
  priority: string;
  instructions?: string | null;
  adminComment?: string | null;
  appUrl: string;
}) {
  const priorityLabel: Record<string, string> = { low: '🟢 Låg', normal: '🔵 Normal', urgent: '🔴 Brådskande' };
  const html = `
    ${heading('Nytt uppdrag tilldelat! 📋')}
    ${subheading(`Hej ${data.driverName}, du har fått ett nytt uppdrag.`)}
    ${infoBox(`
      ${detailRow('Uppdrag', data.title)}
      ${detailRow('Kund', data.customerName)}
      ${detailRow('Adress', data.address)}
      ${detailRow('Datum & tid', data.scheduledStart)}
      ${detailRow('Prioritet', priorityLabel[data.priority] || data.priority)}
    `)}
    ${data.instructions ? alertBox(`📝 <strong>Instruktioner:</strong> ${data.instructions}`, BRAND.primary) : ''}
    ${data.adminComment ? alertBox(`💬 <strong>Kommentar från admin:</strong> ${data.adminComment}`, BRAND.primaryLight) : ''}
    ${button('Öppna i appen →', data.appUrl)}
    ${divider()}
    ${smallText('Du kan se alla dina uppdrag i Aurora Transport-appen.')}
  `;
  return {
    subject: `Nytt uppdrag: ${data.title}`,
    html: layout(html),
  };
}

export function subscriptionCancelledEmail(data: {
  firstName: string;
  reactivateUrl: string;
}) {
  const html = `
    ${heading('Prenumeration avslutad')}
    ${subheading(`Hej ${data.firstName}, vi är ledsna att se dig gå.`)}
    ${paragraph('Din Aurora Transport-prenumeration har nu avslutats. Vi hoppas att tjänsten har varit till nytta för ditt företag.')}
    ${alertBox('📦 Din data sparas i <strong>30 dagar</strong>. Under den perioden kan du återaktivera ditt konto och behålla all data.', BRAND.primary)}
    ${button('Återaktivera mitt konto →', data.reactivateUrl)}
    ${divider()}
    ${smallText('Tack för att du använde Aurora Transport. Vi finns här om du vill komma tillbaka.')}
  `;
  return {
    subject: 'Ditt Aurora Transport-konto har avslutats',
    html: layout(html),
  };
}
