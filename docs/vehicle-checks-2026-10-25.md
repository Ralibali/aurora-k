# Fordonskontroll MVP – 25 oktober 2026

## Implementerat
- Förarens uppdragsvy innehåller däck, belysning och skador för uppdragets befintliga fordon.
- Avvikelser kräver beskrivning. Säkerhetskritiska rapporter kan skickas även när alla punkter inte kontrollerats och kräver bekräftelse.
- Rapporter är observationer, aldrig ett intyg om trafiksäkerhet. Kontroll ändrar inte uppdragsstatus eller tidregistrering.
- Admin hittar öppna avvikelser och fordonshistorik under Fordon & objekt. Åtgärdsbeskrivning och bekräftelse krävs för att avsluta en avvikelse; ursprunglig rapport bevaras.
- Rapporter syns i adminlistan, som uppdateras vid sidfokus och var 30:e sekund. Inga nya mejl eller push-utskick införs.
- Foto erbjuds inte i detta MVP. Leveransbevisets foto/signatur och befintlig VROOM/ruttoptimering lämnas orörda.
- Föraren ser endast egna rapporter. Admin ser sitt företags rapporter. Rapportering kräver förarroll och ett eget öppet uppdrag med fordon i samma företag. Avslut kräver företagets adminroll.
- Misslyckad sparning behåller inmatning och samma återförsöksnyckel så länge formuläret finns öppet. Ingen ny offlinekö införs; vid frånkoppling måste sparning återförsökas och bekräftas.

## Drift
Tillämpade via Lovable Clouds migrationsverktyg:
- `drizzle/migrations/0000_vehicle_pre_drive_checks.sql`
- `drizzle/migrations/0001_vehicle_checks_explicit_privileges.sql`

Andra migrationen återkallar eventuella standardprivilegier: inloggade användare har endast läsrätt till tabellen; ändringar går genom behörighetskontrollerade funktioner. Anonyma användare får varken läsa eller anropa funktionerna. Inga nya hemligheter, buckets eller Edge Functions krävs.

Migrationsverktyget regenererade automatiskt den hanterade typfilen. Den har inte redigerats manuellt. SQL ska inte kopieras till den äldre migrationsmappen och appliceras igen.

## Verifierat och kvarstående
- 392 Vitest-tester i 66 filer passerade efter implementation, inklusive fem nya checklistetester.
- Isolerat PostgreSQL-test verifierar användar-/bolagsisolering, fordonstillhörighet, delvis utförd säkerhetskritisk kontroll, återförsök, oföränderlig rapport, adminavslut och oförändrad tidregistrering.
- Befintliga databasregressioner: 59 säkerhets-/aviseringskontroller, 8 Fortnox-kontroller och ruttförslagets aktualitetskontroller passerade.
- Lint: inga fel; en befintlig varning i DocumentInboxPanel.
- Automatisk previewbyggkontroll: senaste resultat `build OK`.
- Inloggad ägaradmin: fordonskontrollistan laddar och statusfiltret fungerar; dator och 390 px mobil utan sidfel eller horisontell överlappning.
- Ingen riktig förarrapport har skapats mot produktionsdata. Hela kedjan förarrapport → adminavslut → historik är därför verifierad i isolerade tester, inte som autentiserad fullständig UI-kedja mot Cloud.
- Manuellt fullständigt `npm run validate`, separat typkontroll och produktionsbyggets SEO/PWA-steg har inte körts; automatiska kontroller sköts av Lovable.
- Ingen frontendpublicering eller manuell gitcommit har gjorts. Publicering väntar på full releasetest och en uttryckligen isolerad förar-/adminverifiering.

## Deploylista
Edge Functions: inga.
Migrationer: `drizzle/migrations/0000_vehicle_pre_drive_checks.sql`, `drizzle/migrations/0001_vehicle_checks_explicit_privileges.sql` (redan tillämpade i Cloud).