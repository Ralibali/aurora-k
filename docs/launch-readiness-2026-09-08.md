# Aurora Transport – driftkontroll 8 september 2026

Den här releasen rättar registrering, förarsynk, kundportal, kartmarkörer, fakturaunderlag, behörigheter och Resend-utskick. Main och den publicerade Lovable-versionen är separata releasesteg.

## Verifiering

- `npm run validate`: appens typkontroll, lint, unit-/komponenttester, PostgreSQL-tester och produktionsbygge.
- `npm run test:dispatch`: isolerade webbläsartester för desktop, mobil, tilldelning, samtidiga ändringar och mejlfel. Alla externa anrop måste vara mockade.
- `npm run test:db`: PGlite med riktiga PostgreSQL-roller, RLS, databasfunktioner och releasens nya migrationer. Testdata lämnar aldrig processen.
- Serverfunktioner kontrolleras separat med `deno check --node-modules-dir=none --no-lock` på respektive `index.ts`.

## Resend

Projektets befintliga `RESEND_API_KEY` är en Lovable-anslutningsnyckel. Standardläget använder därför `https://connector-gateway.lovable.dev/resend`, `LOVABLE_API_KEY` och `X-Connection-Api-Key`. Direkt Resend stöds endast med uttryckligt `RESEND_API_MODE=direct` och en riktig Resend-nyckel.

Nya transport-, boknings- och portalhändelser köas i samma databastransaktion som själva händelsen. Kön använder idempotens, begränsade återförsök och en atomisk lease. Den behandlar endast nya servergenererade `event_key`-rader; historiska aviseringar skickas inte om. Demoföretagen `556000-0001` och `556000-0002` skickar inga automatiska mejl.

Schemaläggaren aktiveras med `supabase/ops/enable-notification-schedule.sql` efter att funktionen `dispatch-notifications` och dess validerings-RPC har driftsatts. Nyckeln finns endast i Vault under `aurora_notification_cron_secret`. En RPC som bara serverrollen får anropa validerar den utan att lämna ut värdet; ingen extra Edge-hemlighet behöver hållas synkroniserad. Scriptet skapar en minutvis köarbetare och rensar gamla hashade rate-limit-nycklar dagligen. Hemliga värden ska aldrig skrivas i repot eller i driftloggar.

## Inkommande ordermejl

Utgående SPF och DKIM för `auroratransport.se` är verifierade. Mottagningen kräver fortfarande följande innan den aktiveras:

1. Hos Simply: MX, värd `@`, prioritet `10`, mål `inbound-smtp.eu-west-1.amazonaws.com`, standard-TTL. Vid kontrollen fanns ingen MX på rotdomänen. Kontrollera alltid befintlig e-posthantering före en DNS-ändring.
2. En Resend-webhook för `email.received` till `https://dqjwtnziasqtveuwnalx.supabase.co/functions/v1/resend-inbound-order`.
3. Spara webhookens signeringsnyckel som `RESEND_WEBHOOK_SECRET`. Befintliga webhookar som tillhör andra projekt ska lämnas orörda.
4. Verifiera DNS och webhook, sätt sedan `ORDER_INBOX_ENABLED=true`. `ORDER_INBOX_DOMAIN` har standardvärdet `auroratransport.se`.

Fram till aktivering visar appen att e-postmottagningen konfigureras och erbjuder filuppladdning. Mottagningsanrop använder samma gatewaytransport som utgående mejl. Misslyckad bearbetning kan återförsökas utan dubbla orderrader.

Lovables anslutning krävde ett separat godkännande för webhookskapande och ett testutskick till Resends simuleringsadress. Dessa var blockerade när kontrollerna skrevs; ett verkligt leveranskvitto ska verifieras efter godkännandet. Skicka inte test till verkliga kundadresser.

## Publicering

Backend: Lovable Cloud / Supabase `dqjwtnziasqtveuwnalx`. Frontend: `auroratransport.se`, Lovable-projekt `955c8b28-1e52-4079-a2a0-393deb7ad5a2`.

Tillämpa endast de granskade nya migrationerna, driftsätt berörda Edge Functions, aktivera schemaläggaren och publicera därefter den frontendversion som motsvarar main. Kontrollera både publicerad tillgångsversion och API-svar efteråt.

Äldre migrationer saknar delvis historikrader trots att deras schema redan finns i produktion via tidigare samlingsmigrationer. Kör inte en historisk omspelning med `--include-all` utan en separat schemagranskning. Den alternativa GitHub/Supabase-deployen misslyckas tydligt om dess behörigheter saknas, i stället för att rapportera en grön men överhoppad deployment.

Google Maps är en separat kartintegration och kräver inte Google OAuth. Befintlig navigering till Google/Apple Maps och Leaflet-reservkartan fungerar utan Googleinloggning. Trafikbaserad ETA och avancerad ruttoptimering ingår inte i denna verifiering.
