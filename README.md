# Aurora Transport

Aurora Transport är ett transportledningssystem för åkerier, budföretag och
bemanningsteam. Plattformen samlar uppdragsplanering, förarhantering,
tidrapportering, GPS-spårning och fakturaunderlag i ett enkelt SaaS-verktyg.

- **Webbplats:** https://auroratransport.se
- **Ägare:** Aurora Media AB (org.nr 559272-0220)
- **Stack:** React 18, Vite, TypeScript, Tailwind, Supabase (Lovable Cloud)
- **Mobil:** PWA + Capacitor (iOS)

## Utveckling

```bash
bun install
bun run dev
```

Appen körs på http://localhost:8080. Backend-konfiguration (Supabase) hanteras
via Lovable Cloud — inga manuella `.env`-ändringar krävs i utveckling.

## Struktur

- `src/pages/` – publika SEO-sidor, blogginlägg och inloggade vyer
- `src/components/` – delade UI-komponenter och layout-shells
- `supabase/functions/` – edge-funktioner (Stripe, e-post, demo-login m.m.)
- `public/sitemap.xml` & `public/robots.txt` – SEO-konfiguration
