import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Löne- och OB-beräkningarna tolkar tider i svensk lokal tid. Utan fast tidszon
// blir testerna beroende av vilken tidszon CI-miljön råkar köra i.
process.env.TZ = "Europe/Stockholm";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
