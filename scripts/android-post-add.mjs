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

// ─── FCM: google-services.json + plugin (bara om nyckeln finns som env) ───
// Lägg hela google-services.json som base64 i Codemagic-variabeln
// GOOGLE_SERVICES_JSON (grupp "google_play"). Utan den hoppas push-stödet
// över och appen byggs ändå.
const gservicesB64 = process.env.GOOGLE_SERVICES_JSON;
if (!gservicesB64) {
  console.warn('[android-post-add] GOOGLE_SERVICES_JSON saknas — push-notiser på Android hoppas över.');
} else {
  const appJsonPath = resolve('android/app/google-services.json');
  const decoded = Buffer.from(gservicesB64, 'base64').toString('utf8');
  if (!existsSync(appJsonPath) || readFileSync(appJsonPath, 'utf8') !== decoded) {
    writeFileSync(appJsonPath, decoded);
    console.log('[android-post-add] google-services.json skriven från env.');
  }

  // Klassväg i projekt-nivåns build.gradle
  const projectGradlePath = resolve('android/build.gradle');
  let projectGradle = readFileSync(projectGradlePath, 'utf8');
  if (!projectGradle.includes('com.google.gms:google-services')) {
    projectGradle = projectGradle.replace(
      /(classpath ['"]com\.android\.tools\.build:gradle[^'"]*['"])/,
      `$1\n        classpath 'com.google.gms:google-services:4.4.4'`
    );
    writeFileSync(projectGradlePath, projectGradle);
    console.log('[android-post-add] google-services classpath tillagd i android/build.gradle.');
  }

  // Plugin-apply i app-modulens build.gradle
  const appGradlePath = resolve('android/app/build.gradle');
  let appGradle = readFileSync(appGradlePath, 'utf8');
  if (!appGradle.includes('com.google.gms.google-services')) {
    appGradle += `\napply plugin: 'com.google.gms.google-services'\n`;
    writeFileSync(appGradlePath, appGradle);
    console.log('[android-post-add] google-services plugin tillagd i android/app/build.gradle.');
  }
}