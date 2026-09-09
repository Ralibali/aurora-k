# Kundberedskap — verifieringsnot 2026-09-09

Sanerad. Inga hemligheter, tokens eller riktiga kundadresser.

## Utgångsläge
- Kodbas: main `ba86cbd`.
- Inga migrationer, beroendeuppgraderingar eller orelaterade ändringar gjordes.

## Incident som upptäcktes och åtgärdades
Vid start av verifieringen svarade backend inte alls:
- Auth-endpoint: ingen respons (timeout), REST/databas: ingen respons.
- Edge-funktioner svarade normalt (OPTIONS 200), vilket dolde felet i ytliga kontroller.

Åtgärd: omstart av backend. Återhämtning i ordning auth → REST 521 → 503 → 200.
Efter omstart: databas up, PgBouncer up, anslutningar 6/60, disk 8 %, minne 44 %,
databasstorlek 16,5 MB. Inga rollbacks utöver 1 sedan boot.

Slutsats: driftstörning i data-planet, inte ett kodfel. Ingen data förlorad.

## Livscykeltest (avbrutet — åtkomstbegränsning)
- Två tydligt märkta QA-identiteter skapades mot Resends officiella simulatoradress
  (`delivered+aurora-qa-20260909-admin/driver@resend.dev`). Båda saknades innan.
- Registrering via publikt auth-API: OK, konton skapades.
- Kontona skapades **obekräftade** och utan session.
- För att fortsätta krävs antingen admin-bekräftelse av konto eller
  admin-genererad inloggningslänk. Båda vägarna är spärrade i denna körmiljö
  (godkännande krävs som inte kan ges här). Spärren kringgicks inte.
- Därför är följande **inte verifierat**: företagsregistrering, kundregistrering,
  uppdragsskapande, tilldelning av förare, förarens start/slut, adminvy för
  tider och rapportdata, samt rollisolering mellan admin och förare.

### Städning
- Testprofiler borttagna: 2. Kvarvarande QA-profiler: **0** (räknat i databasen).
- Inga företag, kunder, uppdrag eller notiser skapades — inga sådana artefakter fanns att städa.
- Kvarstår: 2 obekräftade auth-konton på simulatoradresser kan inte raderas härifrån
  (samma spärrade admin-API). De kan inte logga in och saknar företagskoppling.
- Inga befintliga konton eller kunddata rördes. Inga notiser skickades till riktiga mottagare.

## Stripe
- Webhook mot projektets `stripe-webhook` är **aktiv** med exakt de åtta händelser
  koden hanterar: checkout completed / async_payment_failed / async_payment_succeeded,
  subscription created / updated / deleted, invoice paid / payment_failed.
- Månadspris: 449,00 SEK per månad, aktivt. Uppstartsavgift 3 500,00 SEK, engångs, aktiv.
- Andra projekts webhooks orörda.
- **Testläge går inte att köra:** samtliga tillgängliga Stripe-resurser i den anslutna
  kontexten är i live-läge. Det saknas sandbox-/testnycklar. Ett testflöde för
  checkout → betalning → webhook kräver att testlägesnycklar görs tillgängliga.
  Ingen riktig betalning gjordes och inga produktionsuppgifter ändrades.
- Hemligheternas namn finns; inga värden lästes eller återgavs.

## Publicering
- Live serverade före åtgärd fortfarande gammalt bundle `/assets/index-BtSLD_Di.js`.
- Ny publicering utlöst från main `ba86cbd`.

## Öppna punkter
1. Livscykeltest av admin-/förarflödet — blockerat av spärrat admin-API.
2. Stripe testläge — saknar sandboxnycklar.
3. Inkommande ordermejl — MX-post saknas hos DNS-leverantören (`@` → `inbound-smtp.eu-west-1.amazonaws.com`, prio 10).
4. Fortnox — klientuppgifter saknas.
5. Säkerhetsfynd: företagsadmin kan ändra rollfältet på profiler. Bör åtgärdas separat.
