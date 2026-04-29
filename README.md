# Aurora Transport

Aurora Transport är ett SaaS-system för åkerier, budfirmor och transportbemanning. Plattformen innehåller publika SEO-sidor, kundportal, adminvy, förarvy, PWA-stöd och Supabase-integrationer.

## Projektstruktur

```text
.
├── frontend/   # React, Vite, TypeScript, Tailwind, Supabase och PWA
├── backend/    # Valfri FastAPI/MongoDB-service för externa API-endpoints
└── .github/    # CI-workflows för lint, test och build
```

Den aktiva webbappen ligger i `frontend/`. Backend-mappen är fristående och ska bara deployas om projektet behöver egna API-endpoints utöver Supabase/Lovable Cloud.

## Köra frontend lokalt

```bash
cd frontend
npm ci
npm run dev
```

Appen startar normalt på `http://localhost:8080` via Vite-konfigurationen.

## Kvalitetskontroller

Kör detta innan merge/deploy:

```bash
cd frontend
npm run lint
npm run test -- --run
npm run build
```

GitHub Actions kör samma steg från `.github/workflows/quality.yml`.

## Backend, endast vid behov

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Backend kräver MongoDB för `/api/status`. Om `MONGO_URL` eller `DB_NAME` saknas startar API:t ändå, men status-endpoints svarar med ett tydligt konfigurationsfel.

## Deployment

Frontend ska deployas med `frontend/` som root/build directory.

Vanliga inställningar:

- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`

Supabase publishable config finns i frontend-bygget. Hemliga nycklar ska aldrig läggas i frontend-koden.

## SEO/PWA

Viktiga SEO-filer finns i `frontend/public/`:

- `sitemap.xml`
- `robots.txt`
- `manifest.json`
- `og-image.png`

Prerendering av publika SEO-sidor styrs i `frontend/vite.config.ts`.
