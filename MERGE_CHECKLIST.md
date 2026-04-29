# Merge-checklista för `Emergent`

Den här checklistan sammanfattar vad som behöver kontrolleras innan branchen `Emergent` mergas till `main`.

## Status

- Branch: `Emergent`
- Basbranch: `main`
- Syfte: färdigställa och kvalitetssäkra Emergent-ändringarna innan merge
- Main ska inte ändras förrän checklistan är genomgången

## Klart i denna städrunda

- [x] Flyttat GitHub Actions-workflow till `.github/workflows/quality.yml`
- [x] Justerat CI så den kör från `frontend/`
- [x] Justerat CI-cache mot `frontend/package-lock.json`
- [x] Lagt CI-build på `npm run build:dev` för att undvika att vanlig kvalitetskontroll faller på prerender/Puppeteer
- [x] Tagit bort felplacerad workflow-fil från `frontend/.github/workflows/`
- [x] Skrivit om root-README med projektstruktur, frontend, backend, test och deploy
- [x] Uppdaterat `frontend/README.md` så den matchar npm-flödet
- [x] Gjort den valfria FastAPI-backenden robustare om MongoDB-env saknas
- [x] Lagt till `backend/.env.example`

## Måste kontrolleras innan merge

### 1. Frontend lokalt eller via GitHub Actions

Kör från `frontend/`:

```bash
npm ci
npm run lint
npm run test
npm run build:dev
```

Om detta går igenom är grundläggande lint/test/build okej.

### 2. Produktionsbuild med prerender

Kör även:

```bash
npm run build
```

Detta är viktigare än `build:dev`, eftersom `build` kör produktionsläge och därmed prerendering av SEO-sidor via Puppeteer.

Om denna faller behöver man felsöka `frontend/vite.config.ts`, särskilt prerender/Puppeteer-konfigurationen.

### 3. Deploy-inställningar

Om frontend deployas från en extern plattform ska root/build directory vara:

```text
frontend
```

Vanliga deploy-inställningar:

```text
Install command: npm ci
Build command: npm run build
Output directory: dist
```

Om plattformen bygger från repository-roten måste den antingen ställas om till `frontend/` eller få kommandon som `cd frontend && npm ci && npm run build`.

### 4. Codemagic/iOS

`codemagic.yaml` ligger i `frontend/` och kommandona i filen antar att arbetskatalogen är `frontend/`.

Kontrollera i Codemagic att projektets working directory pekar på `frontend/`. Om Codemagic bygger från repo-roten måste konfigurationen justeras eller flyttas.

### 5. Backend-beslut

Backend-mappen är fortfarande valfri/frikopplad från frontend.

Beslut behövs innan merge:

- Behåll backend som separat framtida API-service, eller
- Ta bort backend om projektet endast ska använda Supabase/Lovable Cloud

Om den behålls bör den inte deployas utan riktiga miljövariabler:

```text
MONGO_URL
DB_NAME
CORS_ORIGINS
```

### 6. SEO och språk

Landningssidan använder `usePageMeta`, `useHreflang` och `useBreadcrumbJsonLd`.

Kontrollera manuellt efter build:

- `/`
- `/en`
- `/transportledningssystem`
- `/tjanster`
- `/blogg`
- viktiga bloggartiklar

Särskilt viktigt: säkerställ att `/en` faktiskt visar engelskt innehåll eftersom den finns i sitemap och hreflang.

### 7. Sitemap och routes

Kontrollera att alla URL:er i `frontend/public/sitemap.xml` matchar faktiska routes i `frontend/src/App.tsx`.

Notera särskilt bloggrouten:

```text
/blogg/digitalt-korordrersystem-fordelar
```

Den bör kontrolleras för eventuell stavning/slugg-miss innan publicering.

### 8. Manuell smoke test

Efter lokal build/deploy-preview, testa minst:

- Startsida
- Språkväxling SV/EN
- Boka demo-modal
- Login-sida
- Admin-route skyddas korrekt
- Driver-route skyddas korrekt
- Bloggindex
- En bloggartikel
- 404-sida
- PWA-installationsprompt stör inte flödet
- Cookie/exit intent/quick contact visas bara på publika routes

## Rekommenderad merge-process

1. Kör GitHub Actions på `Emergent`
2. Kör lokal eller deploy-preview build med `npm run build`
3. Gör manuell smoke test
4. Öppna PR från `Emergent` till `main`
5. Granska diffen extra noga eftersom många filer har flyttats till `frontend/`
6. Merge först när både CI och manuell kontroll är gröna

## Rekommendation

Mergen bör inte göras direkt utan PR-granskning. Den största risken är inte en enskild kodrad, utan att hela projektstrukturen har ändrats från root-app till `frontend/`-app. Deploy, CI, Codemagic och eventuell hosting måste därför peka rätt innan `main` uppdateras.
