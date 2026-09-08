# Produktionsinventering (endast läsning) — Aurora Transport

Inga filer, inställningar, mejl eller data har ändrats. Inga hemliga värden visas nedan.

## Backend
- Supabase-projekt (Lovable Cloud): ref `dqjwtnziasqtveuwnalx`, region aws eu-west-1, storlek Tiny, ej pausad. Samma instans används av preview och publicerad app.
- Senast tillämpade migration i produktion: `20260907143245_assignment_deviation_workflow`. Före den: fyra migrationer från 2026-08-07 samt tre från 2026-07-12.

### Migrationer som finns lokalt men INTE är tillämpade i produktion
```text
20260429003000_saas_notifications_and_uploads
20260625223000_product_core_reliability
20260625224500_assign_public_booking_company
20260626001000_public_booking_requests_insert_policy
20260626090000_assignment_tracking_tokens
20260626130000_inbound_order_inbox
20260626150000_fortnox_oauth
20260626170000_driver_offline_sync
20260704090000_driver_push_tokens
20260712150000_harden_public_booking
20260719000000_compliance_documents
20260730000000_trial_signup
```
Delar av dessa scheman lades tidigare in manuellt i produktion, så databasen kan vara funktionellt korrekt trots att migrationsloggen saknar raderna. Detta är en lanseringsrisk: en `db push` från en ren gren kan försöka köra dem igen. Verifiering av faktiskt schema mot varje fil bör göras innan deploy.

## Edge-funktioner
23 funktioner finns i repot: `create-checkout, create-driver, create-onboarding-link, customer-portal, demo-login, driver-sync, generate-recurring-assignments, join-driver, notify-admin, order-inbox-api, parse-order-document, public-booking, register-company, resend-inbound-order, seed-users, send-email, send-push, share-assignment, stripe-portal, stripe-webhook, track-assignment, update-password` (+ `_shared`).
Publika (utan JWT-krav enligt config.toml): `resend-inbound-order, stripe-webhook, track-assignment, customer-portal, public-booking, notify-admin`.
Versionsnummer per deployad funktion går inte att läsa ut med de verktyg som finns i den här sessionen — endast anrop/loggar. Deploy sker via GitHub Actions (`.github/workflows/deploy-supabase-integrations.yml`) och den listar inte `create-driver`, `create-onboarding-link`, `join-driver`, `update-password`, `send-push`, `share-assignment`, `generate-recurring-assignments`, `seed-users`. De funktionerna deployas alltså inte automatiskt vid push.

## Hemligheter (endast namn, inga värden)
Finns: `RESEND_API_KEY` (hanteras av connector), `LOVABLE_API_KEY` (hanterad), `BREVO_API_KEY`, `GOOGLE_SEARCH_CONSOLE_API_KEY` (connector), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_SETUP_PRICE_ID`.
Saknas: inget SMTP-relaterat, inget `SITE_URL`/`PUBLIC_SITE_URL` (koden faller tillbaka på `https://auroratransport.se`), ingen `RESEND_WEBHOOK_SECRET` för inkommande mejl.

## Resend: gateway, inte direkt API-nyckel
Connector-anslutningen "Resend" är länkad till projektet och går via Lovable-gatewayen (`uses connector gateway: true`). `RESEND_API_KEY` är alltså en gateway-nyckel, inte en Resend-nyckel — anrop måste gå till `https://connector-gateway.lovable.dev/resend/...` med både `LOVABLE_API_KEY` och `RESEND_API_KEY`. Det stämmer med `send-email` och `notify-admin`.
Undantag: `supabase/functions/_shared/resend-receiving.ts` anropar `https://api.resend.com` direkt med samma nyckel. Det kan inte fungera med en gateway-nyckel — trolig lanseringsblockerare för inkommande order via mejl.

## Avsändardomän
`auroratransport.se` i Resend: status `partially_failed`.
- DKIM (`resend._domainkey` TXT): verifierad
- SPF (`send` MX + TXT): verifierad
- Inkommande (MX på rotdomänen mot `inbound-smtp.eu-west-1.amazonaws.com`): **failed**

Slutsats: utgående utskick från `noreply@auroratransport.se` fungerar. Endast mottagning av mejl till domänen är trasig, vilket träffar order-inkorgen (`resend-inbound-order`). Övriga domäner i kontot: `auroramedia.se` är `partially_verified`; verifierade är `cykelhjalpen.se`, `goglampingsweden.se`, `agilitymanager.se`, `odlingsdagboken.com`, `notify.honsgarden.se`.
Lovables egna e-postinfrastruktur (Lovable Emails) är inte uppsatt för projektet — statusen är "not_started". All e-post går alltså via Resend-connectorn.

## Auth-mejl (bekräftelse och lösenordsåterställning)
- Verktygen i den här sessionen kan inte läsa Supabase Auth SMTP-inställningar eller redirect-allowlist; de kan bara skrivas. Ingen skrivning har gjorts.
- Ingen SMTP-hemlighet finns i projektets secrets, och ingen Lovable-e-postdomän är kopplad. Det talar starkt för att auth-mejl går via Supabas inbyggda standardavsändare, som är hårt begränsad (ungefär ett fåtal mejl per timme) och inte lämplig för skarp drift. Detta är en trolig lanseringsblockerare för både registrering och lösenordsåterställning.
- Koden skickar `redirectTo` som `${window.location.origin}/reset-password`. För att det ska fungera i produktion måste `https://auroratransport.se`, `https://www.auroratransport.se` och preview-domänen ligga i Auth redirect-allowlist. Listan finns inte i git och kunde inte läsas här.

## Vad som saknas i åtkomst
1. Läsning av Supabase Auth-konfiguration (SMTP-avsändare, Site URL, redirect-allowlist) — kräver att du bekräftar dem i Cloud-vyn eller att jag får skriva/uppdatera dem.
2. Versionsnummer per deployad edge-funktion — inte exponerat; kräver Supabase Management API-token.
3. DNS-åtkomst till `auroratransport.se` hos registraren för att lägga MX-posten som gör inkommande order-mejl möjliga.
4. Beslut om avsändarvägen för auth-mejl: antingen anpassad SMTP mot Resend eller att auth-mejl fortsatt använder standardavsändaren.

## Nästa steg (ingen kod ändras av mig)
- Bekräfta om auth-mejl ska gå via Resend-SMTP; då behövs SMTP-uppgifter och en engångsinställning av Auth.
- Lägg MX-posten för inkommande mejl om order-inkorgen ska ingå i lanseringen.
- Låt Codex rätta `_shared/resend-receiving.ts` till gateway-anrop i stället för direkta Resend-API-anrop.
- Stäm av de tolv icke-registrerade migrationerna mot faktiskt produktionsschema innan deploy från grenen.
