#!/usr/bin/env node
/**
 * Genererar dist/sitemap.xml vid varje bygge.
 *
 * Tidigare låg sitemapen som en handskriven statisk fil i public/sitemap.xml.
 * Den regenererades aldrig, så varje ny sida eller bloggartikel behövde läggas
 * in manuellt — och lastmod fastnade på det datum någon senast orkade.
 *
 * Nu härleds URL:erna ur samma källor som prerenderingen använder:
 *   - STATIC_ROUTES speglar STATIC_PAGES i generate-static-pages.mjs
 *   - blogginläggen läses ur src/lib/blog-data.ts
 *
 * Körs efter `vite build` och efter generate-static-pages.mjs. Skriver över
 * den kopia av public/sitemap.xml som Vite lagt i dist/.
 */

import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBlogPosts } from "./lib/blog-posts.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const BLOG_DATA = resolve(ROOT, "src/lib/blog-data.ts");
const PRERENDER_SCRIPT = resolve(ROOT, "scripts/generate-static-pages.mjs");
const BASE_URL = "https://auroratransport.se";

const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Publika routes med prioritet och uppdateringsfrekvens.
 * Måste hållas i synk med STATIC_PAGES i generate-static-pages.mjs —
 * assertRoutesInSync() nedan larmar om de glider isär.
 */
const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/en", priority: "0.7", changefreq: "monthly" },
  { path: "/boka", priority: "0.9", changefreq: "monthly" },
  { path: "/tjanster", priority: "0.8", changefreq: "monthly" },
  { path: "/transportledningssystem", priority: "0.9", changefreq: "monthly" },
  { path: "/tidrapportering-transport", priority: "0.8", changefreq: "monthly" },
  { path: "/vad-kostar-transportledningssystem", priority: "0.9", changefreq: "monthly" },
  { path: "/coredination-alternativ", priority: "0.8", changefreq: "monthly" },
  { path: "/opter-alternativ", priority: "0.8", changefreq: "monthly" },
  { path: "/workify-alternativ", priority: "0.8", changefreq: "monthly" },
  { path: "/hogia-transport-alternativ", priority: "0.8", changefreq: "monthly" },
  { path: "/pindeliver-alternativ", priority: "0.8", changefreq: "monthly" },
  { path: "/alystra-alternativ", priority: "0.8", changefreq: "monthly" },
  { path: "/budtjanst-app", priority: "0.8", changefreq: "monthly" },
  { path: "/akeri-system", priority: "0.8", changefreq: "monthly" },
  { path: "/dispatch-system", priority: "0.8", changefreq: "monthly" },
  { path: "/transportplanering", priority: "0.8", changefreq: "monthly" },
  { path: "/digital-foljesedel", priority: "0.8", changefreq: "monthly" },
  { path: "/kororder-app", priority: "0.8", changefreq: "monthly" },
  { path: "/transportbemanning", priority: "0.8", changefreq: "monthly" },
  { path: "/om-oss", priority: "0.5", changefreq: "yearly" },
  { path: "/kontakt", priority: "0.6", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/blogg", priority: "0.7", changefreq: "weekly" },
  
];

/**
 * Larmar om någon lägger till en sida i prerenderingen utan att lägga in den
 * här (eller tvärtom). Utan den här kontrollen glider filerna isär tyst, vilket
 * är precis hur den gamla sitemapen blev inaktuell.
 */
function assertRoutesInSync() {
  if (!existsSync(PRERENDER_SCRIPT)) return;
  const src = readFileSync(PRERENDER_SCRIPT, "utf8");
  const prerendered = new Set(
    [...src.matchAll(/route:\s*["']([^"']+)["']/g)].map((m) => m[1])
  );
  const listed = new Set(STATIC_ROUTES.map((r) => r.path));

  const missing = [...prerendered].filter((r) => !listed.has(r));
  const extra = [...listed].filter((r) => !prerendered.has(r));

  if (missing.length) {
    throw new Error(
      `[generate-sitemap] Dessa routes prerenderas men saknas i STATIC_ROUTES: ${missing.join(", ")}`
    );
  }
  if (extra.length) {
    throw new Error(
      `[generate-sitemap] Dessa routes ligger i STATIC_ROUTES men prerenderas inte: ${extra.join(", ")}`
    );
  }
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

function main() {
  if (!existsSync(DIST)) {
    console.warn(
      "[generate-sitemap] Hittade ingen dist/ – kör vite build först. Hoppar över."
    );
    return;
  }

  assertRoutesInSync();

  const entries = STATIC_ROUTES.map((route) =>
    urlEntry({
      loc: `${BASE_URL}${route.path}`,
      lastmod: TODAY,
      changefreq: route.changefreq,
      priority: route.priority,
    })
  );

  const posts = loadBlogPosts(BLOG_DATA);
  for (const post of posts) {
    entries.push(
      urlEntry({
        loc: `${BASE_URL}/blogg/${post.slug}`,
        // Riktigt publiceringsdatum i stället för byggdatum — annars ser varje
        // artikel nyskriven ut vid varje deploy och lastmod tappar sitt värde.
        lastmod: post.publishDate,
        changefreq: "yearly",
        priority: "0.6",
      })
    );
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");

  writeFileSync(resolve(DIST, "sitemap.xml"), xml, "utf8");

  console.log(
    `\n✓ [generate-sitemap] Skrev dist/sitemap.xml med ${entries.length} URL:er ` +
      `(${STATIC_ROUTES.length} sidor + ${posts.length} blogginlägg).\n`
  );
}

main();
