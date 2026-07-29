#!/usr/bin/env node
/**
 * Idempotent patcher för den genererade ios/-mappen.
 * Körs efter `npx cap add ios` (lokalt eller i Codemagic) och ser till att
 * Aurora Transport-specifika inställningar finns på plats.
 *
 * Gör:
 *  1. NSLocationWhenInUseUsageDescription i Info.plist (krävs för förar-GPS —
 *     appen kraschar annars när position efterfrågas, och Apple underkänner)
 *  2. App.entitlements med aps-environment=production (push-notiser)
 *  3. CODE_SIGN_ENTITLEMENTS i project.pbxproj (pekar ut filen i båda
 *     build-konfigurationerna)
 *  4. AppDelegate-metoder som brottar APNs-token till Capacitor-pluginet
 *
 * Serverdelen skickar sedan via APNs direkt (se send-push), så Firebase
 * behövs inte på iOS.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

if (!existsSync(resolve('ios/App/App/Info.plist'))) {
  console.warn('[ios-post-add] ios/ hittades inte — hoppar över (kör "npx cap add ios" först).');
  process.exit(0);
}

// ─── 1. Info.plist: platsbehörighet ─────────────────────────────────────────
const plistPath = resolve('ios/App/App/Info.plist');
const LOCATION_USAGE_DESCRIPTION =
  'Förare delar sin position så att trafikledningen kan följa uppdrag i realtid.';

let plist = readFileSync(plistPath, 'utf8');
if (!plist.includes('NSLocationWhenInUseUsageDescription')) {
  const entry = `\t<key>NSLocationWhenInUseUsageDescription</key>\n\t<string>${LOCATION_USAGE_DESCRIPTION}</string>\n`;
  plist = plist.replace(/<\/dict>\s*<\/plist>/, `${entry}</dict>\n</plist>`);
  writeFileSync(plistPath, plist);
  console.log('[ios-post-add] Info.plist: NSLocationWhenInUseUsageDescription tillagd.');
} else {
  console.log('[ios-post-add] Info.plist redan uppdaterad.');
}

// ─── 2. Entitlements-fil med push-behörighet ────────────────────────────────
const entitlementsPath = resolve('ios/App/App/App.entitlements');
if (!existsSync(entitlementsPath)) {
  writeFileSync(
    entitlementsPath,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>aps-environment</key>
\t<string>production</string>
</dict>
</plist>
`
  );
  console.log('[ios-post-add] App.entitlements skapad (aps-environment=production).');
} else {
  console.log('[ios-post-add] App.entitlements finns redan.');
}

// ─── 3. Peka ut entitlements-filen i Xcode-projektet ────────────────────────
const pbxprojPath = resolve('ios/App/App.xcodeproj/project.pbxproj');
let pbxproj = readFileSync(pbxprojPath, 'utf8');
if (!pbxproj.includes('CODE_SIGN_ENTITLEMENTS')) {
  pbxproj = pbxproj.replaceAll(
    /(\t+)PRODUCT_BUNDLE_IDENTIFIER = se\.auroramedia\.auroratransport;/g,
    '$1CODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n$1PRODUCT_BUNDLE_IDENTIFIER = se.auroramedia.auroratransport;'
  );
  writeFileSync(pbxprojPath, pbxproj);
  console.log('[ios-post-add] CODE_SIGN_ENTITLEMENTS tillagd i project.pbxproj.');
} else {
  console.log('[ios-post-add] CODE_SIGN_ENTITLEMENTS finns redan.');
}

// ─── 4. AppDelegate: brotta APNs-token till push-pluginet ───────────────────
const appDelegatePath = resolve('ios/App/App/AppDelegate.swift');
let appDelegate = readFileSync(appDelegatePath, 'utf8');
if (!appDelegate.includes('didRegisterForRemoteNotificationsWithDeviceToken')) {
  const methods = `
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
`;
  // Sätt in före klassens avslutande måsvinge (sista '}' i filen)
  const lastBrace = appDelegate.lastIndexOf('}');
  appDelegate = `${appDelegate.slice(0, lastBrace)}${methods}}\n`;
  writeFileSync(appDelegatePath, appDelegate);
  console.log('[ios-post-add] AppDelegate: push-metoder tillagda.');
} else {
  console.log('[ios-post-add] AppDelegate har redan push-metoder.');
}
