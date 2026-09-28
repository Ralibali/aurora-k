# Smart Rutt – stabilisering 2026-09-28

VERIFIED FACT: dagsoptimering, VROOM-anslutning, kapacitet/kompetens och godkännandeflöde fanns redan på main. Leveransen förbättrar detta flöde i `/admin/routes` i stället för att lägga till en konkurrerande produkt eller ett nytt pris.

## Byggt

- Servern härleder dygnsgränser i Europe/Stockholm från valt datum, inklusive sommar-/vintertidsbyte. Klientens påstådda UTC-gränser används inte.
- Bara `pending`/`unassigned` optimeras. Påbörjade, försenade, avslutade och avbokade uppdrag flyttas inte av dagsoptimeringen. Chaufförer med pågående/försenade jobb undantas; detta kontrolleras igen före godkännande.
- Reservmotorn lämnar uppdrag med saknade/ogiltiga koordinater, saknat eller omöjligt sluttidsfönster, saknad kompetens eller otillräcklig kumulativ kapacitet ofördelade. Starttid, restid och 15 min servicetid måste rymmas innan scheduled_end.
- En giltig företagsdepå krävs. Första uppdraget används inte som påhittad depå. Högst 200 uppdrag och 50 chaufförer per körning.
- VROOM-anrop har 20 sekunders timeout. Resultat valideras för identifierare, dubbletter, tidsfönster, kapacitet, kompetens och överlapp. Väntetid räknas in i ankomst/avgång; kumulativa distanser konverteras till benavstånd.
- Jämför inte VROOMs vägavstånd med reservmotorns fågelväg. Baslinje/besparing visas som ej jämförbar för VROOM, ofullständiga förslag och när utgångsläget saknar tilldelad tillgänglig chaufför. Reservmotorns jämförelse använder samma metod och inkluderar återresa till depå. Utan depå visas ej mätt.
- Nya godkännande-RPC:n låser och granskar företag, uppdrag och chaufförer. Ändrade uppdrag, tillgänglighet, kapacitet, kompetenser eller fel företag kräver ett nytt förslag. Äldre förslag utan ny snapshot avvisas med tydligt meddelande. Godkända/dubbla godkännanden avvisas. Ingen transport ändras före uttryckligt godkännande.

## Konfiguration och driftsättning (ej utförd)

1. Applicera endast `20260928070130_route_plan_freshness.sql`, efter befintliga rutt-/fleet-migrationer. Historiska dubblettmigrationer ska inte spelas om.
2. Deploya `optimize-routes` med nya lokala moduler `engine.ts` och `day.ts`. Befintlig `verify_jwt`-inställning och serverns användar-/företagskontroll behålls. Inga `_shared`-filer ändras och inga andra Edge Functions behöver deployas.
3. Ange korrekta depot_lat/depot_lng, route_capacity, route_skills, route_demand, uppdragskoordinater samt start/slut på uppdragen via befintlig administration. Null sluttid planeras inte automatiskt.
4. Valfri befintlig VROOM-integration: `VROOM_BASE_URL` och vid behov `VROOM_API_TOKEN` som serversecrets. Utan VROOM används tydligt markerad reservmotor. Ingen ny betald kart-/optimeringstjänst har aktiverats.
5. Publicera frontend och skapa nya förslag. Äldre förslag kan inte godkännas efter migrationen. Kontrollera ett litet riktigt dagsförslag och förarens körordning före operativ utrullning.

Reservmotorn är en heuristik med fågelväg/50 km/h och 15 min per stopp, inte vägnäts-/trafikbaserad ETA eller bevisat optimal lösning. Den bedömer bara de ej påbörjade uppdragen; förarskift, rastregler, fordonsdimensioner och fysisk lastning behöver fortfarande transportledarens granskning. VROOM använder befintligt 18-timmarsfönster från dygnsstart. Ändringen gör inga regulatoriska eller garanterade besparingsanspråk.

Rollback: återställ frontend/funktion vid behov, men behåll godkännandespärren. Äldre backend kan inte skapa godkänningsbara snapshots; deploya därför migration och ny funktion tillsammans i ett planerat releasefönster. Radera inte befintliga ruttplaner.

## Verifiering och licens

`npm ci`; `npm run validate`; `npm run test:dispatch`; `deno check --node-modules-dir=none --no-lock supabase/functions/optimize-routes/index.ts`.

Nya motortester: koordinater, hårda tidsfönster, kapacitet, kompetens, servicetid, saknad depå och båda DST-skiften. Nya PGlite-tester: inaktuellt uppdrag, ändrad chaufför, fel företag, giltigt och dubbelt godkännande. Webbläsartestet simulerar provider och RPC och kontrollerar att ingen ändring sker före godkännande, att avbryt fungerar och att ett inaktuellt förslag inte presenteras som godkänt. Befintliga dispatch-/integrations-/reliability-tester körs också, utan externa anrop.

Ingen ny runtime-dependency, ingen AGPL-kod. Ny logik är egen implementation. Den befintliga valfria VROOM-anslutningen använder separat server. [VROOM LICENSE](https://github.com/VROOM-Project/vroom/blob/master/LICENSE) är BSD-2-Clause, verifierad 2026-09-28. Kartdata/routingbackend har egna användningsvillkor som måste granskas vid drift; inga sådana komponenter har installerats eller kopierats här.
