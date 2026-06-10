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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const TEMPLATE_PATH = resolve(DIST, "index.html");
const BASE_URL = "https://auroratransport.se";

// ---------- Bloggdata laddas direkt från TS-källan ---------------------------
// blog-data.ts är ren data – vi parser:ar manuellt för att slippa TS-loader.
function loadBlogPosts() {
  const src = readFileSync(resolve(ROOT, "src/lib/blog-data.ts"), "utf8");
  const posts = [];
  const blockRegex = /\{\s*slug:\s*'([^']+)',\s*title:\s*'([^']+)',\s*seoTitle:\s*'([^']+)',\s*metaDescription:\s*'([^']+)',\s*publishDate:\s*'([^']+)',\s*readTime:\s*'([^']+)',\s*excerpt:\s*'([^']+)',/g;
  let m;
  while ((m = blockRegex.exec(src)) !== null) {
    posts.push({
      slug: m[1],
      title: m[2],
      seoTitle: m[3],
      metaDescription: m[4],
      publishDate: m[5],
      readTime: m[6],
      excerpt: m[7],
    });
  }
  if (posts.length === 0) {
    throw new Error("Kunde inte parsa några blogginlägg ur src/lib/blog-data.ts");
  }
  return posts;
}

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
      "Tilldela uppdrag, följ status i realtid, samla tidrapporter direkt från förarna och exportera fakturaunderlag till Fortnox eller Visma – från 449 kr per månad.",
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
      "Letar du efter alternativ till Coredination? Fast pris 449 kr/mån, obegränsat antal användare. Kom igång på 5 min.",
    h1: "Alternativ till Coredination",
    body: [
      "Coredination är ett kraftfullt system, men prissättningen per användare och de långa avtalen passar inte alla. Aurora Transport är ett enklare och mer prisvärt alternativ som är byggt för små och medelstora transportföretag.",
      "Fast pris 449 kr per månad. Obegränsat antal förare. Ingen bindningstid. Kom igång på under fem minuter – utan implementation och utan setup-avgift.",
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
  const posts = loadBlogPosts();
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