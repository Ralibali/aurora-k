
## Tillägg efter driftåterställning (samma dag)

### Databasåtkomst
Fungerar igen härifrån. Kontrollfråga mot databasen svarar normalt.
QA-profiler kvar: **0** (omräknat).

### Publik demo — inget appfel
Serversidan verifierad i två steg och sedan i riktig webbläsare mot live:
- `demo-login` svarar HTTP 200 på cirka 4,5 sekunder.
- Efterföljande lösenordsinloggning svarar HTTP 200 på cirka 0,6 sekunder med giltig session.
- Webbläsartest mot auroratransport.se: knappen "Utforska demon" leder till `/admin`
  inom cirka 5 sekunder. Inga fel i konsolen.

Ett förbehåll: vid första försöket blockerades klicket av en öppen dialogruta som
lägger sig över hela sidan. Efter att den stängdes fungerade knappen direkt.
Det förklarar sannolikt både "Loggar in..." som hänger och att inga
`demo-login`-anrop syns i loggen — anropet gick aldrig iväg. Kvarstående
hängning i er molnwebbläsare är därmed antingen den överliggande dialogrutan
eller nätverk hos er, inte serverfel.

### Stripe-priser (bekräftat mot verkliga objekt)
- Månadsabonnemang: `Aurora Transport månadsabonnemang`, 449,00 SEK per månad,
  återkommande, aktivt, live-läge.
- Uppstart: `Aurora Transport Setup`, 3 500,00 SEK engångs, aktivt, live-läge.
- Båda finns alltså på riktigt och ligger sida vid sida.
- Notering: momshanteringen skiljer sig mellan dem. Månadspriset har
  `tax_behavior` satt till ospecificerad, uppstartspriset till exklusiv moms.
  Bör harmoniseras innan fakturering, annars kan momsen redovisas olika.

Inga filer i PR28 (`RegisterPage`, `SubscriptionGuard`) rördes.
