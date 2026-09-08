import { defineConfig } from '@playwright/test';

// A separate config keeps these tests independent of Lovable's hosted runner.
export default defineConfig({
  testDir: '.',
  testMatch: ['dispatch.spec.ts', 'integrations.spec.ts'],
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  outputDir: '../test-results/dispatch',
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4175',
    viewport: { width: 1440, height: 1000 },
    locale: 'sv-SE',
    timezoneId: 'Europe/Stockholm',
    colorScheme: 'light',
    contextOptions: { reducedMotion: 'reduce' },
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
  },
  webServer: {
    command: `"${process.execPath}" node_modules/vite/bin/vite.js --config e2e/dispatch.vite.config.ts --host 127.0.0.1 --port 4175 --strictPort`,
    cwd: '..',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: 'https://dispatch-fixture.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'dispatch-fixture-publishable-key',
    },
  },
});
