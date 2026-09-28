# Aurora Transport (aurora-k)

Transportledningssystem på React 18, Vite, TypeScript och Tailwind, med PWA/Capacitor och Lovable Cloud (Supabase `dqjwtnziasqtveuwnalx`). Produktion: https://auroratransport.se. Läs `README.md` och `docs/launch-readiness-2026-09-08.md` för detaljer; driftuppgifter i dokumenten är daterade och måste verifieras.

## Utveckling och kontroll
- Använd Node 22+ och npm med committad `package-lock.json`; installera med `npm ci`.
- Kör `npm run validate` innan du pushar (typkontroll, lint, Vitest, PostgreSQL-tester och produktionsbygge med SEO/PWA-kontroller).
- Vid ändrade Edge Functions: kör även `deno check --node-modules-dir=none --no-lock` på berörda `index.ts`. Dispatchflöden testas med `npm run test:dispatch`; alla externa anrop ska vara mockade.
- Ändra aldrig `xlsx`-beroendet i `package.json`.
- Ändra inga befintliga migrationer; databasändringar ska få nya migrationer.
- Ändra inte Lovable-genererade `src/integrations/supabase/types.ts`, `src/integrations/supabase/client.ts` eller `.lovable/`.
- Committa eller logga aldrig privata nycklar; förvara dem som secrets i Lovable/Supabase.

## Produktion och PR
- Main och publicerad Lovable-version är separata releasesteg. Backend deployas manuellt från Lovable när GitHub-secrets `SUPABASE_ACCESS_TOKEN`/`SUPABASE_DB_PASSWORD` saknas. Behåll workflowens avsiktliga felspärr; gitändringar bevisar inte att backend är deployad.
- Deploya granskade nya migrationer före beroende Edge Functions. Spela inte om historiska migrationer med `--include-all` utan separat schemagranskning. Verifiera publicerad frontendversion och API-svar efter release.
- Varje PR som rör `supabase/` ska avsluta PR-beskrivningen med en exakt lista över Edge Functions och migrationsfilnamn som måste deployas från Lovable. Spåra även direkta och indirekta importer av ändrade filer i `supabase/functions/_shared/` och lista alla berörda funktioner. Skriv uttryckligen ”inga” där inget behöver deployas.
- `verify_jwt` styrs av `supabase/config.toml`; håll inga separata funktionslistor eller JWT-undantag i deployworkflowen.
- Håll `VITE_PUBLIC_SITE_URL` och backendens `SITE_URL`/`PUBLIC_SITE_URL` på samma kanoniska origin utan avslutande slash. Auth redirect-allowlist hanteras i dashboarden.
- Resend använder normalt Lovables connector-gateway; direktläge kräver uttryckligt `RESEND_API_MODE=direct` och riktig Resend-nyckel. Aktivera orderinkorg först efter verifierad DNS, webhook och signeringsnyckel. Skicka inte tester till riktiga kundadresser.
- Aktivera aviseringsschemat först efter deploy av `dispatch-notifications` och dess validerings-RPC; cronhemligheten finns endast i Vault. Skicka inte om historiska aviseringar eller automatiska mejl för demoföretag.
