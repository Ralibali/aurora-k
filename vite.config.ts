import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// SEO-förrendering hanteras nu via scripts/generate-static-pages.mjs som körs
// efter `vite build`. Den skriver statisk HTML per route till dist/<route>/
// utan att kräva en headless browser i byggmiljön.

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
          // Authenticated API responses are intentionally not cached. The app's
          // dedicated IndexedDB queue handles offline writes without risking that
          // one user's customer or invoice data is shown to the next user.
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60,
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
  ].filter(Boolean) as Plugin[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
