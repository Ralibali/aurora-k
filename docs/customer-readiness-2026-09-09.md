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

Rättningen låter upprepad registrering skicka en ny bekräftelse för ett obekräftat konto, med samma skydd som den befintliga resend-funktionen. Ursprungligt lösenord och företagsmetadata ersätts inte. Bekräftade adresser får samma generella svar utan nytt utskick. Samtidiga registreringsförsök hanteras genom en ny uppslagning. Riktade regressionstester: 17 passerade.

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
