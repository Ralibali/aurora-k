# Aurora Transport → Vercel

Målarkitektur:

- GitHub = source of truth
- Vercel = frontend preview + production
- Supabase/Lovable Cloud = befintlig databas, auth och Edge Functions
- Capacitor/PWA = befintlig mobilklient, ska fortsätta använda samma backend

Migrationen flyttar inte Supabase, Stripe, Resend eller Fortnox.

## Build

- Node: 22 (`.nvmrc`)
- Install: `npm ci`
- Kontroll före produktion: `npm run validate`
- Build: `npm run build`
- Output: `dist`
- Builden genererar även statiska SEO-sidor och sitemap samt normaliserar produktcopy.

## Preview QA – måste passera före merge/cutover

1. `/` laddar Aurora Transport.
2. Publika SEO-routes som `/transportledningssystem`, `/vad-kostar-transportledningssystem` och minst en `/blogg/...` visar route-specifik prerenderad HTML/title/canonical, inte generisk SPA-HTML.
3. `/login`, `/register`, `/onboarding`, `/admin/*`, `/driver/*`, `/platform/*` och `/portal` laddar direkt som SPA-routes och privata routes är noindex.
4. `/boka/:slug` och `/track/:token` fungerar mot befintlig Supabase-backend utan att exponera data mellan tenants.
5. Auth, reset-password och sessionspersistens fungerar.
6. PWA-manifest och service worker laddar, uppdaterar och cachear inte autentiserade Supabase-svar.
7. `sitemap.xml` och `robots.txt` returnerar korrekta filer och Content-Type.
8. Stripe/Fortnox/Resend-webhooks flyttas inte enbart för frontendbytet. Verifiera callback/origin-beroenden utan oönskade livebetalningar.
9. Capacitor deep links, auth callbacks och API-anrop påverkas inte av custom-domain-cutover.
10. Mobil och desktop saknar P0/P1-fel och browser console är ren i kärnflöden.

Om statiska SEO-routes fångas av SPA-fallbacken ska rewrites korrigeras före merge.

## Production cutover

Först efter Preview PASS:

1. Merge `main` och verifiera automatisk production deployment.
2. Koppla `auroratransport.se`/`www` till rätt Vercel-projekt med exakt DNS-värde från Vercel.
3. Behåll tidigare hosting som rollback tills auth, PWA, bokning/tracking, backend och SEO är verifierade på custom domain.
4. Markera inte MIGRATED innan manuell Lovable Publish inte längre krävs.
