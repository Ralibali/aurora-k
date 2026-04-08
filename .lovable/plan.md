## Plan

### 1. Ny databastabell: `leads`
- Fält: företagsnamn, kontaktperson, e-post, telefon, org.nummer, antal fordon/förare, meddelande, status (new/contacted/converted/rejected), created_at
- RLS: Anonym kan skapa leads, plattformsadmins kan läsa/uppdatera alla

### 2. Intresseformulär-komponent
- Återanvändbar komponent med alla fält
- Sparar till `leads`-tabellen
- Visas på:
  - Ny sida `/kontakt`
  - Inbäddad sektion på landningssidan
  - Modal via CTA-knappar (ersätter nuvarande "Kom igång gratis"-knappar)

### 3. Ta bort självregistrering
- Ta bort `/register`-rutten och sidan
- Uppdatera alla CTA-knappar som pekar på `/register` → öppna intressemodal eller länka till `/kontakt` istället

### 4. Leads-hantering i plattformsadmin
- Ny flik/sida under `/platform` → "Leads"
- Lista alla intresseanmälningar med status, filtrering och sortering
- Möjlighet att markera som kontaktad/konverterad
- Knapp "Skapa företag & skicka inbjudan" som:
  - Skapar företaget i `companies`
  - Genererar en inbjudningslänk
  - Skickar välkomstmail med inbjudningslänken

### 5. E-postinbjudan till nya företag
- Återanvänd befintlig inbjudningslogik (edge function) för att skicka en registreringslänk
- Kunden registrerar sig via länken och kopplas automatiskt till sitt företag
