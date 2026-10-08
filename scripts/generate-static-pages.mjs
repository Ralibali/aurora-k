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
 * SPA:n ersätter markupen och tar över på klienten.
 *
 * Detta ersätter den tidigare Puppeteer-baserade lösningen (krävde Chrome i
 * byggmiljön). Sökmotorer och sociala crawlers ser nu fullständig HTML
 * omedelbart, utan headless browser-beroenden.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeHostingPages } from './hosting-pages.mjs';
import { createPublicRenderer } from './prerender-react.mjs';
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
  { route: "/boka-demo" },
  {
    route: "/",
    title: "Slipp Excel & WhatsApp i transportplaneringen | Aurora Transport",
    description:
      "Aurora Transport samlar uppdrag, förare, tidrapporter och fakturering i ett enkelt svenskt system. 449 kr/mån. Ingen bindningstid. Boka 15 min demo.",
    h1: "Transportledningssystem för åkerier och budfirmor",
  },
  {
    route: "/en",
    title: "Transport management system for hauliers | Aurora Transport",
    description:
      "Swedish TMS for hauliers, couriers and transport staffing. Jobs, drivers, time reporting and invoice drafts from 449 SEK/month.",
    h1: "Transport management system for hauliers and couriers",
  },
  {
    route: "/boka",
    title: "Boka transport | Aurora Transport",
    description:
      "Boka en transport hos våra åkerier direkt online. Fyll i uppdrag, adresser och önskad tid – vi återkommer med bekräftelse och pris.",
    h1: "Boka transport",
  },
  {
    route: "/tjanster",
    title: "Tjänster — Transportledning & GPS | Aurora Transport",
    description:
      "Komplett transportledningssystem: uppdragshantering, förarapp, GPS-spårning, fakturering och kundportal. 449 kr/mån, obegränsat antal förare.",
    h1: "Tjänster – allt du behöver för att leda transporter",
  },
  {
    route: "/transportledningssystem",
    title:
      "Transportledningssystem för åkerier & transportföretag | Aurora Transport",
    description:
      "Aurora Transport är ett enkelt transportledningssystem för åkerier, budföretag och bemanningsteam. Hantera uppdrag, förare, tidrapporter och fakturaunderlag från 449 kr/mån.",
    h1: "Transportledningssystem för åkerier och transportföretag",
  },
  {
    route: "/tidrapportering-transport",
    title:
      "Tidrapportering transport | Tidrapportera i mobilen med Aurora Transport",
    description:
      "Digital tidrapportering för transportföretag, åkerier och budfirmor. Låt förare tidrapportera i mobilen och skapa tydligare fakturaunderlag med Aurora Transport.",
    h1: "Tidrapportering för transport – direkt i förarens mobil",
  },
  {
    route: "/vad-kostar-transportledningssystem",
    title:
      "Vad kostar ett transportledningssystem? Pris för åkerier | Aurora Transport",
    description:
      "Vad kostar ett transportledningssystem för åkerier, budfirmor och transportföretag? Läs om pris, setup, tidrapportering, dispatch och vad som ingår i Aurora Transport.",
    h1: "Vad kostar ett transportledningssystem?",
  },
  {
    route: "/coredination-alternativ",
    title: "Coredination-alternativ — enklare | Aurora Transport",
    description:
      "Letar du efter alternativ till Coredination? Fast pris 449 kr/mån, obegränsat antal användare och ingen bindningstid.",
    h1: "Alternativ till Coredination",
  },
  {
    route: "/opter-alternativ",
    title: "Opter-alternativ för mindre transportföretag | Aurora Transport",
    description:
      "Alternativ till Opter för mindre åkerier och budfirmor. Fast pris 449 kr/mån, obegränsat antal användare, ingen bindningstid.",
    h1: "Opter-alternativet för mindre transportföretag",
  },
  {
    route: "/workify-alternativ",
    title: "Workify-alternativ med fast teampris | Aurora Transport",
    description:
      "Söker du ett alternativ till Workify? Aurora Transport erbjuder uppdrag, förarapp och tidrapportering till fast teampris.",
    h1: "Workify-alternativet med fast teampris",
  },
  {
    route: "/hogia-transport-alternativ",
    title: "Hogia Transport-alternativ för små åkerier | Aurora Transport",
    description:
      "Enklare alternativ till Hogia Transport för mindre åkerier. Fast pris 449 kr/mån, obegränsat antal förare, ingen bindningstid.",
    h1: "Hogia Transport-alternativet för små åkerier",
  },
  {
    route: "/pindeliver-alternativ",
    title: "PinDeliver-alternativ för B2B-transport | Aurora Transport",
    description:
      "Alternativ till PinDeliver för B2B-transport och åkerier. Fast pris 449 kr/mån, obegränsat antal användare och ingen bindningstid.",
    h1: "PinDeliver-alternativet för B2B-transport",
  },
  {
    route: "/alystra-alternativ",
    title: "Alystra-alternativ för åkerier med 1–20 bilar | Aurora Transport",
    description:
      "Enklare alternativ till Alystra för åkerier med 1–20 bilar. Fast pris 449 kr/mån, obegränsat antal förare, ingen bindningstid.",
    h1: "Alystra-alternativet för åkerier med 1–20 bilar",
  },
  {
    route: "/budtjanst-app",
    title: "Budtjänst-app — hantera uppdrag digitalt | Aurora Transport",
    description:
      "Perfekt app för budbilar och budföretag. Tilldela uppdrag, spåra förare och få signerade leveranskvitton. 449 kr/mån.",
    h1: "Budtjänst-app för moderna budföretag",
  },
  {
    route: "/akeri-system",
    title: "System för åkerier — enkelt och prisvärt | Aurora Transport",
    description:
      "Digitalisera ditt åkeri med ett modernt system för uppdrag, förare och tidrapporter. Från 449 kr/mån, fast pris.",
    h1: "System för åkerier – enkelt, modernt och prisvärt",
  },
  {
    route: "/dispatch-system",
    title: "Dispatch-system för transportföretag | Aurora Transport",
    description:
      "Modernt dispatch-system för att tilldela uppdrag, följa förare i realtid och kommunicera med chaufförerna. Prova gratis.",
    h1: "Dispatch-system för transportföretag",
  },
  {
    route: "/transportplanering",
    title: "Transportplanering — system för planering av uppdrag & förare | Aurora Transport",
    description:
      "Planera transportuppdrag och förare i ett enkelt system. Drag-and-drop, GPS, notiser och tidrapporter. 449 kr/mån, ingen bindningstid.",
    h1: "Transportplanering som verkligen sparar tid",
  },
  {
    route: "/digital-foljesedel",
    title: "Digital följesedel — signatur, foto & POD i appen | Aurora Transport",
    description:
      "Ersätt papperssedlar med digital följesedel: kundsignatur, foton och POD direkt i förar-appen. Skickas automatiskt till kund.",
    h1: "Slut på papperssedlar — digital följesedel i mobilen",
  },
  {
    route: "/kororder-app",
    title: "Digital körorder app — uppdrag, signatur & GPS i mobilen | Aurora Transport",
    description:
      "Digital körorder app för förare: uppdrag, adresser, kundsignatur, foto och tidrapportering i mobilen. Sluta ringa — allt synkas automatiskt.",
    h1: "Digital körorder app — körordern försvinner aldrig",
  },
  {
    route: "/transportbemanning",
    title: "System för transportbemanning — förare, uppdrag & tidrapporter | Aurora Transport",
    description:
      "Bemanningsbolag inom transport: tilldela förare på sekunder, få färdiga tidrapporter med OB och traktamente och ge kunderna egen portal. 449 kr/mån.",
    h1: "Systemet för transportbemanning — förare, uppdrag och tid i ett flöde",
  },
  {
    route: "/om-oss",
    title: "Om Aurora Transport — Svenskt transportledningssystem",
    description:
      "Aurora Transport utvecklas av Aurora Media AB (559272-0220). Läs om företaget, vår vision och varför vi bygger Sveriges smartaste transportledningssystem.",
    h1: "Om Aurora Transport",
  },
  {
    route: "/kontakt",
    title: "Kontakta oss – Aurora Transport",
    description:
      "Intresserad av Aurora Transport? Fyll i formuläret så kontaktar vi dig för en personlig demo och genomgång.",
    h1: "Kontakta oss",
  },
  {
    route: "/blogg",
    title: "Blogg – Aurora Transport | Guider för transportföretag",
    description:
      "Läs guider, jämförelser och tips om dispatchsystem, transportledning och digitalisering av budtjänst. Skrivet för svenska transportföretag.",
    h1: "Bloggen – guider för transportföretag",
  },
  {
    route: "/privacy",
    title: "Integritetspolicy – Aurora Transport",
    description:
      "Läs om hur Aurora Transport hanterar personuppgifter, cookies och datasäkerhet i enlighet med GDPR.",
    h1: "Integritetspolicy",
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
  const en = route === "/en";
  html = html.replace(/<html[^>]*>/i, `<html lang="${en ? "en" : "sv"}">`);
  html = setOrInsertMetaByProperty(html, "og:locale", en ? "en_GB" : "sv_SE");
  if (route === "/" || route === "/en") html = html.replace("</head>", `<link rel="alternate" hreflang="sv" href="${BASE_URL}/"><link rel="alternate" hreflang="en" href="${BASE_URL}/en"><link rel="alternate" hreflang="x-default" href="${BASE_URL}/"></head>`);
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
async function main() {
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

  writeHostingPages(template, 'Aurora Transport');
  const renderReact = await createPublicRenderer();
  const written = [];
  const posts = loadBlogPosts(resolve(ROOT, "src/lib/blog-data.ts"));

  // 1) Statiska publika sidor
  for (const page of STATIC_PAGES) {
    const rendered = renderReact(page.route);
    if (!/<h1[ >]/.test(rendered.html)) throw new Error(`Missing visible H1 for ${page.route}`);
    const canonical = `${BASE_URL}${page.route === "/" ? "/" : page.route}`;
    const breadcrumbs = [{ name: "Hem", url: `${BASE_URL}/` }];
    if (page.route !== "/") {
      breadcrumbs.push({ name: page.h1, url: canonical });
    }
    const out = renderPage(template, {
      route: page.route,
      title: rendered.meta.title || page.title,
      description: rendered.meta.description || page.description,
      canonical,
      ogType: "website",
      bodyHtml: rendered.html,
      extraJsonLd:
        page.route === "/" ? [] : [buildBreadcrumbJsonLd(breadcrumbs)],
    });
    written.push(out);
  }

  // 2) Bloggposter
  for (const post of posts) {
    const route = `/blogg/${post.slug}`;
    const rendered = renderReact(route);
    if (!/<h1[ >]/.test(rendered.html)) throw new Error(`Missing blog content for ${route}`);
    const canonical = `${BASE_URL}${route}`;
    const breadcrumbs = [
      { name: "Hem", url: `${BASE_URL}/` },
      { name: "Blogg", url: `${BASE_URL}/blogg` },
      { name: post.title, url: canonical },
    ];
    const out = renderPage(template, {
      route,
      title: rendered.meta.title || post.seoTitle,
      description: rendered.meta.description || post.metaDescription,
      canonical,
      ogType: "article",
      bodyHtml: rendered.html,
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

await main();
