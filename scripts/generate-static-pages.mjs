#!/usr/bin/env node
/**
 * Statisk SEO-förrendering för Aurora Transport.
 *
 * Körs efter `vite build` och skriver `dist/<route>/index.html` för varje publik
 * route. Varje fil får:
 *  - rätt <title>, <meta name="description">, <link rel="canonical">
 *  - rätt og:title / og:description / og:url / og:type
 *  - rätt twitter:title / twitter:description
 *  - crawlbar HTML i <div id="root"> (H1, intro, ev. BlogPosting JSON-LD)
 *
 * SPA:n hydrerar ovanpå den statiska markupen och tar över på klienten.
 *
 * Detta ersätter den tidigare Puppeteer-baserade lösningen (krävde Chrome i
 * byggmiljön). Sökmotorer och sociala crawlers ser nu fullständig HTML
 * omedelbart, utan headless browser-beroenden.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBlogPosts } from "./lib/blog-posts.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const TEMPLATE_PATH = resolve(DIST, "index.html");
const BASE_URL = "https://auroratransport.se";

// ---------- Statiska publika sidor ------------------------------------------
// Title/description speglar respektive sidas usePageMeta exakt (annars uppstår
// canonical/title-mismatch mellan statisk HTML och hydrerad SPA).
const STATIC_PAGES = [
  {
    route: "/",
    title: "Slipp Excel & WhatsApp i transportplaneringen | Aurora Transport",
    description:
      "Aurora Transport samlar uppdrag, förare, tidrapporter och fakturering i ett enkelt svenskt system. 449 kr/mån. Ingen bindningstid. Boka 15 min demo.",
    h1: "Transportledningssystem för åkerier och budfirmor",
    body: [
      "Aurora Transport är ett svenskt transportledningssystem som ersätter Excel, WhatsApp och whiteboard. Hantera uppdrag, förare, tidrapporter och fakturaunderlag i ett enda system – byggt för åkerier, budfirmor och transportbemanning.",
      "Fast pris från 449 kr/månad. Obegränsat antal förare. Ingen bindningstid. Boka en kostnadsfri 15-minuters demo så visar vi hur du kan starta i dag.",
    ],
  },
  {
    route: "/en",
    title: "Transport management system for hauliers | Aurora Transport",
    description:
      "Swedish TMS for hauliers, couriers and transport staffing. Jobs, drivers, time reporting and invoice drafts from 449 SEK/month.",
    h1: "Transport management system for hauliers and couriers",
    body: [
      "Aurora Transport is a Swedish transport management system that replaces spreadsheets, WhatsApp and whiteboards. Manage jobs, drivers, time reporting and invoice drafts in one product built for hauliers, couriers and transport staffing teams.",
      "Flat pricing from 449 SEK per month. Unlimited drivers. No lock-in. Book a free 15-minute demo and see how you can get started today.",
    ],
  },
  {
    route: "/boka",
    title: "Boka transport | Aurora Transport",
    description:
      "Boka en transport hos våra åkerier direkt online. Fyll i uppdrag, adresser och önskad tid – vi återkommer med bekräftelse och pris.",
    h1: "Boka transport",
    body: [
      "Behöver du boka en transport? Fyll i formuläret så matchar vi ditt uppdrag med rätt åkeri och återkommer med bekräftelse och pris.",
      "Ange upphämtnings- och leveransadress, gods och önskad tid – det tar mindre än en minut.",
    ],
  },
  {
    route: "/tjanster",
    title: "Tjänster — Transportledning & GPS | Aurora Transport",
    description:
      "Komplett transportledningssystem: uppdragshantering, förarapp, GPS-spårning, fakturering och kundportal. 449 kr/mån, obegränsat antal förare.",
    h1: "Tjänster – allt du behöver för att leda transporter",
    body: [
      "Aurora Transport ger dig en komplett verktygslåda för modern transportledning: uppdragshantering, förarapp för iOS och Android, GPS-spårning i realtid, fakturering, statistik och kundportal.",
      "Alla funktioner ingår i ett fast pris på 449 kr per månad – inga tillkommande licenser per förare och inget krångel med separata system.",
    ],
  },
  {
    route: "/transportledningssystem",
    title:
      "Transportledningssystem för åkerier & transportföretag | Aurora Transport",
    description:
      "Aurora Transport är ett enkelt transportledningssystem för åkerier, budföretag och bemanningsteam. Hantera uppdrag, förare, tidrapporter och fakturaunderlag från 449 kr/mån.",
    h1: "Transportledningssystem för åkerier och transportföretag",
    body: [
      "Ett transportledningssystem (TMS) hjälper dig att planera uppdrag, fördela förare, följa leveranser och ta fram fakturaunderlag utan dubbeljobb. Aurora Transport är byggt för svenska åkerier och transportföretag som vill lämna Excel och WhatsApp bakom sig.",
      "Tilldela uppdrag, följ status i realtid, samla tidrapporter direkt från förarna och exportera fakturaunderlag som CSV – från 449 kr per månad.",
    ],
  },
  {
    route: "/tidrapportering-transport",
    title:
      "Tidrapportering transport | Tidrapportera i mobilen med Aurora Transport",
    description:
      "Digital tidrapportering för transportföretag, åkerier och budfirmor. Låt förare tidrapportera i mobilen och skapa tydligare fakturaunderlag med Aurora Transport.",
    h1: "Tidrapportering för transport – direkt i förarens mobil",
    body: [
      "Digital tidrapportering för åkerier, budfirmor och transportbemanning. Förarna stämplar in och ut direkt i förarappen, OB- och övertid beräknas automatiskt och du får färdiga underlag för lön och fakturering.",
      "Slipp pappersdagrapporter och Excel-mejl. Aurora Transport samlar all tidrapportering i ett system som dina förare faktiskt vill använda – från 449 kr per månad.",
    ],
  },
  {
    route: "/vad-kostar-transportledningssystem",
    title:
      "Vad kostar ett transportledningssystem? Pris för åkerier | Aurora Transport",
    description:
      "Vad kostar ett transportledningssystem för åkerier, budfirmor och transportföretag? Läs om pris, setup, tidrapportering, dispatch och vad som ingår i Aurora Transport.",
    h1: "Vad kostar ett transportledningssystem?",
    body: [
      "Priset för ett transportledningssystem varierar kraftigt. Etablerade aktörer som Coredination, AlystraGO och Transwide tar ofta 800–2 500 kr per förare och månad plus setup-avgifter på 20 000–100 000 kr.",
      "Aurora Transport kostar 449 kr per månad – fast pris, obegränsat antal förare, ingen bindningstid och ingen setup-avgift. Du får uppdragshantering, förarapp, GPS, tidrapportering, fakturering och kundportal i samma pris.",
    ],
  },
  {
    route: "/coredination-alternativ",
    title: "Coredination-alternativ — enklare | Aurora Transport",
    description:
      "Letar du efter alternativ till Coredination? Fast pris 449 kr/mån, obegränsat antal användare och ingen bindningstid.",
    h1: "Alternativ till Coredination",
    body: [
      "Coredination är ett kraftfullt system, men prissättningen per användare passar inte alla. Aurora Transport är ett enklare och mer prisvärt alternativ som är byggt för små och medelstora transportföretag.",
      "Fast pris 449 kr per månad. Obegränsat antal förare. Ingen bindningstid.",
    ],
  },
  {
    route: "/opter-alternativ",
    title: "Opter-alternativ för mindre transportföretag | Aurora Transport",
    description:
      "Alternativ till Opter för mindre åkerier och budfirmor. Fast pris 449 kr/mån, obegränsat antal användare, ingen bindningstid.",
    h1: "Opter-alternativet för mindre transportföretag",
    body: [
      "Opter är ett välkänt transportledningssystem för större transportorganisationer. För mindre åkerier och budfirmor blir det ofta i tyngsta laget – både i funktioner och pris.",
      "Aurora Transport ger dig ett enkelt dispatchflöde med förarapp, tidrapportering och fakturaunderlag för 449 kr per månad, med obegränsat antal förare och ingen bindningstid.",
    ],
  },
  {
    route: "/workify-alternativ",
    title: "Workify-alternativ med fast teampris | Aurora Transport",
    description:
      "Söker du ett alternativ till Workify? Aurora Transport erbjuder uppdrag, förarapp och tidrapportering till fast teampris.",
    h1: "Workify-alternativet med fast teampris",
    body: [
      "Workify är populärt bland service- och installationsteam. För transportföretag som vill ha ett tydligt uppdrags- och dispatchflöde kan Aurora Transport vara ett mer renodlat alternativ.",
      "Fast pris 449 kr per månad för hela teamet. Uppdrag, förarapp, tidrapportering och fakturaunderlag – utan pris per användare.",
    ],
  },
  {
    route: "/hogia-transport-alternativ",
    title: "Hogia Transport-alternativ för små åkerier | Aurora Transport",
    description:
      "Enklare alternativ till Hogia Transport för mindre åkerier. Fast pris 449 kr/mån, obegränsat antal förare, ingen bindningstid.",
    h1: "Hogia Transport-alternativet för små åkerier",
    body: [
      "Hogia Transport är byggt för större transportorganisationer med tunga integrationskrav. Aurora Transport är istället byggt för små åkerier och budfirmor som vill komma igång snabbt.",
      "Ett fast pris på 449 kr per månad, obegränsat antal förare och ett fokuserat flöde för uppdrag, förare, tidrapporter och fakturaunderlag.",
    ],
  },
  {
    route: "/pindeliver-alternativ",
    title: "PinDeliver-alternativ för B2B-transport | Aurora Transport",
    description:
      "Alternativ till PinDeliver för B2B-transport och åkerier. Fast pris 449 kr/mån, obegränsat antal användare och ingen bindningstid.",
    h1: "PinDeliver-alternativet för B2B-transport",
    body: [
      "PinDeliver är starkt inom e-handelns sista mil. För B2B-åkerier och transportbemanning ger Aurora Transport ett tydligare dispatchflöde med uppdrag, förarapp och tidrapportering.",
      "Fast pris 449 kr per månad, obegränsat antal förare och ingen bindningstid.",
    ],
  },
  {
    route: "/alystra-alternativ",
    title: "Alystra-alternativ för åkerier med 1–20 bilar | Aurora Transport",
    description:
      "Enklare alternativ till Alystra för åkerier med 1–20 bilar. Fast pris 449 kr/mån, obegränsat antal förare, ingen bindningstid.",
    h1: "Alystra-alternativet för åkerier med 1–20 bilar",
    body: [
      "Alystra är etablerat hos större transportorganisationer. För åkerier med 1–20 bilar blir det ofta för tungt att implementera och för dyrt att växa i.",
      "Aurora Transport ger dig ett fokuserat transportledningssystem för 449 kr per månad – obegränsat antal förare och utan bindningstid.",
    ],
  },
  {
    route: "/budtjanst-app",
    title: "Budtjänst-app — hantera uppdrag digitalt | Aurora Transport",
    description:
      "Perfekt app för budbilar och budföretag. Tilldela uppdrag, spåra förare och få signerade leveranskvitton. 449 kr/mån.",
    h1: "Budtjänst-app för moderna budföretag",
    body: [
      "Aurora Transports budtjänst-app är byggd för budbilar, kurirföretag och småskalig distribution. Tilldela uppdrag, följ förare på karta i realtid och få digitala leveranskvitton med foto och kundsignatur.",
      "Allt i ett system – från första bokningen till färdigt fakturaunderlag. 449 kr per månad, obegränsat antal förare.",
    ],
  },
  {
    route: "/akeri-system",
    title: "System för åkerier — enkelt och prisvärt | Aurora Transport",
    description:
      "Digitalisera ditt åkeri med ett modernt system för uppdrag, förare och tidrapporter. Från 449 kr/mån, fast pris.",
    h1: "System för åkerier – enkelt, modernt och prisvärt",
    body: [
      "Aurora Transport är ett komplett åkerisystem som samlar uppdragshantering, förarapp, GPS, tidrapportering och fakturaunderlag i ett system. Byggt för svenska åkerier som vill digitalisera utan långa implementationsprojekt.",
      "Fast pris från 449 kr per månad. Inga licenskostnader per förare, ingen bindningstid och ingen setup-avgift.",
    ],
  },
  {
    route: "/dispatch-system",
    title: "Dispatch-system för transportföretag | Aurora Transport",
    description:
      "Modernt dispatch-system för att tilldela uppdrag, följa förare i realtid och kommunicera med chaufförerna. Prova gratis.",
    h1: "Dispatch-system för transportföretag",
    body: [
      "Ett bra dispatch-system gör skillnaden mellan kaos och kontroll. Aurora Transport ger dig en visuell dispatch-vy där du tilldelar uppdrag, ser förarstatus i realtid och kommunicerar direkt med chaufförerna via förarappen.",
      "Byggt för transportledare som vill ha en tydlig översikt utan att klicka sig igenom tjugo menyer. 449 kr per månad, ingen bindningstid.",
    ],
  },
  {
    route: "/transportplanering",
    title: "Transportplanering — system för planering av uppdrag & förare | Aurora Transport",
    description:
      "Planera transportuppdrag och förare i ett enkelt system. Drag-and-drop, GPS, notiser och tidrapporter. 449 kr/mån, ingen bindningstid.",
    h1: "Transportplanering som verkligen sparar tid",
    body: [
      "Aurora Transport är ett komplett verktyg för transportplanering: dra och släpp uppdrag till rätt förare, se förarstatus i realtid och få automatiska tidrapporter. Sluta jaga förare på telefon och WhatsApp.",
      "Allt sker i samma system som hanterar fakturering, kundregister och löneunderlag. 449 kr per månad, ingen bindningstid och igång samma dag.",
    ],
  },
  {
    route: "/digital-foljesedel",
    title: "Digital följesedel — signatur, foto & POD i appen | Aurora Transport",
    description:
      "Ersätt papperssedlar med digital följesedel: kundsignatur, foton och POD direkt i förar-appen. Skickas automatiskt till kund.",
    h1: "Slut på papperssedlar — digital följesedel i mobilen",
    body: [
      "Med Aurora Transport får dina förare en digital följesedel direkt i mobilen. Mottagaren signerar på skärmen, föraren fotar gods och leveransplats och en POD i PDF skickas automatiskt till kunden.",
      "Allt fungerar offline, loggas med tid och plats och triggar fakturaunderlag direkt — så ni får betalt snabbare och slipper försvunna pappersedlar.",
    ],
  },
  {
    route: "/kororder-app",
    title: "Digital körorder app — uppdrag, signatur & GPS i mobilen | Aurora Transport",
    description:
      "Digital körorder app för förare: uppdrag, adresser, kundsignatur, foto och tidrapportering i mobilen. Sluta ringa — allt synkas automatiskt.",
    h1: "Digital körorder app — körordern försvinner aldrig",
    body: [
      "Med Aurora Transport får föraren hela körordern i mobilen: uppdrag, adresser, kontaktpersoner och instruktioner. Mottagaren signerar på skärmen, föraren fotar godset och tiden rapporteras automatiskt.",
      "GPS och geofence visar var bilen är utan att du ringer. Allt fungerar offline och blir färdiga tidrapporter och fakturaunderlag. 449 kr per månad, ingen bindningstid.",
    ],
  },
  {
    route: "/transportbemanning",
    title: "System för transportbemanning — förare, uppdrag & tidrapporter | Aurora Transport",
    description:
      "Bemanningsbolag inom transport: tilldela förare på sekunder, få färdiga tidrapporter med OB och traktamente och ge kunderna egen portal. 449 kr/mån.",
    h1: "Systemet för transportbemanning — förare, uppdrag och tid i ett flöde",
    body: [
      "Aurora Transport är byggt för bemanningsbolag: se vilka förare som är tillgängliga, tilldela uppdrag på sekunder och låt förarna rapportera tid direkt i appen.",
      "OB-tillägg och traktamenten räknas automatiskt till färdigt löneunderlag, och era uppdragsgivare bokar och följer uppdrag i egen portal. 449 kr per månad utan bindningstid.",
    ],
  },
  {
    route: "/om-oss",
    title: "Om Aurora Transport — Svenskt transportledningssystem",
    description:
      "Aurora Transport utvecklas av Aurora Media AB (559272-0220). Läs om företaget, vår vision och varför vi bygger Sveriges smartaste transportledningssystem.",
    h1: "Om Aurora Transport",
    body: [
      "Aurora Transport utvecklas av Aurora Media AB (org.nr 559272-0220). Vi bygger transportledningssystem för svenska åkerier, budfirmor och bemanningsföretag inom transport.",
      "Vår vision är ett enkelt, prisvärt och modernt system som transportföretag faktiskt vill använda – utan långa avtal, dyra implementationer eller pris-per-användare.",
    ],
  },
  {
    route: "/kontakt",
    title: "Kontakta oss – Aurora Transport",
    description:
      "Intresserad av Aurora Transport? Fyll i formuläret så kontaktar vi dig för en personlig demo och genomgång.",
    h1: "Kontakta oss",
    body: [
      "Vill du veta mer om Aurora Transport eller boka en personlig demo? Fyll i formuläret så hör vi av oss inom en arbetsdag.",
      "Du kan också mejla info@auroramedia.se direkt om du föredrar det.",
    ],
  },
  {
    route: "/blogg",
    title: "Blogg – Aurora Transport | Guider för transportföretag",
    description:
      "Läs guider, jämförelser och tips om dispatchsystem, transportledning och digitalisering av budtjänst. Skrivet för svenska transportföretag.",
    h1: "Bloggen – guider för transportföretag",
    body: [
      "Här samlar vi guider, jämförelser och praktiska tips för svenska åkerier, budfirmor och transportbemanning. Allt skrivet för dig som driver verksamheten.",
      "Lär dig hur du väljer rätt dispatchsystem, vad ett TMS faktiskt bör kosta och hur du digitaliserar din budtjänst steg för steg.",
    ],
  },
  {
    route: "/privacy",
    title: "Integritetspolicy – Aurora Transport",
    description:
      "Läs om hur Aurora Transport hanterar personuppgifter, cookies och datasäkerhet i enlighet med GDPR.",
    h1: "Integritetspolicy",
    body: [
      "Aurora Transport hanterar personuppgifter i enlighet med GDPR. Här beskriver vi vilka uppgifter vi samlar in, varför vi gör det, hur länge vi sparar dem och vilka rättigheter du har.",
      "Personuppgiftsansvarig är Aurora Media AB (org.nr 559272-0220). Har du frågor – kontakta info@auroramedia.se.",
    ],
  },
];

// ---------- HTML-helpers -----------------------------------------------------
function escapeHtml(input) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(input) {
  return escapeHtml(input);
}

function setOrInsertTitle(html, title) {
  const safe = escapeHtml(title);
  if (/<title>[\s\S]*?<\/title>/.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${safe}</title>`);
  }
  return html.replace("</head>", `  <title>${safe}</title>\n</head>`);
}

function setOrInsertMetaByName(html, name, content) {
  const safe = escapeAttr(content);
  const regex = new RegExp(
    `<meta\\s+name=["']${name}["'][^>]*>`,
    "i"
  );
  const tag = `<meta name="${name}" content="${safe}" />`;
  if (regex.test(html)) return html.replace(regex, tag);
  return html.replace("</head>", `  ${tag}\n</head>`);
}

function setOrInsertMetaByProperty(html, property, content) {
  const safe = escapeAttr(content);
  const regex = new RegExp(
    `<meta\\s+property=["']${property}["'][^>]*>`,
    "i"
  );
  const tag = `<meta property="${property}" content="${safe}" />`;
  if (regex.test(html)) return html.replace(regex, tag);
  return html.replace("</head>", `  ${tag}\n</head>`);
}

function setOrInsertCanonical(html, href) {
  const safe = escapeAttr(href);
  const tag = `<link rel="canonical" href="${safe}" />`;
  if (/<link\s+rel=["']canonical["'][^>]*>/i.test(html)) {
    return html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, tag);
  }
  return html.replace("</head>", `  ${tag}\n</head>`);
}

function injectBodyContent(html, contentHtml) {
  // Vite emitterar tomt <div id="root"></div>. Vi fyller den med crawlbar HTML
  // som React sedan hydrerar ovanpå (tomt root → React tar över helt på client).
  return html.replace(
    /<div id="root">\s*<\/div>/,
    `<div id="root">${contentHtml}</div>`
  );
}

function injectJsonLd(html, jsonLd) {
  const script = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
  return html.replace("</head>", `  ${script}\n</head>`);
}

// ---------- Sidrendering -----------------------------------------------------
function renderStaticBody({ h1, paragraphs, breadcrumbs }) {
  const crumbs = breadcrumbs
    ? `<nav aria-label="Brödsmulor"><ol>${breadcrumbs
        .map(
          (c) =>
            `<li><a href="${escapeAttr(c.url)}">${escapeHtml(c.name)}</a></li>`
        )
        .join("")}</ol></nav>`
    : "";
  const body = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  // Sätt aria-hidden för att inte dubbeluppläsas av skärmläsare efter hydration.
  return `<div data-prerendered="true" aria-hidden="true" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;">${crumbs}<h1>${escapeHtml(h1)}</h1>${body}</div>`;
}

function buildBreadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function buildBlogPostingJsonLd(post, canonical) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    name: post.title,
    description: post.metaDescription,
    datePublished: post.publishDate,
    dateModified: post.publishDate,
    inLanguage: "sv-SE",
    author: {
      "@type": "Person",
      name: "Christoffer Holstensson",
    },
    publisher: {
      "@type": "Organization",
      name: "Aurora Transport",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/icon-512x512.png`,
      },
      parentOrganization: {
        "@type": "Organization",
        name: "Aurora Media AB",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
  };
}

function renderPage(template, opts) {
  const {
    route,
    title,
    description,
    canonical,
    ogType = "website",
    bodyHtml,
    extraJsonLd = [],
  } = opts;

  let html = template;
  html = setOrInsertTitle(html, title);
  html = setOrInsertMetaByName(html, "description", description);
  html = setOrInsertCanonical(html, canonical);

  html = setOrInsertMetaByProperty(html, "og:title", title);
  html = setOrInsertMetaByProperty(html, "og:description", description);
  html = setOrInsertMetaByProperty(html, "og:url", canonical);
  html = setOrInsertMetaByProperty(html, "og:type", ogType);

  html = setOrInsertMetaByName(html, "twitter:title", title);
  html = setOrInsertMetaByName(html, "twitter:description", description);

  // Säkerställ index, follow för publika sidor.
  html = setOrInsertMetaByName(
    html,
    "robots",
    "index, follow, max-image-preview:large"
  );

  for (const ld of extraJsonLd) {
    html = injectJsonLd(html, ld);
  }

  if (bodyHtml) {
    html = injectBodyContent(html, bodyHtml);
  }

  // route → dist/<route>/index.html (root → dist/index.html som skrivs sist)
  const relPath =
    route === "/" ? "index.html" : `${route.replace(/^\//, "")}/index.html`;
  const outFile = resolve(DIST, relPath);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, html, "utf8");
  return outFile;
}

// ---------- Main -------------------------------------------------------------
function main() {
  if (!existsSync(TEMPLATE_PATH)) {
    console.warn(
      `[generate-static-pages] Hittade ingen dist/index.html – kör vite build först. Hoppar över.`
    );
    return;
  }

  let template = readFileSync(TEMPLATE_PATH, "utf8");

  // Rensa Twitter-handle som inte finns – annars länkar previews till tomt konto.
  template = template.replace(
    /\s*<meta\s+name=["']twitter:site["'][^>]*>\s*\n?/i,
    "\n"
  );

  const written = [];

  // 1) Statiska publika sidor
  for (const page of STATIC_PAGES) {
    const canonical = `${BASE_URL}${page.route === "/" ? "/" : page.route}`;
    const breadcrumbs = [{ name: "Hem", url: `${BASE_URL}/` }];
    if (page.route !== "/") {
      breadcrumbs.push({ name: page.h1, url: canonical });
    }
    const bodyHtml = renderStaticBody({
      h1: page.h1,
      paragraphs: page.body,
      breadcrumbs,
    });
    const out = renderPage(template, {
      route: page.route,
      title: page.title,
      description: page.description,
      canonical,
      ogType: "website",
      bodyHtml,
      extraJsonLd:
        page.route === "/" ? [] : [buildBreadcrumbJsonLd(breadcrumbs)],
    });
    written.push(out);
  }

  // 2) Bloggposter
  const posts = loadBlogPosts(resolve(ROOT, "src/lib/blog-data.ts"));
  for (const post of posts) {
    const route = `/blogg/${post.slug}`;
    const canonical = `${BASE_URL}${route}`;
    const breadcrumbs = [
      { name: "Hem", url: `${BASE_URL}/` },
      { name: "Blogg", url: `${BASE_URL}/blogg` },
      { name: post.title, url: canonical },
    ];
    const bodyHtml = renderStaticBody({
      h1: post.title,
      paragraphs: [
        `Publicerad ${post.publishDate} · ${post.readTime} läsning.`,
        post.excerpt,
      ],
      breadcrumbs,
    });
    const out = renderPage(template, {
      route,
      title: post.seoTitle,
      description: post.metaDescription,
      canonical,
      ogType: "article",
      bodyHtml,
      extraJsonLd: [
        buildBreadcrumbJsonLd(breadcrumbs),
        buildBlogPostingJsonLd(post, canonical),
      ],
    });
    written.push(out);
  }

  console.log(
    `\n✓ [generate-static-pages] Skrev ${written.length} statiska SEO-sidor till dist/.\n`
  );
}

main();