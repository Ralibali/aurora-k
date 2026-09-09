# Fortnox och Google Maps

## Fortnox

Inställningar → Anslutningar startar Fortnox OAuth. Kontot måste vara företagsadministratör i Aurora. Företagets `companies.org_nr` ska vara korrekt; fakturainställningarnas separata organisationsnummer ersätter inte detta. Inga bolagsnummer ska gissas eller ersättas med testdata i produktion.

Registrera Aurora-appen i Fortnox Developer Portal med behörigheterna `companyinformation customer invoice`. Kontrollera med Fortnox att företagets abonnemang tillåter integrationen. Ingen prenumeration köps av applikationen.

Ange exakt denna redirect URI för produktionsappen:

```
https://auroratransport.se/integrations/fortnox/callback
```

Spara `FORTNOX_CLIENT_ID` och `FORTNOX_CLIENT_SECRET` som backend-hemligheter i Lovable Cloud. De får aldrig ha `VITE_`-prefix. `FORTNOX_REDIRECT_URI` är valfri men måste, om den sätts, matcha ovanstående URI (eller `SITE_URL` med samma sökväg). Google- och Resend-nycklar är inte Fortnox-uppgifter.

Publicera Edge-funktionen `fortnox` och applicera endast migrationen `20260908153113_fortnox_connection_workflow.sql`. Äldre historiska migrationer får inte spelas om för att deras versionsrader saknas.

Administratören väljer **Anslut Fortnox**, loggar in hos Fortnox och bekräftar sedan kopplingen i Aurora. Slumpmässig state lagras hashad, gäller i tio minuter och kan användas en gång. Samma användare, företag, organisationsnummer och webbläsarsession måste fullfölja. OAuth-koden tas bort ur adressfältet innan externa skript laddas. Företagsnumret verifieras mot Fortnox innan token lagras krypterad i Vault.

**Kontrollera anslutning** läser bolagsuppgifterna och förnyar token vid behov. Samtidiga anrop serialiseras per företag. **Koppla från** återkallar refresh-token hos Fortnox och tar bort lokala nycklar. Exporthistorik behålls.

## Fakturautkast

I Fakturor väljer administratören **Fortnox** på ett utkast, anger ett befintligt Fortnox-kundnummer, kontrollerar kunden och bekräftar exporten. Kundregister skapas inte automatiskt. Exporten stöder SEK, svenska kunder och vanlig svensk moms (0/6/12/25 %). Utland, omvänd moms, kreditfakturor och äldre underlag utan sparade rader hanteras separat i Fortnox. Konto-/bokföringsstandarder hämtas från företagets Fortnox-inställningar, inga kontonummer gissas.

Endast sparade rader och kontrollerade totalsummor exporteras. Ingen bokföring, kundkommunikation, betalning eller automatisk ändring av Auroras fakturastatus görs. Granska alltid utkastet i Fortnox, särskilt företagets avrundnings- och standardinställningar.

En unik exportpost sparas före POST. Fortnox-referensen är `aurora-<invoice UUID>`. Återkommande anrop returnerar det befintliga fakturanumret. Vid avbrutet anrop eller serverfel används **Kontrollera tidigare export**. En osäker export skickas aldrig igen automatiskt. Support får återställa en sådan post först efter verifiering i rätt Fortnox-bolag. Tydligt avvisade anrop (exempelvis valideringsfel) kan försökas igen när underlaget rättats.

## Google Maps

Google-inloggning behövs inte för kartor eller navigeringslänkar. Befintliga Maps-länkar fungerar utan API-nyckel. Kartan använder OpenStreetMap när Google Maps inte är konfigurerat.

För adressökning och vägberäkning behövs ett Google Cloud-projekt med Maps JavaScript API, Places API (New) och Routes API aktiverade och tillämplig fakturering. Använd en separat **webbläsarnyckel**, begränsad till dessa API:er och till `https://auroratransport.se/*`. Lägg endast till exakta preview- eller utvecklingsvärdar om de faktiskt behövs. Sätt kvoter och budgetaviseringar i det valda projektet.

