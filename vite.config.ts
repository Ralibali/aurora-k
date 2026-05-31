import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import prerender from "@prerenderer/rollup-plugin";
import { PRERENDER_ROUTES } from "./src/lib/seo-routes";
import fs from "node:fs";
import os from "node:os";

// --- SEO-förrendering: tålig Chrome-detektering -------------------------------
function resolveChromePath(): string | null {
  const explicit =
    process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (explicit && fs.existsSync(explicit)) return explicit;

  const cacheRoots = [
    process.env.PUPPETEER_CACHE_DIR,
    path.join(os.homedir(), ".cache", "puppeteer"),
    path.join(process.cwd(), ".cache", "puppeteer"),
    "/root/.cache/puppeteer",
  ].filter(Boolean) as string[];

  for (const root of cacheRoots) {
    const chromeDir = path.join(root, "chrome");
    if (!fs.existsSync(chromeDir)) continue;
    for (const build of fs.readdirSync(chromeDir)) {
      const candidates = [
        path.join(chromeDir, build, "chrome-linux64", "chrome"),
        path.join(chromeDir, build, "chrome-linux", "chrome"),
        path.join(
          chromeDir, build, "chrome-mac-x64",
          "Google Chrome for Testing.app", "Contents", "MacOS",
          "Google Chrome for Testing"
        ),
        path.join(
          chromeDir, build, "chrome-mac-arm64",
          "Google Chrome for Testing.app", "Contents", "MacOS",
          "Google Chrome for Testing"
        ),
      ];
      const found = candidates.find((p) => fs.existsSync(p));
      if (found) return found;
    }
  }

  const systemPaths = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  return systemPaths.find((p) => fs.existsSync(p)) ?? null;
}

function createPrerenderPlugins(mode: string): Plugin[] {
  if (mode !== "production") return [];

  const chromePath = resolveChromePath();
  if (!chromePath) {
    console.warn(
      "\n⚠️  [prerender] Ingen Chrome/Chromium hittades – hoppar över SEO-förrendering.\n" +
        "    Bygget slutförs ändå (SPA:n fungerar), men publika sidor får ingen\n" +
        "    statiskt förrenderad HTML. Aktivera förrenderingen genom att köra\n" +
        "    `npx puppeteer browsers install chrome` i byggmiljön, eller sätt\n" +
        "    PUPPETEER_EXECUTABLE_PATH till sökvägen för en Chrome-binär.\n"
    );
    return [];
  }

  console.log(`\n✓  [prerender] Använder Chrome: ${chromePath}\n`);

  return [
    prerender({
      routes: PRERENDER_ROUTES,
      renderer: "@prerenderer/renderer-puppeteer",
      rendererOptions: {
        maxConcurrentRoutes: 1,
        renderAfterDocumentEvent: "aurora-seo-ready",
        renderAfterTime: 5000,
        headless: true,
        launchOptions: {
          executablePath: chromePath,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
      },
      postProcess(renderedRoute: { route: string; html: string }): void {
        const routePath =
          renderedRoute.route === "/"
            ? "/"
            : renderedRoute.route.replace(/\/$/, "");

        const canonical = `https://auroratransport.se${routePath}`;
        const canonicalTag = `<link rel="canonical" href="${canonical}" />`;

        if (/<link\s+rel=["']canonical["'][^>]*>/i.test(renderedRoute.html)) {
          renderedRoute.html = renderedRoute.html.replace(
            /<link\s+rel=["']canonical["'][^>]*>/i,
            canonicalTag
          );
        } else {
          renderedRoute.html = renderedRoute.html.replace(
            "</head>",
            `  ${canonicalTag}\n</head>`
          );
        }

        if (/<meta\s+property=["']og:url["'][^>]*>/i.test(renderedRoute.html)) {
          renderedRoute.html = renderedRoute.html.replace(
            /<meta\s+property=["']og:url["'][^>]*>/i,
            `<meta property="og:url" content="${canonical}" />`
          );
        }
      },
    }) as unknown as Plugin,
  ];
}
// -----------------------------------------------------------------------------

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    // Ensure Supabase publishable config is always baked into the production
    // bundle even when the .env file is not picked up during deploy builds.
    // These are public/anon keys – safe to commit.
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL ?? "https://dqjwtnziasqtveuwnalx.supabase.co"
    ),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxand0bnppYXNxdHZldXduYWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NjQ5MTksImV4cCI6MjA5MDQ0MDkxOX0.WR_2cBXiGhuhEEo5StJGMPBjgwUi_utZUZNn-TYbtOg"
    ),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      // Registreringen görs manuellt i src/main.tsx så att den kan spärras
      // under prerender/build på 127.0.0.1. Annars kan HeadlessChrome försöka
      // hämta /sw.js innan den finns och Sentry får MIME-felet text/html.
      injectRegister: false,
      devOptions: {
        enabled: false,
      },
      includeAssets: ["icon-192x192.png", "icon-512x512.png"],
      manifest: {
        name: "Aurora Transport",
        short_name: "Aurora Transport",
        description: "Transportledningssystem för moderna åkerier",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#1e3a5f",
        orientation: "portrait",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            urlPattern: /\.(?:js|css|woff2?)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "static-cache",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
    // Prerendera publika SEO-sidor till statisk HTML vid produktionsbygge.
    // Hoppar tåligt över steget om ingen Chrome hittas (se createPrerenderPlugins).
    ...createPrerenderPlugins(mode),
  ].filter(Boolean) as Plugin[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
