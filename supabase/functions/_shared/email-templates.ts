// Aurora Transport email templates

const btn = (text: string, url: string) =>
  `<a href="${url}" style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;margin:8px 0">${text}</a>`;

const h1 = (text: string) =>
  `<h1 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 16px">${text}</h1>`;

const p = (text: string) =>
  `<p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px">${text}</p>`;

const muted = (text: string) =>
  `<p style="font-size:13px;color:#64748b;line-height:1.5;margin:0 0 12px">${text}</p>`;

const box = (content: string) =>
  `<div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:16px 0">${content}</div>`;

const row = (label: string, value: string) =>
  `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px"><span style="color:#64748b">${label}</span><span style="color:#0f172a;font-weight:600">${value}</span></div>`;

export function welcomeEmail(data: {
  firstName: string;
  companyName: string;
  dashboardUrl: string;
}) {
  return {
    subject: "Välkommen till Aurora Transport! 🚛",
    html: `
      ${h1(`Hej ${data.firstName}!`)}
      ${p("Ditt konto är aktivt och redo att användas.")}
      ${box(`
        ${row("Företag", data.companyName)}
        ${row("Plan", "Aurora Pro – 449 kr/mån")}
        ${row("Nästa faktura", new Date(Date.now() + 30 * 86400000).toLocaleDateString("sv-SE"))}
      `)}
      <div style="text-align:center;margin:24px 0">
        ${btn("Gå till dashboarden", data.dashboardUrl)}
      </div>
      ${muted('Frågor? Svara på detta mail eller kontakta <a href="mailto:info@auroramedia.se" style="color:#2563eb">info@auroramedia.se</a>')}
    `,
  };
}

export function driverInviteEmail(data: {
  adminName: string;
  companyName: string;
  joinUrl: string;
}) {
  return {
    subject: `${data.companyName} har bjudit in dig till Aurora Transport`,
    html: `
      ${h1("Du har blivit inbjuden! 🎉")}
      ${p(`<strong>${data.adminName}</strong> på <strong>${data.companyName}</strong> har bjudit in dig att använda Aurora Transport.`)}
      ${box(`
        <div style="font-size:13px;color:#334155;line-height:1.8">
          ✅ Se och hantera dina uppdrag i realtid<br/>
          📍 Automatisk GPS-spårning och navigering<br/>
          📝 Digital signering och fotobevis
        </div>
      `)}
      <div style="text-align:center;margin:24px 0">
        ${btn("Skapa ditt konto", data.joinUrl)}
      </div>
      ${muted("Länken är giltig i 7 dagar.")}
    `,
  };
}

export function paymentFailedEmail(data: {
  firstName: string;
  portalUrl: string;
}) {
  return {
    subject: "⚠️ Betalning misslyckades",
    html: `
      ${h1("Betalning misslyckades")}
      ${p(`Hej ${data.firstName}, vi kunde tyvärr inte debitera 449 kr för din Aurora Transport-prenumeration.`)}
      ${p("Uppdatera dina betalningsuppgifter för att undvika avbrott i tjänsten.")}
      <div style="text-align:center;margin:24px 0">
        ${btn("Uppdatera betalningsuppgifter", data.portalUrl)}
      </div>
      ${box(`<div style="font-size:13px;color:#b45309">⏰ Ditt konto förblir aktivt i 7 dagar. Uppdatera dina uppgifter innan dess.</div>`)}
    `,
  };
}

export function subscriptionCancelledEmail(data: {
  firstName: string;
  reactivateUrl: string;
}) {
  return {
    subject: "Ditt Aurora Transport-konto har avslutats",
    html: `
      ${h1("Prenumeration avslutad")}
      ${p(`Hej ${data.firstName}, din Aurora Transport-prenumeration har avslutats.`)}
      ${box(`<div style="font-size:13px;color:#334155">📦 Din data sparas i 30 dagar. Under den perioden kan du återaktivera ditt konto och behålla all data.</div>`)}
      <div style="text-align:center;margin:24px 0">
        ${btn("Återaktivera mitt konto", data.reactivateUrl)}
      </div>
      ${muted("Tack för att du använde Aurora Transport.")}
    `,
  };
}
