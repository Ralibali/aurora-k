# Aurora Transport — mobilrelease 1.0.0

Datum: 2026-09-12. Status: byggbara och lokalt testade appprojekt; inte inskickade eller godkända i butikerna.

## Produkt och implementation

Chaufförer använder företagets inbjudna konto, ser sina tilldelade uppdrag, startar körningar, lämnar leveransbevis och följer tidrapporter. Skapande av helt egna jobb ingår inte i denna ändring; det är en separat produktfråga.

Appen startar i förarflödet. Administratörskonton får en förklaring och kan byta konto utan omdirigeringsloop. Appen visar inga registrerings-, köp- eller demosidor. Lösenordsåterställning begärs i appen och slutförs med tjänstens befintliga webblänk; därefter loggar chauffören in med sitt nya lösenord.

`npm run build:native` bygger lokalt paketerade tillgångar i `dist-native`. Appen använder inte en fjärrwebbplats som start-URL. Appdokumentet innehåller inga Google Analytics- eller Plausible-skript. Sentry och webbens marknadsföringskomponenter är avstängda i appytan. Webbbygget finns kvar separat.

Appidentifierare: `se.auroramedia.auroratransport`. Namn: Aurora Transport. Version: 1.0.0. Android min SDK 24, target SDK 36. iOS minimum 15.0. Node 22+, Xcode 26+, Java 21 för Android.

## Bygga och testa

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run test:driver-db
npm run test:mobile
npm run native:prepare
npx --no-install capacitor-assets generate --ios --android
BUILD_NUMBER=1 node scripts/native-version.mjs
```

Använd ett högre unikt BUILD_NUMBER vid varje uppladdning. Codemagic använder projektets gemensamma byggnummer; kontrollera att räknaren ligger över eventuella tidigare uppladdningar.

`ios/` och `android/` är incheckade. `native:prepare` synkar beroenden, tillgångar och behörigheter. Androids release-konfiguration använder CM_KEYSTORE_PATH, CM_KEYSTORE_PASSWORD, CM_KEY_ALIAS och CM_KEY_PASSWORD. Ett releasebygge stoppas om signering eller Firebase-konfiguration saknas. För test kan `cd android && ./gradlew assembleDebug` köras utan distributionssignering.

Codemagic-workflows förbereder TestFlight respektive Google Plays interna testspår, inte automatisk offentlig publicering. Firebase-filen tillförs som base64 i GOOGLE_SERVICES_JSON. App Store Connect-nyckeln och Google Play-tjänstekontot lagras i byggtjänstens hemligheter, aldrig i repot. Registrera rätt appidentifierare, skapa distributionsprofiler och koppla signering innan releasekörning.

## Verifierat lokalt

- TypeScript och ESLint utan fel.
- 250 tester godkända.
- 59 kontroller i en disponibel PostgreSQL-testmiljö: företagsisolering, behörigheter, atomiska statusbyten, kvittenser, idempotens och återförsök.
- Fyra mobiltester med isolerade API-svar: appstart/lösenordshjälp; inloggning/navigering/utloggning; administratörsavvisning; start och slutförande av jobb fram till tidrapport.
- Webbproduktion och separat appbyggnad godkända.
- iOS Debug kompilerar med Xcode, installeras och visar chaufförsinloggningen i iPhone 17 Pro-simulatorn.
- Android Debug APK kompilerar med Java 21 och SDK 36.

API-svaren i webbläsartesterna är testdata. Dessa resultat bevisar inte att produktionsservern eller pushnotiser fungerar på en fysisk telefon. Databastesterna kör de riktiga migrationerna i en isolerad miljö, inte i produktion.

## Kvar före butikslansering

1. Registrera appidentifieraren hos Apple med Push Notifications. Automatisk säkerhetsgranskning kräver användarens uttryckliga godkännande för denna kontoåtgärd.
2. Skapa butiksposterna. Formulären är förberedda men inte inskickade. Google kräver policy- och exportförsäkringar. Inga sådana intyg har lämnats.
3. Koppla distributionscertifikat/profil, Androids upload key, Firebase/FCM och backendens APNs-/FCM-uppgifter. Befintlig lokal Apple-identitet är för utveckling, inte en verifierad distributionsidentitet.
4. Kör signerade IPA/AAB-byggen och testa genom TestFlight och Google Plays interna testspår.
5. Använd ett isolerat granskningsföretag med ett chaufförskonto och exempeluppdrag utan verkliga kunduppgifter. Verifiera produktionsflödet med detta konto, inklusive foto, signatur, nätavbrott, återförsök, avvisade behörigheter, push och utloggning på fysiska enheter.
6. Bekräfta integritetsdeklarationer, målgrupp, åldersklassning, supportkontakt och EU-handlaruppgifter med kontoinnehavaren. Kontrollera raderingsrutinen för arbetsgivarskapade konton. Nuvarande integritetspolicy får inte ersätta faktisk kontroll av databehandling och lagring.
7. Ta butiksskärmbilder i Apples och Googles efterfrågade storlekar från de riktiga appbyggena och ett godkänt testkonto. Webbläsarskärmbilderna i leveransen är granskningsunderlag.

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

**Support:** https://auroratransport.se/kontakt

**Integritet:** https://auroratransport.se/privacy

**Nyckelord:** chaufför,transport,körorder,uppdrag,tidrapport,leverans,åkeri

**Granskningsanteckning (utkast):**
Aurora Transport is a companion app for invited drivers at transport companies. Company administrators manage subscriptions and assignments on the website. There are no purchases or account creation in the mobile app. Review credentials and a test assignment must be supplied separately. Log in, open the assigned job, start the trip, and complete it with delivery evidence. Denying notifications or location must not prevent the basic job workflow.

## Underlag för integritetsformulären

Bekräfta mot produktionskonfigurationen innan inlämning. Kontouppgifter/användar-ID, jobb- och tiduppgifter, leveransfoton, mottagarnamn/signatur, position under aktiva uppdrag och push-token kan behandlas för appfunktion och kontohantering. Kopplingen till användarkontot innebär att de inte ska deklareras som anonyma. Marknadsföringsspårning är avstängd i appbygget. Samtycke/behörigheter, lagringstider, personuppgiftsansvar och eventuell radering behöver stämma med företagets faktiska rutiner.

## Tekniska källor

- https://capacitorjs.com/docs/updating/8-0
- https://capacitorjs.com/docs/apis/geolocation
- https://capacitorjs.com/docs/ios/privacy-manifest
- https://docs.codemagic.io/yaml-code-signing/signing-android/
- https://developer.apple.com/app-store/review/guidelines/
- https://support.google.com/googleplay/android-developer/answer/11926878
