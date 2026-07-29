#!/usr/bin/env node
/**
 * Idempotent patcher för den genererade ios/-mappen.
 * Körs efter `npx cap add ios` (lokalt eller i Codemagic) och ser till att
 * Aurora Transport-specifika inställningar finns på plats.
 *
 * Gör idag:
 *  - NSLocationWhenInUseUsageDescription i Info.plist (krävs för förar-GPS —
 *    appen kraschar annars när position efterfrågas, och Apple underkänner)
 *
 * Push-notiser på iOS (v2) kräver dessutom: aps-environment-entitlement,
 * AppDelegate-metoder samt APNs-nyckel eller Firebase — det sätts upp när
 * Apple Developer-kontot är på plats.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const plistPath = resolve('ios/App/App/Info.plist');
if (!existsSync(plistPath)) {
  console.warn(`[ios-post-add] ${plistPath} hittades inte — hoppar över (kör 'npx cap add ios' först).`);
  process.exit(0);
}

const LOCATION_USAGE_DESCRIPTION =
  'Förare delar sin position så att trafikledningen kan följa uppdrag i realtid.';

let plist = readFileSync(plistPath, 'utf8');
let changed = false;

if (!plist.includes('NSLocationWhenInUseUsageDescription')) {
  const entry = `\t<key>NSLocationWhenInUseUsageDescription</key>\n\t<string>${LOCATION_USAGE_DESCRIPTION}</string>\n`;
  plist = plist.replace(/<\/dict>\s*<\/plist>/, `${entry}</dict>\n</plist>`);
  changed = true;
}

if (changed) {
  writeFileSync(plistPath, plist);
  console.log('[ios-post-add] Info.plist uppdaterad (NSLocationWhenInUseUsageDescription).');
} else {
  console.log('[ios-post-add] Info.plist redan uppdaterad.');
}
