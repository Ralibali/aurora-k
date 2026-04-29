# Aurora Transport Frontend

Det här är den aktiva React/Vite-appen för Aurora Transport.

Aurora Transport är ett transportledningssystem för åkerier, budföretag och bemanningsteam. Plattformen samlar uppdragsplanering, förarhantering, tidrapportering, GPS-spårning och fakturaunderlag i ett SaaS-verktyg.

- **Webbplats:** https://auroratransport.se
- **Ägare:** Aurora Media AB (org.nr 559272-0220)
- **Stack:** React 18, Vite, TypeScript, Tailwind, Supabase/Lovable Cloud
- **Mobil:** PWA + Capacitor

## Utveckling

```bash
npm ci
npm run dev
```

Appen körs normalt på `http://localhost:8080`.

## Kvalitet före merge/deploy

```bash
npm run lint
npm run test -- --run
npm run build
```

Samma kontroller körs av GitHub Actions från repository-roten.

## Struktur

- `src/pages/` – publika SEO-sidor, blogginlägg och inloggade vyer
- `src/components/` – delade UI-komponenter och layout-shells
- `src/hooks/` – auth, data, demo mode och övrig klientlogik
- `src/lib/` – hjälpfunktioner, SEO, formatering, PDF/exporter
- `supabase/functions/` – edge-funktioner för Stripe, e-post, demo-login m.m.
- `public/sitemap.xml` och `public/robots.txt` – SEO-konfiguration

## Miljövariabler

Supabase publishable config hanteras i frontendbygget/Lovable Cloud. Lägg aldrig service-role-nycklar eller andra hemligheter i frontend.