Aurora förvaltar Google-konfigurationen centralt; kundföretag och chaufförer behöver inget eget Google-konto eller egna nycklar. Spara webbläsarnyckeln som `GOOGLE_MAPS_BROWSER_KEY` i projektets Lovable Cloud Secrets och publicera Edge-funktionen `maps-config` samt webbappen. Funktionen verifierar användarens JWT och kräver en företagsanknuten administratörsroll i `user_roles` genom anroparens RLS-klient. Endast den avsedda Google-webbläsarnyckeln returneras, med `Cache-Control: no-store`. Frontend hämtar konfigurationen vid användning och återställer den vid utloggning eller kontobyte.

`VITE_GOOGLE_MAPS_API_KEY` stöds fortfarande för en separat, faktiskt konfigurerad byggmiljö. Projektets Cloud Secrets injiceras inte i Lovables frontendbygge; Lovables workspace Build Secrets kräver Enterprise. Att lägga till en Cloud Secret med `VITE_`-prefix räcker därför inte. Nyckeln ska inte skrivas i GitHub-repot. En Lovable gateway-nyckel kan inte användas i Maps JavaScript SDK. Fortnox och andra serverhemligheter får aldrig lämnas ut till webbläsaren.

På nya uppdrag öppnar **Sök adress med Google Maps** Googles aktuella Places-widget. Den vanliga adressinmatningen fungerar också om Google inte svarar. Inga platskoordinater eller hela Place-svar sparas från adressökningen.

I ruttplaneringen beräknar **Beräkna körväg** en riktig körväg genom hämtnings- och leveransadresserna i vald ordning (högst 27 adresser). Köravstånd och uppskattad körtid visas med Google Maps. Hämtning ligger alltid före leverans inom uppdraget. Körtiden omfattar inte stopptider eller aktuell trafik. Google DRIVING är inte lastbilsspecifik vägledning för höjd, vikt eller farligt gods. Streckade linjer utan en beräkning är endast en illustration av ordningen.

## Verifierad Google-status 2026-09-09

Runtime-kopplingen publicerades i commit `a2c3254b41c05c1f33c0ad95784dc2598d3e68f4`. Produktionsfilen `assets/index-DFdx5ztI.js` innehöll `maps-config`-anropet. Anrop utan inloggning nekades med HTTP 401; Lovables kontroll med en normalt utfärdad administratörssession fick en konfigurerad nyckel. Detta bevisar konfigurationsleveransen, inte en fungerande Google-karta.

Google blockerade kartan med `ApiTargetBlockedMapError` och Places/Routes med nekade API-anrop. Ägaren behöver i Google Cloud → Credentials → webbläsarnyckeln → API restrictions tillåta Maps JavaScript API, Places API (New) och Routes API. Om ett API inte kan väljas, aktivera det först i API Library. Behåll webbplatsbegränsningen. En fungerande renderad karta, adressökning och körväg måste verifieras efter ändringen; de är ännu inte godkända som fungerande.

Den lokala kontrollen körde 18 godkända tester: 5 för runtime-konfiguration, 5 för endpointens behörighetsgränser, 4 för ruttberäkning och 4 för kartkomponenter. Produktionsbygget passerade. Testerna använder isolerade tjänstesvar och bevisar inte Googles kontoinställningar.

Källor: [Lovable Build Secrets](https://docs.lovable.dev/features/build-secrets), [Google Maps-fel](https://developers.google.com/maps/documentation/javascript/error-messages).

## Kontroller

`npm test`, `npm run test:db`, `npm run typecheck`, `npm run lint`, `npm run build` och `npm run test:dispatch` verifierar validering, behörighetsgränser, Vault-läsning, dubbelanrop, avbrott, webbläsarens OAuth-retur och bekräftad utkastexport med isolerade tjänstesvar. Dessa kontroller bevisar inte att riktiga leverantörskonton är aktiverade.

Efter kontogodkännandet: använd först **Kontrollera anslutning**, testa adressökning och vägberäkning i det riktiga Google-projektet, och granska ett uttryckligen godkänt fakturautkast i Fortnox. Ingen riktig faktura eller e-post skapas som automatisk installationstest.

Källor: [Fortnox OAuth](https://www.fortnox.se/developer/authorization), [Fortnox API](https://apps.fortnox.se/apidocs), [Google Places-widget](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new), [Google Routes](https://developers.google.com/maps/documentation/javascript/routes/get-a-route).
