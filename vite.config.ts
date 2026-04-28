import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import prerender from "@prerenderer/rollup-plugin";

// Routes som prerendras till statisk HTML vid produktion. Endast publika
// SEO-sidor — inga inloggade vyer, inga /ads/*-annonssidor.
const PRERENDER_ROUTES = [
  "/",
  "/tjanster",
  "/transportledningssystem",
  "/coredination-alternativ",
  "/budtjanst-app",
  "/akeri-system",
  "/dispatch-system",
  "/om-oss",
  "/privacy",
  "/kontakt",
  "/blogg",
  "/blogg/basta-dispatchsystemet-for-akeri-2026",
  "/blogg/hur-digitaliserar-man-sin-budtjanst",
  "/blogg/vad-kostar-ett-transportledningssystem",
  "/blogg/transportledningssystem-for-sma-akerier",
  "/blogg/dispatch-app-forare-transport",
  "/blogg/bemanningsbolag-transport-system",
  "/blogg/skillnad-tms-dispatch-system",
  "/blogg/transportapp-utan-bindningstid",
  "/blogg/digitalt-korordrersystem-fordelar",
  "/blogg/byta-dispatchsystem-guide",
];

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
        short_name: "Aurora",
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
    // Hoppar över i dev (annars startar Puppeteer mot sandboxen) och i
    // development-mode-byggen så att Lovables livepreview fungerar normalt.
    mode === "production" &&
      prerender({
        routes: PRERENDER_ROUTES,
        renderer: "@prerenderer/renderer-puppeteer",
        rendererOptions: {
          maxConcurrentRoutes: 2,
          renderAfterTime: 1500,
          headless: true,
          launchOptions: {
            executablePath:
              process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
          },
        },
        postProcess(renderedRoute: { route: string; html: string }): void {
          // Säkerställ att canonical alltid är auroratransport.se i prerenderad HTML
          const canonical = `https://auroratransport.se${
            renderedRoute.route === "/" ? "/" : renderedRoute.route
          }`;
          renderedRoute.html = renderedRoute.html.replace(
            /<link\s+rel="canonical"[^>]*>/i,
            `<link rel="canonical" href="${canonical}" />`
          );
        },
      }),
  ].filter(Boolean) as Plugin[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
