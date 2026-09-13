# Aurora Transport — mobilrelease 1.0.0

Dokumentet uppdaterat 13 september 2026 med dagens verifiering av bygge 3, produktionsflöde och butikskonsoler.

**Build 3 är signerad och exporterad för iOS och Android. Riktig iPhone-inloggning och visning av produktionsuppdrag är verifierade. Apple tog emot build 3 den 13 september kl. 21.44 svensk tid och behandlar paketet. Ingen offentlig lansering eller slutlig butiksgranskning har skickats in.**

## Release och återstående arbete

| Del | Senast verifierat |
|---|---|
| App Store | Apppost skapad. Build 2 är vald på distributionsversionen. Build 3 har godkänd arkivering, signering, export och uppladdning; Apple bekräftar att paketet behandlas. Färdig behandling är ännu inte verifierad. En inloggningsskärmbild är uppladdad. Nio datatyper är publicerade med App Functionality, Linked to User: Yes och Tracking: No. Granskningskontaktens namn, telefon och e-post är godkända och sparade. |
| Google Play | Apppost skapad med ID 4973838583465137566. Integritetspolicy och Ads: No är sparade, 2 av 11 uppgifter klara. Signerad AAB och APK för 1.0.0 (3) finns; ingen AAB-uppladdning till Play är verifierad. |
| Firebase | Android-appen är registrerad i projektet aurora-transport-f71c5 på Spark, utan Analytics. Firebase-konfiguration finns för Android-bygget. Backendens utskick via FCM/APNs är inte färdigkonfigurerade eller verifierade. |
| Granskningskonto | Separat testföretag och chaufförskonto verifierade. Det uttryckligen godkända syntetiska tidjobbet har startats och slutförts via produktions-API: 56,8 sekunder, ett leveransbevis och idempotent återförsök. Ett jobb är slutfört, två är oförändrat väntande och testföretagets notifieringskö är tom. |
| Källkod | [codex/driver-mobile-release](https://github.com/Ralibali/aurora-k/tree/codex/driver-mobile-release) innehåller tidigare mobilrelease. Ändringarna för build 3 finns lokalt och är ännu inte committade eller publicerade. Ingen mobilkod har slagits ihop med main. |

Följande återstår före lansering:

1. **Apple:** verifiera att behandlingen av build 3 blir klar, välj därefter detta bygge för versionen, lämna granskningsinloggningen efter det väntande uttryckliga godkännandet och komplettera skärmbilderna. Integritetsdeklarationerna och granskningskontakten är redan sparade. Manuell publicering efter godkänd granskning är vald.
2. **Google Play:** slutför återstående formulär, Data safety, butiksmaterial och granskningsåtkomst samt ladda upp build 3 till testspåret. Klassningen av myndighets-, hälso- och finansfunktioner samt målgruppen 18+ inväntar användarens svar. Därefter återstår tillämplig testning och Googles granskning.
3. **Push och enhetstest:** konfigurera backendens APNs-/FCM-uppgifter och verifiera notiser. Kamera/foto, signatur, nekade behörigheter, nätavbrott, återförsök och utloggning behöver fortfarande kontrolleras på avsedda fysiska enheter. Produktions-API:ts tidflöde och iPhone-inloggningen är verifierade separat. Använd endast de syntetiska granskningsuppdragen för produktionstest.
4. **Databehandling:** kontrollera lagringsregion, lagringstider, faktisk radering, personuppgiftsansvar och leverantörernas behandling. Integritetspolicy och butikssvar måste stämma med produktionen.

Ready to Submit är Apples status för det behandlade bygget och innebär inte att App Review har godkänt appen. Lokala byggen och CI-konfiguration bevisar inte att butikskonton, formulär eller distributionskanaler är färdigkonfigurerade.

Två redan ställda frågor inväntar svar: uttryckligt tillstånd att lämna granskningsinloggningen till Apple och Google samt Googles innehålls-/målgruppsklassning. Automatisk godkännandegranskning stoppade den nya överföringen av granskningsuppgifter till Apple och sparandet av Government app: No. Tidigare hinder för integritetsdeklarationer, kontaktuppgifter och det särskilda produktionstestet är lösta.

## Produkt och implementation

Chaufförer använder företagets konto, ser sina tilldelade uppdrag, startar körningar, lämnar leveransbevis och följer tidrapporter. Foto, signatur och mottagarnamn kan krävas per uppdrag. Självständigt skapande av nya jobb ingår inte i mobilflödet.

Appen startar i förarflödet. Administratörskonton får en förklaring och kan byta konto utan omdirigeringsloop. Lösenordsåterställning begärs i appen och slutförs med tjänstens befintliga webblänk; därefter loggar chauffören in med sitt nya lösenord.

`src/main-native.tsx` och `src/NativeApp.tsx` begränsar appen till chaufförsvyer, inloggning, lösenordshjälp och integritetspolicy. Administrations-, försäljnings-, registrerings-, demo- och fakturasidor ingår inte. Webbversionen behåller sina separata funktioner.

`npm run build:native` paketerar tillgångar i `dist-native`, som Capacitor använder lokalt utan en fjärrwebbplats som start-URL. Native-bygget innehåller inte jsPDF, xlsx, Sentry eller marknadsföringsspårning. Vites byggkontroll stoppar återinförande av de förbjudna webbmodulerna.

| Inställning | Värde |
|---|---|
| Appnamn | Aurora Transport |
| Bundle ID / application ID | se.auroramedia.auroratransport |
| Version / byggnummer | 1.0.0 / 3 |
| Android | min SDK 24, target SDK 36 |
| iOS | minimum 15.0 |
| Byggverktyg | Node 22+, Xcode 26+, Java 21 och Android SDK 36 |

`ios/` och `android/` är incheckade i releasegrenen. Genererade webbtillgångar, lokala byggkataloger och privata konfigurationsfiler är ignorerade.

## Bygga och verifiera från releasegrenen

Välj releasegrenen i en ren checkout. Kör från repots rot:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run test:driver-db
npx --no-install playwright install chromium
npm run test:mobile
npm run build
npm run native:prepare
```

`npm run build` kontrollerar webbversionen. `native:prepare` bygger chaufförsappen, kör plattformspatcharna och synkar Capacitor för båda plattformarna. För en enda plattform:

```sh
npm run build:native
node scripts/native-prepare.mjs ios
# Eller: node scripts/native-prepare.mjs android
```

Build 3 är redan byggd och uppladdad till Apple. Återanvänd inte numret för ett ändrat bygge. Kontrollera båda butikernas senaste nummer innan körning; nästa nummer är 4 om inget senare bygge har skapats:

```sh
BUILD_NUMBER=4 node scripts/native-version.mjs
```

Versionsskriptet använder `package.json` för versionsnamnet och uppdaterar båda plattformarnas byggnummer. Ändra därför inte versioneringen separat i endast ett native-projekt.

Vid ändrad appikon eller splash-resurs genereras plattformstillgångarna med:

```sh
npx --no-install capacitor-assets generate --ios --android
```

Granska genererade bilder och diffen innan de används i ett nytt distributionsbygge.

### Android-signering och AAB

Återanvänd den befintliga upload key som skapades för build 2. Tillför signeringsuppgifterna genom en säker lokal miljö eller CI:s hemlighetshantering:

- `CM_KEYSTORE_PATH`
- `CM_KEYSTORE_PASSWORD`
- `CM_KEY_ALIAS`
- `CM_KEY_PASSWORD`

Android behöver också `android/app/google-services.json`. Filen är gitignored. Den kan tillföras av `scripts/android-post-add.mjs` genom den base64-kodade CI-variabeln `GOOGLE_SERVICES_JSON`. Detta är Android-appens Firebase-konfiguration, inte backendens privata FCM-tjänstekonto.

När konfigurering, native-synk och versionering är klara:

```sh
cd android
./gradlew bundleRelease assembleRelease
```

AAB finns under `android/app/build/outputs/bundle/release/` och APK under `android/app/build/outputs/apk/release/`. Releaseuppgifterna avbryts om signeringsvariabler eller Firebase-filen saknas. `./gradlew assembleDebug` kan användas för lokal utveckling utan distributionssignering.

### iOS och Codemagic

Apple App ID med Push Notifications och distributionssignering har redan använts framgångsrikt för build 2. Vid lokal arkivering öppnas `ios/App/App.xcodeproj` i Xcode, schemat `App` väljs och arkivet exporteras för App Store Connect med rätt team och distributionsprofil.

[codemagic.yaml](../codemagic.yaml) innehåller två workflows:

| Workflow | Funktion och nödvändig konfigurering |
|---|---|
| `ios-release` | Förbereder native-koden, ikoner och versionsnummer, använder App Store-signering och bygger IPA. Publiceringen begär TestFlight. Kräver App Store Connect-uppgifterna `APP_STORE_CONNECT_PRIVATE_KEY`, `APP_STORE_CONNECT_KEY_IDENTIFIER` och `APP_STORE_CONNECT_ISSUER_ID`. |
| `android-release` | Kräver signeringsidentiteten `aurora_keystore` och variabelgruppen `google_play`. Bygger signerad AAB och publicerar till Plays interna testspår. Kräver `GOOGLE_SERVICES_JSON` och `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`. |

Workflows använder `PROJECT_BUILD_NUMBER + 1`. Säkerställ att resultatet är högre än alla redan använda byggnummer; en ny CI-räknare får inte återanvända 1, 2 eller 3. CI:s butiksåtkomst och hemligheter behöver kopplas innan workflows kan användas. Konfigurationen innebär ingen automatisk offentlig publicering och det finns ingen verifierad genomförd CI-release.

Behåll keystore, privata nycklar, distributionsprofiler och granskningslösenord utanför Git och delade källkodsarkiv. Granskningskontots uppgifter ska endast lämnas i butikernas avsedda säkra granskningsfält.

## Genomförd verifiering och dess gränser

- Build 3 använder Capacitor Network för gemensam anslutningsstatus och återhämtning. Hemvyn skiljer ohämtade/pausade data från ett verkligt tomt resultat och behåller användbar cache offline. Inmatningsfält använder minst 16 px i mobilvyn för att undvika fokuszoom på iPhone.
- Dagens 32 riktade tester, full TypeScript-kontroll och riktad ESLint passerar. Native-bygget för build 3 är godkänt.
- Tidigare grundkontroller: 250 tester och 59 kontroller av de riktiga migrationerna i en separat PostgreSQL-testmiljö godkända. De kördes inte om i sin helhet för build 3. Databaskontrollerna täcker bland annat företagsisolering, behörigheter, statusbyten, kvittenser, idempotens och återförsök.
- Fyra mobiltester godkända med isolerade API-svar: appstart/lösenordshjälp; inloggning/navigering/utloggning; administratörsavvisning; jobbstart till leveransbevis och tidrapport. De verifierar även att fakturavyn inte exponeras i native-flödet.
- iOS build 3: arkivering, distributionssignering och App Store-export passerar. Riktig iPhone-inloggning visar Granskningschaufför, två väntande uppdrag, korrekt navigation och ingen felaktig Offline-indikering. Skärmbilden `outputs/app-store/iphone69/02-uppdrag.png` dokumenterar uppdragsvyn; endast inloggningsbilden är hittills verifierat uppladdad till Apple.
- Android build 3: AAB-signatur och APK:s v2-signatur verifierade. ZIP-alignment och samtliga fyra native-biblioteks 16 KB LOAD-alignment godkända. Release är inte debuggable och saknar reklam-ID- och bakgrundsplatsbehörighet.
- Produktionskontot har en chaufförsroll och ett isolerat syntetiskt företag. Det särskilda tidjobbet startades/slutfördes på 56,8 sekunder via det riktiga driver-sync-API:t. Ett leveransbevis skapades; återförsök gav ingen dubblett. Två andra uppdrag lämnades väntande och notifieringskön för testföretaget förblev tom. Inga verkliga kunduppgifter eller e-postutskick användes.

Leveransfiler för build 3 ligger i arbetsytans `outputs/`, utanför repot:

| Fil | Storlek | SHA-256 |
|---|---:|---|
| Aurora-Transport-1.0.0-build3.aab | 6 388 122 byte | `fb0e6e469608ceae67f09b454d7a466f76c4c7a386b32e5d205d8ef032b62eab` |
| Aurora-Transport-1.0.0-build3.apk | 6 793 504 byte | `7c5e91c226367f0e7e1fe51aaa5dc2540a08dc1ca10aff4592b46037f467c464` |
| Aurora-Transport-AppStore.ipa | 2 755 325 byte | `2ac585e7e11a6240ef1a78147cad331b0a1858e425ca4d828cf80bf642f6a474` |

De fyra tidigare mobilflödestesterna använder isolerade API-svar. Dagens produktionstest verifierar separat API→databas→chaufförens läsbehörighet för tidjobbet. iPhone-kontrollen verifierar inloggning och uppdragsvisning. Kamera, signatur, GPS, push och hela arbetsflödet via telefonens knappar är ännu inte färdigverifierade.

## Integritet och kryptering

Appen behandlar kontouppgifter/användar-ID, jobbstatus och tider, leveransfoton, mottagarnamn/signatur, anteckningar, position under aktiva uppdrag och pushidentifierare för appfunktion och kontohantering. Uppgifterna är kopplade till användarkontot och ska inte beskrivas som anonyma. Position och notiser kräver behörighet; grundflödet kan användas utan dessa. Foto och signatur kan krävas av ett enskilt uppdrag.

Androids Firebase Messaging inkluderar Firebase Installations-ID. Nuvarande konfiguration stänger inte av automatisk initiering, så Googles kategori Device or other IDs får inte utelämnas enbart för att användaren nekar notiser. Frånvaro av Analytics betyder inte att inga data samlas in. Native-koden innehåller ingen marknadsföringsspårning. Googles återstående Data safety-svar behöver motsvara hela produktionskedjan, inklusive leverantörsbehandling, lagring och radering.

Appen skapar inga nya konton; företagsadministratören tillhandahåller chaufförskontot. Policyn lovar EU/EES och radering inom 30 dagar, men dagens metadata bekräftar varken region eller komplett raderingsrutin. Administratörens inaktivering ändrar endast tillgänglighet; produktionsdatabasens schemalagda jobb rensar inte konton. En eventuell manuell rutin måste beläggas. Apples nio datatyper är publicerade; Googles Data safety återstår. Se det separata integritetsunderlaget för leverantörsflöden och kvarvarande ägarfakta.

Krypteringsgranskningen för build 2 fann endast OS-, WebCrypto- och CommonCrypto-funktioner. Native-bundlen innehåller inte jsPDF:s RC4/MD5-kod. Apples deklaration för build 2 är sparad utifrån detta. Build 1 innehöll äldre webbberoenden och ska inte användas som underlag för build 2. Gör en ny kontroll om native-beroenden eller appfunktioner ändras.

## Butikstexter — svenska

**Namn:** Aurora Transport

**Undertitel (Apple):** Uppdrag och tid för chaufförer

**Kort beskrivning (Google):** Dina körningar, tider och leveransbevis – samlat för arbetsdagen.

**Beskrivning:**

Aurora Transport är chaufförsappen för företag som använder Aurora Transport.

Logga in med kontot från din trafikledare och samla arbetsdagen i mobilen:

- Se dina tilldelade uppdrag och instruktioner.
- Öppna hämtnings- och leveransadresser.
- Registrera när körningen startar.
- Lämna leveransbevis med foto, mottagaruppgifter och signatur när uppdraget kräver det.
- Följ slutförda jobb och registrerad tid.
- Kontakta kontoret från appen.

Ett chaufförskonto hos ett anslutet företag krävs. Kontakta företagets administratör om du behöver en inbjudan. Vilka uppgifter och funktioner som visas beror på företagets inställningar.

**Support:** [auroratransport.se/kontakt](https://auroratransport.se/kontakt)

**Integritet:** [auroratransport.se/privacy](https://auroratransport.se/privacy)

**Nyckelord:** chaufför,transport,körorder,uppdrag,tidrapport,leverans,åkeri

**Granskningsanteckning:**

Aurora Transport is a companion app for drivers at transport companies. Company administrators manage subscriptions and assignments on the website. There are no purchases or account creation in the mobile app. A dedicated review driver account with an isolated company and three synthetic assignments has been prepared. Enter its credentials in the store’s secure review fields. Log in, open an assigned job, start the trip, and complete it with delivery evidence. Denying notifications or location does not prevent the basic job workflow. Please use only the synthetic review assignments.

## Referenser

- [Apples datadeklarationer](https://developer.apple.com/app-store/app-privacy-details/)
- [Apples krypteringsdokumentation](https://developer.apple.com/help/app-store-connect/reference/app-information/export-compliance-documentation-for-encryption)
- [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Firebase-data i Android](https://firebase.google.com/docs/android/play-data-disclosure)
