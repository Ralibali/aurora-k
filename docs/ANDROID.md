# Android-app – setup och release

Android-plattformen genereras av Capacitor och committas **inte** i repot,
eftersom hela `android/`-mappen är verktygsgenererad. Det här dokumentet
beskriver hur du kommer igång lokalt och hur Codemagic bygger release-AAB.

## Första gången lokalt

```bash
npm install
npm run build
npx cap add android          # skapar android/-mappen
node scripts/android-post-add.mjs   # lägger till POST_NOTIFICATIONS m.fl.
npx cap sync android
npx cap open android         # öppnar Android Studio
```

Filen `scripts/android-post-add.mjs` är idempotent — kör den varje gång du
regenererar `android/` eller efter en Capacitor-uppgradering.

## Firebase Cloud Messaging (push)

1. Skapa ett Firebase-projekt och lägg till Android-appen med paket-ID
   `se.auroramedia.auroratransport`.
2. Ladda ner `google-services.json` och lägg i `android/app/`.
3. Lägg till Firebase-gradle plugin (Android Studio föreslår raderna
   automatiskt när `google-services.json` upptäcks).
4. Skapa ett service account i Firebase (Project Settings → Service accounts
   → Generate new private key). Klistra in hela JSON-innehållet som secret
   `FCM_SERVICE_ACCOUNT` i backend (används av edge-funktionen `send-push`).

## Play Store-signering

1. Skapa en release-keystore:
   ```bash
   keytool -genkey -v -keystore aurora-release.keystore \
     -alias aurora -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Ladda upp keystoren till Codemagic under **Teams → Code signing identities
   → Android keystores** med referensnamn `aurora_keystore`.
3. Skapa Codemagic-gruppen `google_play` med följande variabler:
   - `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` – JSON för Google Play API service
     account (Play Console → Setup → API access).

## Codemagic-workflow

`codemagic.yaml` innehåller workflowet `android-release` som:

1. Kör `npm ci` + `npm run build`.
2. Kör `npx cap add android` (om `android/` saknas) och patchar manifestet.
3. Kör `npx cap sync android`.
4. Bumpar `versionCode` automatiskt utifrån senaste Play internal build.
5. Bygger en signerad `.aab`.
6. Publicerar till Google Play internal track.

Trigga workflowet från Codemagic-dashboard eller med en tag som matchar
`android-v*`.