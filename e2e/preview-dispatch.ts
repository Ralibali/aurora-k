import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { FIXED_NOW, installDispatchFixture } from './dispatch-fixture.ts';

// Optional local preview for inspecting the same isolated fixtures with a CDP tool.
// Run from the repository root with Node 24+ (native TypeScript stripping).
process.env.VITE_SUPABASE_URL = 'https://dispatch-fixture.supabase.co';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'dispatch-fixture-publishable-key';
const server = await createServer({ configFile: 'e2e/dispatch.vite.config.ts', server: { host: '127.0.0.1', port: 4175, strictPort: true } });
await server.listen();
const profileDirectory = await mkdtemp(join(tmpdir(), 'aurora-dispatch-preview-'));
const context = await chromium.launchPersistentContext(profileDirectory, {
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ['--remote-debugging-port=9227'],
  viewport: { width: 1440, height: 1000 },
  locale: 'sv-SE', timezoneId: 'Europe/Stockholm', colorScheme: 'light',
  reducedMotion: 'reduce', serviceWorkers: 'block',
});
await installDispatchFixture(context);
const page = context.pages()[0];
await page.clock.setFixedTime(new Date(FIXED_NOW));
await page.goto('http://127.0.0.1:4175/admin/assignments');
await page.getByRole('heading', { name: 'Transportdispatch', exact: true }).waitFor();
console.log('Isolated dispatch preview ready: http://127.0.0.1:4175/admin/assignments; CDP port 9227');

async function close() {
  await context.close();
  await server.close();
  await rm(profileDirectory, { recursive: true, force: true });
  process.exit(0);
}
process.once('SIGINT', () => void close());
process.once('SIGTERM', () => void close());
