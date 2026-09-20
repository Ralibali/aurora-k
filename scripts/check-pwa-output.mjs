import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

// Exercise the generated worker, not just the Vite configuration. A stale
// cached app shell previously replaced current, prerendered blog responses.
const source = readFileSync(process.argv[2] ?? "dist/sw.js", "utf8");
const navigationRoutes = [];
let skipWaiting = 0;
let clientsClaim = 0;
const workbox = {
  precacheAndRoute() {},
  cleanupOutdatedCaches() {},
  createHandlerBoundToURL() { return () => {}; },
  registerRoute() {},
  clientsClaim() { clientsClaim += 1; },
  NavigationRoute: class {
    constructor(_handler, options) { navigationRoutes.push(options); }
  },
  CacheFirst: class {},
  ExpirationPlugin: class {},
};
runInNewContext(source, {
  self: {
    define() {},
    addEventListener() {},
    skipWaiting() { skipWaiting += 1; },
  },
  define(_dependencies, factory) { factory(workbox); },
}, { timeout: 1000 });
assert.equal(skipWaiting, 1, "New worker must activate for existing readers");
assert.equal(clientsClaim, 1, "Activated worker must take over existing clients");
assert.equal(navigationRoutes.length, 1, "Expected one app navigation fallback");
const denied = (path) => navigationRoutes[0].denylist.some((pattern) => pattern.test(path));
for (const path of ["/blogg", "/blogg?category=guides", "/blogg/example", "/~oauth/callback"]) {
  assert.ok(denied(path), `${path} must use its network response`);
}
for (const path of ["/driver", "/admin", "/portal", "/bloggar"]) {
  assert.equal(denied(path), false, `${path} must retain its existing app fallback`);
}
console.log("PWA output: update activation and blog/network routing passed");
