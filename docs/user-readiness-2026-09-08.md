# Användbarhet och kontoflöden – 8 september 2026

## Ändringar

- Mobilmenyn delar nu funktionsregister med datorvyn. Sökning, fakturaunderlag, godkännanden, bokningsförfrågningar och återkommande uppdrag är åtkomliga i mobilen. Menyn använder en tillgänglig dialog med fokuslås, Escape och återgång till menyknappen.
- Direktlänkar till uppdrag bevaras genom inloggning. Destinationen valideras mot kontots roll och interna appområden; externa adresser och auth-loopar accepteras inte. Plattformsadmin utan företagsroll dirigeras rätt.
- Inloggningsformuläret går att använda igen efter nätverksfel. Lösenordshanterare får korrekta autocomplete-fält.
- React Query-cachen rensas vid kontobyte och utloggning, även vid utloggning från en annan flik. Vanlig tokenförnyelse behåller cachen.
- Fel vid städning av native push stoppar inte utloggning. Låsta abonnemangsvyer erbjuder utloggning och supportkontakt.
- Startsidan får huvudknappar med minst 52 px höjd, radbrytning och permanent sidfot. Produktillustrationens knapp öppnar demon.
- Förarvyn följer ljust/mörkt tema och tar hänsyn till telefonens säkra ytor. Startadressen dirigerar till uppdragslistan så att rätt navigationsflik markeras.
- Marknadsföringspopuper visas inte under inloggning, registrering, inbjudningar, lösenordsåterställning, kundbokning eller integrationsreturer.

## Verifiering

`npm run validate` passerar: typkontroll, lint, **234 unit-/komponenttester**, **67 PostgreSQL-kontroller** och produktionsbygge med 36 statiska sidor. 21 av testerna är nya regressionstester för denna ändring.

CI kör även den isolerade webbläsarsviten för dispatch och integrationer. Två nya fall kontrollerar mobilmenyns sökning/fokus och startsidans knappstorlek/horisontella layout. Fixturetesterna använder en fiktiv Supabase-endpoint och skickar inga riktiga kundmeddelanden. Resultaten måste läsas från CI; en konfigurerad testkörning är inte i sig en godkänd testkörning.

## Driftkontroll och gränser

Produktion har kontrollerats via Lovables databasanslutning. De nya RPC-funktionerna för registrering, förarsynk, Fortnox och notiskö finns. Samtliga publika tabeller har RLS aktiverat. Schemaläggarna för notiskön (varje minut) och rensning av rate-limit-poster är aktiva. Detta verifierar närvaro och konfiguration, inte hela leveranskedjan.

Denna ändring kräver inga nya databasmigrationer eller Edge Functions. Frontendpublicering är ett separat steg från uppdatering av GitHub. Betalning, verklig e-postleverans, Fortnox OAuth, GPS på fysisk telefon och riktig kund-/förarinloggning måste fortsatt verifieras med behöriga testkonton. Se även `launch-readiness-2026-09-08.md` och `fortnox-google-setup.md` för integrationskrav; tidigare blockerade DNS-/webhooksteg ska inte räknas som klara utan nya bevis.

Driftkontrollen fann även 13 äldre uppdrag utan `company_id` (5 planerade, 1 pågående, 7 slutförda). Deras kundposter saknar också företag, och någon entydig företagskoppling gick inte att verifiera. En äldre förarroll saknar företagskoppling på en profil som nu är admin. Dessa poster har inte flyttats eller raderats; korrekt ägarskap måste fastställas innan de återförs till en kunds vy. Inga utgående mejlhändelser under senaste veckan, inkommande ordermejl eller Fortnox-anslutningar fanns i de kontrollerade tabellerna, så verklig leverans/integrationsfunktion är ännu inte bevisad. Schemaläggaren hade 60 lyckade körningar senaste timmen, vilket endast bekräftar schemaläggningen.
