# Aurora Transport — mobilrelease 1.0.0

Uppdaterat 13 september 2026 efter den verifierade interna releasen kl. 22.45 svensk tid.

**Build 4 är signerad för båda plattformarna och ACTIVE i Google Plays interna testspår, release 2. Apple visar Complete/Ready to Submit för build 4 efter sparad krypteringsdeklaration; build 4 är valt och sparat på versionen, verifierat efter återbesök. Ingen offentlig lansering eller slutlig butiksgranskning har skickats in.**

## Distribution och återstående steg

| Del | Verifierad status |
|---|---|
| Google Play | Version 1.0.0 (4) är aktiv i internt test från 13 september kl. 22.45. Samma separata testlista innehåller endast ägarens bekräftade konto. Appen är inte granskad eller offentlig. |
| App Store | Build 4 är uppladdad kl. 22.38.10.851, färdigbehandlad och visar Complete/Ready to Submit. Krypteringssvaret None är sparat och build 4 är valt/sparat på versionen. Två iPhone-bilder, en iPad-bild, nio integritetsdatatyper och den privata granskningskontakten är sparade. Content Rights och granskningsinloggning återstår. |
| Firebase och push | Android-konfiguration finns för aurora-transport-f71c5, Spark utan Analytics. FCM HTTP v1 är aktiverat. Privata FCM-/APNs-uppgifter och faktisk pushleverans är inte färdigverifierade. |
| Granskningskonto | Separat syntetiskt företag med en chaufför, ett slutfört och två väntande testuppdrag. Ett avgränsat produktionsflöde är verifierat via API. Inloggningsuppgifterna har inte lämnats till butikernas granskning. |
| Källa | Separat [releasegren](https://github.com/Ralibali/aurora-k/tree/codex/driver-mobile-release). Build 4-källan finns på releasegrenen. Exakt commit, träd och källarkiv redovisas i leveransens separata verifieringsmanifest. Serverändringen för seed-users är separat publicerad på main. Ingen mobilgren har slagits ihop med main. |

[Intern testlänk](https://play.google.com/apps/internaltest/4700850323167782555) gäller den tillagda testaren. Google visar varningar om saknade native-symboler och deobfuskeringsfil. R8/minifiering används inte, så någon R8-mappningsfil finns inte. Varningarna hindrade inte den interna releasen; native-symboler är fortfarande inte uppladdade.

Före offentlig release återstår Apples Content Rights, granskningsåtkomst, EU DSA/trader-uppgifter, återstående Google-formulär och Data safety samt fysisk enhetstestning och faktisk pushverifiering. Manuell Apple-publicering efter granskning är vald. Ready to Submit är inte ett godkännande av App Review.

## Implementerat chaufförsflöde

Chauffören loggar in med företagets konto, ser tilldelade uppdrag, startar körningar, lämnar leveransbevis och följer tidrapporter. Foto, signatur och mottagarnamn kan krävas per uppdrag. Nya konton och självständigt skapande av jobb ingår inte. Lösenordshjälp begärs i appen och slutförs via tjänstens webblänk.

Separata src/main-native.tsx och src/NativeApp.tsx paketerar chaufförsvyer, inloggning, lösenordshjälp, integritets- och innehållspolicy lokalt i dist-native. Administrations-, försäljnings-, demo-, registrerings- och fakturasidor är uteslutna. Webbversionen behåller sina funktioner. Byggkontrollen utesluter jsPDF, xlsx, Sentry och administrativa webbmoduler.

Build 4 kräver ett aktivt godkännande av innehållsregler innan chaufförsvyer eller uppladdningar kan användas, även via direktlänk. Rutan är från början omarkerad. Godkännandet lagras lokalt per konto och policyversion; lagringsfel ger ingen tyst passage och utloggning är tillgänglig. Reglerna kan läsas igen via Profil eller /content-policy. Detta skapar ingen ny serverlogg och är inget generellt databehandlingssamtycke.

Olämpligt innehåll och användarbeteende kan rapporteras på åtkomliga uppdrag, även avslutade/avbokade, och från Profil utan uppdrag. Profilrapporten skickas till Aurora Transports support och kan läsas av företagets administratörer. Gränssnittet utlovar ingen särskild svarstid.

Gemensam anslutningsstatus via Capacitor Network styr Query, offlineindikering och kö. Initiering och återgång till appen hämtar native-status, med webbreserv. Hemvyn skiljer ohämtade/pausade data från tomma resultat och visar användbar cache vid avbrott. Inmatningsfält använder minst 16 px för att undvika iPhones fokuszoom.

| Inställning | Värde |
|---|---|
| Appnamn | Aurora Transport |
| Bundle ID / application ID | se.auroramedia.auroratransport |
| Version / byggnummer | 1.0.0 / 4 |
| Android | min SDK 24, target SDK 36 |
| iOS | minimum 15.0 |
| Byggverktyg | Node 22+, Xcode 26+, Java 21 och Android SDK 36 |

## Bygga från releasegrenen

Kontrollera att checkouten innehåller den avsedda build 4-källan. Kör från repots rot:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run test:db
npx --no-install playwright install chromium
npm run test:mobile
npm run build
npm run native:prepare
```

npm run build kontrollerar webben. native:prepare bygger chaufförsappen, kör plattformspatchar och synkar Capacitor. För en plattform används npm run build:native följt av node scripts/native-prepare.mjs ios eller android.

Byggnummer 4 är redan använt i båda butikerna. Kontrollera högsta aktuella nummer före nästa ändrade bygge; använd därefter ett högre nummer för båda plattformarna, exempelvis:

```sh
BUILD_NUMBER=5 node scripts/native-version.mjs
```

Skriptet hämtar versionsnamnet från package.json och uppdaterar båda native-projekten. Vid ändrade bilder kan npx --no-install capacitor-assets generate --ios --android användas; granska resultat och diff före distribution.

### Android

Återanvänd den befintliga upload key. Tillför CM_KEYSTORE_PATH, CM_KEYSTORE_PASSWORD, CM_KEY_ALIAS och CM_KEY_PASSWORD via säker lokal miljö eller CI. Android behöver även gitignored android/app/google-services.json. scripts/android-post-add.mjs kan tillföra den från den base64-kodade CI-variabeln GOOGLE_SERVICES_JSON. Detta är appkonfiguration och är separat från backendens privata FCM-tjänstekonto.

Efter native-synk och versionering:

```sh
cd android
./gradlew bundleRelease assembleRelease
```

AAB finns i android/app/build/outputs/bundle/release/ och APK i android/app/build/outputs/apk/release/. Release avbryts om signering eller Firebase-konfiguration saknas. assembleDebug kräver inte distributionssignering.

### iOS och CI

Öppna ios/App/App.xcodeproj, välj schemat App, arkivera med rätt Apple-team och exportera för App Store Connect. Distributionssignering och push-entitlement är verifierade för build 4. Info.plist saknar ITSAppUsesNonExemptEncryption, så exportdeklarationen måste kontrolleras separat i App Store Connect för uppladdningen.

[codemagic.yaml](../codemagic.yaml) har ios-release för signerad IPA/TestFlight och android-release för signerad AAB/Plays interna testspår. iOS kräver APP_STORE_CONNECT_PRIVATE_KEY, APP_STORE_CONNECT_KEY_IDENTIFIER och APP_STORE_CONNECT_ISSUER_ID. Android kräver signeringsidentiteten aurora_keystore, variabelgruppen google_play, GOOGLE_SERVICES_JSON och GCLOUD_SERVICE_ACCOUNT_CREDENTIALS.

Workflows kör npm ci, typecheck, enhetstester och test:driver-db före native-förberedelse. Den bredare lokala kontrollen test:db ovan ska också köras inför release. CI använder PROJECT_BUILD_NUMBER + 1; resultatet måste överstiga alla använda byggnummer, nu minst 4. CI:s åtkomst/hemligheter måste kopplas säkert. Ingen genomförd CI-release är verifierad och workflows innebär ingen offentlig publicering.

Privata nycklar, keystore, lösenord, distributionsprofiler, lokala miljöfiler och granskningsuppgifter hör inte hemma i Git eller delade källkodsarkiv.

## Verifiering och serverstatus

- Den slutliga enhetstestsvepningen passerar 357 tester i 55 filer, inklusive build 4 och de senare serverrättningarna. Full TypeScript-kontroll, lint, native-förberedelse och webbbygge passerar. Fem mobilflödestester med isolerade API-svar passerar, inklusive aktivt policygodkännande, spärrad direktlänk och sparat godkännande efter omladdning.
- Pushregistreringens 11 isolerade PostgreSQL/RLS-kontroller, tokenpolicyns 16 kontroller och supportrapporteringens 11 kontroller passerar. De verifierar bland annat konto-/företagsisolering, atomisk tokenöverföring och idempotens utan verkliga mottagartokens eller utskick.
- Profilskyddets 16 isolerade PostgreSQL/RLS-kontroller och 59 lanseringskontroller med skyddet passerar. Skyddet är applicerat i produktion: triggern är aktiv, funktionen är SECURITY INVOKER med tom search_path och både anon och authenticated saknar direkt EXECUTE. Inga verkliga kundrader ändrades vid kontrollen.
- seed-users avstängningssvar har sju fokuserade tester och godkänd avgränsad lint; testerna ingår nu i den slutliga totalsiffran 357.
- Android build 4: AAB-signatur, APK:s v2-signatur, ZIP-alignment och samtliga fyra native-biblioteks 16 KB LOAD-alignment passerar. Rätt paket, version 1.0.0/build 4, min SDK 24 och target SDK 36 är verifierade. Release är inte debuggable och saknar reklam-ID- och bakgrundsplatsbehörighet.
- iOS build 4: arkivering, distributionssignering, App Store-export och uppladdning passerar. Bundle ID och team stämmer, get-task-allow är false och aps-environment är production. Apples uppladdningslogg kvitterar Upload succeeded den 13 september kl. 22.38.10.851 svensk tid. Därefter verifierades Complete/Ready to Submit, sparat krypteringssvar ”None of the algorithms mentioned above” och att build 4 är valt och sparat på versionen efter återbesök. App Review har inte skickats in.
- Native build 4 har byggts, installerats och startats i den avsedda iPhone 17 Pro Max-simulatorn. Den riktiga appens innehållsregler, omarkerade kryssruta och inaktiva fortsättknapp observerades. Klickkontrollen avbröts av CUA-felet NoWindowsAvailable, även efter Raise. Godkännande, navigering och hela arbetsflödet i denna installerade build 4 är därför ännu inte verifierade.
- För build 3 verifierades verklig inloggning och uppdragsvisning i native-appen i iPhone-simulatorn: Granskningschaufför, två väntande uppdrag och ingen felaktig Offline-indikering. Detta var inget fysiskt enhetstest.
- Separat produktions-API-test av det uttryckligen godkända syntetiska tidjobbet verifierade start/slut efter 56,8 sekunder, ett leveransbevis och återförsök utan dubblett. Ett jobb är slutfört, två förblev väntande och testföretagets notifieringskö var tom. Kamera, GPS och telefonens hela knappflöde verifierades inte av detta API-test.

Serverns egna-token-SELECT-policy och report_driver_support_ticket är applicerade och har verifierats med avgränsade, återställda produktionstester. Build 4 använder register_driver_push_token för atomisk överföring av en hemlig enhetstoken till aktuell behörig chaufför. Registrerings-RPC:n är applicerad i produktion. Första och upprepad registrering verifierades med granskningschauffören och aktiv RLS: en rad ägdes av aktuell chaufför, anon saknade EXECUTE och authenticated hade EXECUTE. Transaktionen rullades tillbaka och lämnade noll syntetiska rader. Klientens återförsök vid återanslutning/återgång och spärr mot återregistrering under utloggning ingår i build 4. Inga verkliga notiser har skickats vid dessa tester.

Profilskyddet i 20260913204221_protect_profile_authorization.sql är applicerat och verifierat aktivt i produktion. Det förhindrar att vanliga klienter ändrar profilens identitet, företag eller roll och lämnar befintliga RLS-policyer kvar.

seed-users har ersatts med ett statiskt avstängningssvar i tre källfiler. OPTIONS ger 204; övriga metoder ger 410 utan att läsa anropskropp, skapa konton eller anropa nätverk/databas. Källan är publicerad på main i commit eef9a23 och Lovable har synkat. Det senaste oautentiserade liveanropet gav fortfarande 401, vilket inte identifierar vilken handler som är driftsatt. **Driftsättningen är blockerad av att Lovable saknar krediter och är inte verifierad.** Den senare main-committen 42803261496cf67ff062efc3dacfe43734fd60bb tar även bort profilrollens osäkra reservväg i send-push och generate-recurring-assignments och lägger till profilskyddets migration/tester; SQL-skyddet är redan aktivt, men Edge-ändringarna måste fortfarande driftsättas. Lovables deployanrop stoppades uttryckligen med OUT OF CREDITS; inga krediter köptes. [Lovables dokumentation](https://docs.lovable.dev/features/edge-functions) beskriver driftsättning genom Lovable-agenten och visning/övervakning i Cloud.

Kamera, foto, signatur, GPS, push, nekade behörigheter, nätavbrott, återförsök och utloggning på avsedda fysiska enheter återstår. Ett lyckat automatiserat test eller distributionsbygge ersätter inte den kontrollen.

Leveransfilerna ligger i arbetsytans outputs, utanför repot:

| Fil | Storlek | SHA-256 |
|---|---:|---|
| Aurora-Transport-1.0.0-build4.aab | 6 392 846 byte | `f11ab263b1e2f3ed415ece2f90b489dca9659c20925734d1343f4ddece1d9ef3` |
| Aurora-Transport-1.0.0-build4.apk | 6 798 312 byte | `fbbfec2b161c2db6c7b9b37a33577b52a43343096618e10496bb6c4e6598536a` |
| Aurora-Transport-1.0.0-build4.ipa | 2 759 997 byte | `b462cce55e261df519d7c7918275748f02648c1573d03ab6b482a1a6b9c35ec8` |
| Aurora-Transport-AppStore.ipa | 2 759 997 byte | Samma signerade bytes som build4.ipa ovan. |

Apples åldersfråga Messaging and Chat är sparad som Yes eftersom förarkommentarer och administratörsmeddelanden ger direkt kommunikation i appen. UGC och Social Media kvarstår som No: tilldelat företagsmaterial saknar Apples beskrivna breda spridning/sociala flöde. Det är en bedömning mot Apples definition, inget uttryckligt företagsundantag. Beräknat betyg är 4+ (Brasilien 12+); detta är inte en barnmålgrupp. Googles bredare UGC-fråga är separat besvarad Yes. [Apples definitioner](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions)

## Integritet och öppna ägarbesked

Native-appen behandlar kontouppgifter, användar-/enhets-ID, jobbstatus och tider, leveransfoton, mottagarnamn/signatur, rapporter och position under aktiva uppdrag. Uppgifterna används för appfunktion och kontohantering och är kopplade till kontot. Inget nytt marknadsförings-/spårningsflöde har lagts till i build 4.

Androids Firebase Messaging inkluderar automatiskt Firebase Installations-ID även om användaren nekar notiser. Analytics är avstängt, BigQuery och annonseringskopplingar är inte anslutna och frivillig användning av Firebase Service Data utanför Firebase har stängts av. Detta gör inte appen fri från identifierarinsamling. Google Data safety och ansvarsfördelningen för hela tjänsten återstår att slutföra.

Databasen är verifierad i Irland. Region för filer/säkerhetskopior, ansvarig juridisk person och en fungerande fullständig raderingsprocess är ännu inte belagda. Administratörens inaktivering är ingen kontoradering. Den befintliga policyns generella löften om EU/EES och radering inom 30 dagar måste stämma med verklig drift.

Build 4:s exporterade IPA innehåller bara den granskade OS-/WebCrypto-/CommonCrypto-kryptografin. Alla 25 JavaScript-chunkar matchar det byggkontrollerade native-bygget, utan jsPDF/RC4/MD5 eller nya egna kryptobibliotek. Krypteringssvaret ”None of the algorithms mentioned above” är nu separat sparat för build 4 och bygget visar Ready to Submit.

Sju tidigare ställda ägarfrågor är fortfarande öppna. Därtill har en ny fråga om Lovable-krediter ställts eftersom Edge-driftsättningen är blockerad; inga köp har gjorts:

1. Tillstånd att lämna det isolerade granskningskontots inloggning i Apples och Googles privata granskningsfält. Kontot är färdigt; automatisk godkännandegranskning stoppade den nya överföringen av uppgifterna.
2. Googles funktions-/målgruppsklassning: inga myndighets-, hälso- eller finansfunktioner samt vuxna 18+. Automatisk godkännandegranskning stoppade sparandet av Government app: No.
3. Apples Content Rights: bekräftelse på rätten att visa företagens uppladdade uppdragsmaterial, foton och signaturer.
4. Tillstånd till CUA-anslutning för den officiella Android-emulatorn via qemu-system-aarch64. Automatisk godkännandegranskning stoppade anslutningen på grund av identifierarfrågan; checksumma och kodsignering är verifierade.
5. Offentlig postadress och tillstånd att publicera den föreslagna telefonen och e-posten för Apples EU DSA/trader-uppgifter. Den privata granskningskontakten är redan godkänd och sparad.
6. Tillstånd att skapa ett tjänstekonto med avgränsad FCM-sändningsbehörighet och en APNs-produktionsnyckel för appens topic samt lagra uppgifterna privat i Lovables backend. Automatisk godkännandegranskning stoppade skapandet av tjänstekontot. Inga sådana nycklar har skapats och frågan omfattar inga notiser till andra.
7. Ansvarig juridisk person och faktisk personuppgiftsansvarsfördelning samt verifierbar lagring/radering: region för filer och säkerhetskopior, lagringstider, hur konto, historik, leveransfiler och leverantörsdata raderas eller anonymiseras. Databasens region är redan verifierad som Irland; ett generellt löfte om EU/EES och radering inom 30 dagar är ännu inte belagt för hela kedjan.

## Butikstexter — svenska


**Namn:** Aurora Transport

**Undertitel, Apple:** Uppdrag och tid för chaufförer

**Kort beskrivning, Google:** Dina körningar, tider och leveransbevis samlade för arbetsdagen.

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

Aurora Transport is a companion app for drivers at transport companies. Company administrators manage subscriptions and assignments on the website. There are no purchases or account creation in the mobile app. A dedicated review driver account has an isolated company with one completed and two pending synthetic assignments. Credentials belong in the stores’ secure review fields. After login, read the content rules, actively select the unchecked acceptance box, and continue. Open a pending assignment, start the trip, and complete it with delivery evidence. Content and user reports are available in Profile and on accessible assignments. Denying notifications or location does not prevent the basic job workflow. Please use only the synthetic review assignments.


## Referenser

- [Apples datadeklarationer](https://developer.apple.com/app-store/app-privacy-details/)
- [Apples krypteringsdokumentation](https://developer.apple.com/help/app-store-connect/reference/app-information/export-compliance-documentation-for-encryption)
- [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Firebase-data i Android](https://firebase.google.com/docs/android/play-data-disclosure)
