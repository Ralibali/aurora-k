# Aurora Transport

Aurora Transport är ett transportledningssystem för åkerier, budföretag och
bemanningsteam. Plattformen samlar uppdragsplanering, förarhantering,
tidrapportering, GPS-spårning och fakturaunderlag i ett enkelt SaaS-verktyg.

- **Webbplats:** https://auroratransport.se
- **Ägare:** Aurora Media AB (org.nr 559272-0220)
- **Stack:** React 18, Vite, TypeScript, Tailwind och Supabase (Lovable Cloud)
- **Mobil:** PWA samt Capacitor-byggen för iOS och Android
- **Pris:** 449 kr/mån, 3 500 kr i setup/onboarding, obegränsat antal förare och ingen bindningstid

## Utveckling

Projektet använder npm och den committade `package-lock.json` som källa för
reproducerbara installationer. **Node 22 eller senare krävs** (se `.nvmrc`) –
Capacitor 8:s CLI, som används för iOS- och Android-byggena, stödjer inte
äldre Node-versioner.

```bash
nvm use   # valfritt, läser .nvmrc (Node 22)
npm ci
npm run dev
```

Appen körs på http://localhost:8080. Backend-konfigurationen hanteras via
Lovable Cloud. Publika Supabase-nycklar får ligga i klienten, men privata
service-role-, Stripe-, Resend- och Fortnox-hemligheter ska alltid sparas som
secrets i Lovable/Supabase och aldrig committas.

## Verifiering

Kör hela verifieringen före merge eller produktion:

```bash
npm run validate
```

Det kör TypeScript-kontroll, ESLint, Vitest och produktionbuild inklusive den
statiska SEO-genereringen.

## Struktur

- `src/pages/` – publika SEO-sidor, blogginlägg och inloggade vyer
- `src/components/` – delade UI-komponenter och layout-shells
- `src/features/` – avgränsade produktflöden
- `supabase/functions/` – edge-funktioner för bland annat Stripe, e-post, kundportal och integrationer
- `supabase/migrations/` – databasändringar som måste distribueras före beroende funktioner
- `public/sitemap.xml` och `public/robots.txt` – SEO-konfiguration

## Produktion

Ändringar i `supabase/**` distribueras av GitHub Actions när repository-secrets
`SUPABASE_ACCESS_TOKEN` och `SUPABASE_DB_PASSWORD` finns konfigurerade. Om de
saknas hoppar deployjobbet över distributionen och ändringen måste distribueras
från Lovable Cloud/Supabase innan funktionen kan användas i produktion.
