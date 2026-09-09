# Kundberedskap, 9 september 2026

## Verifierat

- PR27 och PR28 är mergade. PR28:s fem GitHub-arbetsflöden passerade.
- Resend är anslutet via Lovables connector-gateway. Avsändardomänens SPF och DKIM är verifierade; DMARC finns i DNS.
- Resends testmottagare rapporterade levererade utskick, inklusive registreringens bekräftelsemejl. Detta bevisar inte leverans till en verklig kunds inkorg.
- Webhook för `email.received` finns och är aktiv mot `resend-inbound-order`.
- Databas och Auth återhämtade sig efter en driftstörning. Lovables efterföljande webbläsartest av publik demo nådde `/admin`. Orsaken till ett separat tidigare försök som fastnade på ”Loggar in…” är inte säkert fastställd.
- Publika sidan visar PR27:s demoknapp och sidfotsnavigation. PR28:s nya prislänkar är ännu inte kontrollerade oberoende i produktion.
- Stripe har aktiva live-priser: 449 SEK/månad och 3 500 SEK uppstart. Ingen betalning genomfördes. Månadsprisets `tax_behavior` är `unspecified`, uppstartens `exclusive`; effektiv moms behöver kontrolleras tillsammans med Checkout/Stripe Tax-inställningarna.

## Registrering

Ett manuellt registreringsförsök nådde backend och visade bekräftelsesidan men skapade ingen ny användare. Diagnosen pekar på en redan befintlig obekräftad adress; inga frekvensbegränsningar eller felsteg loggades.

Rättningen låter upprepad registrering skicka en ny bekräftelse för ett obekräftat konto, med samma skydd som den befintliga resend-funktionen. Ursprungligt lösenord och företagsmetadata ersätts inte. Bekräftade adresser får samma generella svar utan nytt utskick. Samtidiga registreringsförsök hanteras genom en ny uppslagning. Riktade regressionstester: 17 passerade. Alla fem GitHub-kontroller för PR29 passerade. PR29 mergades som `1978f0c293fafc8345630f803097dfe1c9211fa1` och `auth-email` publicerades från den versionen.

## Verifiering efter publicering av PR29

- Första och upprepade registreringen via den publika `auth-email`-funktionen svarade HTTP 200. Båda bekräftelsemejlen rapporterades levererade till Resends testmottagare: `cf9e1fa5-a720-4098-a8b4-aae65106166e` och `d4d67e19-8ac4-44e4-844e-a410ce8ffa63`.
- Databasen innehöll exakt ett obekräftat QA-konto. Ursprungligt företagsnamn och namn behölls; inga lösenords-, återställnings- eller inloggningsfält ändrades enligt kontrollen.
- Lovables domänstatus: `auroratransport.se` är aktiv huvuddomän; `www.auroratransport.se` är aktiv och omdirigerar till huvuddomänen. Båda har A-post `185.158.133.1`.
- Resends avsändning är aktiv med verifierad SPF/DKIM. Mottagningsposten är fortfarande felande eftersom root-MX saknas. Simplys webbläsaranslutning och säker överlämning misslyckades; ingen DNS-ändring gjordes.
- Det isolerade obekräftade QA-kontot från detta test finns kvar: radering via administrativt API var blockerad. Inga alternativa inloggningsuppgifter eller behörighetsvägar användes för att kringgå spärren.

## Kvar före fullständig kundverifiering

- Root-MX saknas vid ny DNS-kontroll. Planerad post: `@ MX 10 inbound-smtp.eu-west-1.amazonaws.com`. Kontrollera befintlig e-postanvändning hos Simply innan posten läggs till. Behåll övrig DNS.
- Inkommande ordermejl ska förbli avstängt tills MX, Resends mottagningsstatus och hela webhookflödet är verifierade.
- Bekräftelselänk i verklig inkorg, fortsatt företagsregistrering och efterföljande inloggning är inte verifierade hela vägen.
- Ett isolerat administratörs-/förarflöde från skapad transport till avslutat uppdrag är ännu inte genomfört. Databas- och webbläsarregressionstester ersätter inte detta.
- Stripe-sandbox saknas i tillgänglig konfiguration; gör inte testköp med live-priser.
- Fortnox saknar anslutning och behöver kundens riktiga OAuth-flöde.

## Behörigheter och testdata

`user_roles` är den auktoritativa rollkällan. Ändring av visningsfältet `profiles.role` är i sig inte visad privilegieeskalering. Inga behörighetsspärrar ska kringgås för att bekräfta testkonton.

QA-profiler rapporterades som noll efter städning. Det är inte liktydigt med att alla QA-poster i `auth.users` är borttagna; kvarvarande autentiseringskonton måste identifieras säkert innan städning.

## Inkommande orderinkorg – verifiering 2026-09-09

- Root-MX för `auroratransport.se` finns nu i publik DNS (prioritet 10, `inbound-smtp.eu-west-1.amazonaws.com`).
- Domänen är omkontrollerad hos e-postleverantören: DKIM, SPF och mottagnings-MX är verifierade; både sändning och mottagning är aktiverade.
- Osignerat anrop mot mottagningsfunktionen avvisas med HTTP 401.
- Ett internt märkt testmejl skickades från den verifierade avsändaren till en isolerad QA-kanal och fick status `delivered`.
- Den signerade webhooken behandlade mejlet och skapade exakt en rad i `inbound_order_emails`, bunden enbart till QA-företaget, status `ready` med tolkningssäkerhet 100 och utan felmeddelande.
- Känd tolkningsbrist: telefonnummer utan angivet organisationsnummer kopieras felaktigt till fältet för organisationsnummer.
- `ORDER_INBOX_ENABLED` är satt till `true` och `order-inbox-api` är omdistribuerad.
- QA-fixturerna (testföretag, kanal och inkommande rad) togs bort efter verifieringen.
