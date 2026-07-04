#!/usr/bin/env node
/**
 * Idempotent patcher for the generated android/ folder.
 * Runs after `npx cap add android` (locally or in Codemagic) and
 * ensures Aurora Transport-specific manifest entries are present.
 *
 * Adds:
 *  - INTERNET permission (usually present, kept for safety)
 *  - ACCESS_NETWORK_STATE
 *  - POST_NOTIFICATIONS (Android 13+ push notification requirement)
 *  - ACCESS_FINE_LOCATION + ACCESS_COARSE_LOCATION (driver GPS)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const manifestPath = resolve('android/app/src/main/AndroidManifest.xml');
if (!existsSync(manifestPath)) {
  console.warn(`[android-post-add] ${manifestPath} not found — skipping (run 'npx cap add android' first).`);
  process.exit(0);
}

const permissions = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
];

let manifest = readFileSync(manifestPath, 'utf8');
let added = 0;
for (const perm of permissions) {
  if (manifest.includes(`android:name="${perm}"`)) continue;
  const line = `    <uses-permission android:name="${perm}" />`;
  manifest = manifest.replace(/<application/, `${line}\n\n    <application`);
  added += 1;
}

if (added > 0) {
  writeFileSync(manifestPath, manifest);
  console.log(`[android-post-add] Added ${added} permission(s) to AndroidManifest.xml`);
} else {
  console.log('[android-post-add] AndroidManifest.xml already up to date.');
}