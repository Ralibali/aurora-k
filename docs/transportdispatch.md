# Transportdispatch

Dispatchen finns på `/admin/assignments`. Den öppnar dagens körplan i tidszonen
`Europe/Stockholm`. Datum, status, chaufför och sökning sparas i URL:en, så en
filtrerad vy går att dela eller öppna igen.

## Dagligt arbete

- Växla mellan idag, imorgon, ett valt datum och alla datum.
- Klicka på nyckeltal eller filter för att hitta uppdrag utan chaufför, sena
  starter, rapporterade förseningar och saknade leveransbevis.
- Sök på uppdrag, ID, kund, adress och chaufför. `/` fokuserar sökrutan.
- Markera planerade uppdrag, välj chaufför och granska tilldelningen innan den
  sparas. Filterbyten rensar markeringen. Pågående och avslutade uppdrag ingår
  inte i masstilldelningen.
- Kända tidsöverlapp och en chaufför markerad som ej tillgänglig kräver ett
  aktivt godkännande i dialogen. Saknade sluttider visas som en begränsning.
- Avbokning bekräftas separat. Ett misslyckat anrop behåller dialogen och visar
  fel, så att operatören kan kontrollera läget och försöka igen.

En sen start betyder att ett ännu ej startat, planerat uppdrag passerat sin
starttid med mer än 15 minuter. Det är inte en beräknad leveransförsening.
Schemakontrollen jämför angivna start- och sluttider; den beräknar inte restid,
fordonskapacitet eller chaufförens raster.

Massuppdateringen begränsas till aktuellt företag och planerade statusar. Om
servern inte bekräftar alla valda rader visas ett fel och uppdragen hämtas på
nytt. Den befintliga databasuppdateringen är inte en transaktion över hela
urvalets förhandsvillkor: operatören behöver granska resultatet vid samtidig
ändring eller delvis bekräftelse.

## Verifiering

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:dispatch
```

Playwright startar en separat Vite-server på port 4175. Testerna använder en
lokal testsession, fasta transportdata och mockade API-svar. Externa HTTP-anrop
och WebSocket-anslutningar blockeras. Inga verkliga uppdrag ändras.

Testerna täcker datum/filter/sökning, URL-återläsning, markering,
chaufförstilldelning, tidsöverlapp, misslyckade och delvisa svar, avbokning samt
mobilens layout och arbetsflöde. Enhetstesterna täcker även svenska dygnsgränser
vid sommar- och vintertid och åtgärdslistans filterlänkar.

För visuell granskning finns `e2e/preview-dispatch.ts` (Node 24+). Den använder
samma isolerade testdata och öppnar en tillfällig Chromium-session med CDP på
port 9227. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` kan ange en befintlig Chromium.
Stoppa med Ctrl+C när granskningen är klar.
