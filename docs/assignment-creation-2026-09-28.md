# Uppdragsflöde, container och kranbil – 28 september 2026

## Fel och rättning

Åtta företag i den befintliga produktionsdatabasen saknade en rad i
`driver_settings`. Formuläret behandlade ett lyckat tomt svar som ett fel och
stoppade uppdrag som ärvde foto- eller signaturkrav. Exakt feltext från användaren
har inte erhållits; detta är en verifierad möjlig orsak, inte en bekräftad
reproduktion i användarens inloggade session.

`supabase/ops/backfill-driver-settings.sql` kördes i Lovable Cloud-projekt
`dqjwtnziasqtveuwnalx`: 8 företag fick databasens befintliga standardvärden.
Efterkontrollen visade 0 företag utan inställningar. Befintliga förval och
chaufförsanpassningar ändrades inte. Åtgärden skapar inga uppdrag eller utskick.

Klienten använder nu samma standardvärden även om en rad saknas i framtiden,
med en synlig förklaring i formuläret. Nätverks- och behörighetsfel behandlas
fortfarande som fel. Ogiltiga val ger ett begripligt meddelande och formuläret
behåller inmatningen. Återkommande uppdrag sparas i ett gemensamt INSERT så att
databasen kan återställa hela serien om någon rad misslyckas.

## Verksamhetsstöd

- Container: utsättning, byte och hämtning; container ut/in, volym, material,
  mottagningsanläggning, planerat hämtdatum, avtalad dygnshyra och platskontakt.
- Kranbil: lyft eller transport och lyft; gods, uppgiven vikt, önskad räckvidd,
  lyfthöjd, uppställningsplats och kontakt.
- Uppgifterna sparas i befintliga uppdragsinstruktioner som chauffören kan läsa.
  De är ett uppdragsunderlag, inte ett containerregister eller automatisk
  hyresfakturering. Hämtning bokas separat och fakturabelopp anges som tidigare.

## Verifiering och release

Den fullständiga integrationsversionen klarade `npm run validate` (402 tester,
databastester, typkontroll, lint och produktionsbygge) samt alla 25 isolerade
Playwright-tester. Bland regressionerna finns tomma företagsförval, sparade
containeruppgifter, mobil kranbilsserie med fel/återförsök och blockerad
inställningshämtning. Inga testanrop gick till riktiga kunder eller backend.

Formulärändringen kräver inga nya tabeller, migrationer eller Edge Functions.
Den äldre lanseringsändringen i PR #39 har separata backendberoenden och får
inte antas vara driftsatt bara för att koden finns på main. Publicera
formulärreleasen före den backendberoende versionen om backend inte är klar.
