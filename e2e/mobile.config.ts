import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: 'mobile.spec.ts', workers: 1, timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:4187', viewport: { width: 390, height: 844 }, locale: 'sv-SE', timezoneId: 'Europe/Stockholm', serviceWorkers: 'block', screenshot: 'only-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : undefined },
  webServer: { command: `"${process.execPath}" node_modules/vite/bin/vite.js --mode native --host 127.0.0.1 --port 4187 --strictPort`, url: 'http://127.0.0.1:4187', cwd: '..',
    env: { VITE_SUPABASE_URL: 'https://mobile-fixture.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'mobile-fixture-key' } },
});
