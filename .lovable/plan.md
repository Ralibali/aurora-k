

## Plan: Ta bort företagsnamn från testimonials

Ändra `role`-fältet i alla testimonials så att bara titeln visas, utan företagsnamn.

### Ändringar per fil

**1. `src/pages/LandingPage.tsx` (rad 820-825)**
- `'VD, budföretag'` → `'VD'`
- Övriga (`'Åkeriägare'`, `'Transportledare'`, `'Ekonomiansvarig'`) har redan inga företagsnamn

**2. `src/pages/AdsBudtjanstPage.tsx` (rad 591)**
- `'VD, Stockholms Bud AB'` → `'VD'`

**3. `src/pages/AdsAkeriPage.tsx` (rad 257)**
- `'Åkeriägare, Turesson Transport'` → `'Åkeriägare'`

**4. `src/pages/AdsTransportPage.tsx` (rad 261-262)**
- `'VD, Pålssons Transport'` → `'VD'`
- `'Transportledare, Express Logistik'` → `'Transportledare'`

**5. `src/pages/AdsFlottaPage.tsx` (rad 259-260)**
- `'Flottachef, Expressbud Syd'` → `'Flottachef'`
- `'Driftansvarig, Bergström Logistik'` → `'Driftansvarig'`

Totalt 6 strängar att uppdatera i 5 filer. Inga strukturella ändringar.

