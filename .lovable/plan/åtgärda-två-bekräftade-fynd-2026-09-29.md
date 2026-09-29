# Åtgärda två bekräftade fynd

## 1. Dubbel databasfil för Smart Rutt/fleet (bekräftat, hög)
- `20260913144422_route_optimizer_and_fleet.sql` och `20260913151733_800870e5-....sql` är identiska (skiljer bara på avslutande radbrytning). Båda innehåller `create table` utan `if not exists`, så en ny miljö stoppar på den andra filen.
- Produktionens migrationshistorik innehåller bara `20260913151733`. `20260913144422` är aldrig registrerad där, trots att innehållet är applicerat.
- Åtgärd: ta bort `supabase/migrations/20260913144422_route_optimizer_and_fleet.sql` och behåll den registrerade kopian. Produktionen påverkas inte, ingen SQL körs och ingen annan migration ändras.
- Projektregeln "ändra inga befintliga migrationer" gäller. Godkänn planen för att tillåta just detta undantag.

## 2. Dokumentinkorgen syns inte i appen (bekräftat, medel)
Backend, tabellen `inbound_documents` och `document-inbox.ts` finns, men inget i gränssnittet använder dem.
- `PdfOrderImportDialog`: tillåt PDF, JPG, PNG och WebP via `validateDocumentFile` (max 20 MB) och skicka `persist=true`. Visa dokumenttyp, säkerhet och eventuell signatur. Visa en varning för manuell granskning vid låg säkerhet. Nuvarande PDF-flöde till `/admin/assignments/new` är oförändrat.
- Ny flik "Dokument" i `OrderInboxPage`: en lista över bolagets `inbound_documents` med filter på status och dokumenttyp. I granskningen visas tolkade fält, där okända fält står tomma. Originalfilen öppnas via en tidsbegränsad privat länk.
- Åtgärder i granskningen: transportorder går till "Skapa uppdrag" i det befintliga flödet. POD och CMR går till "Koppla till uppdrag" med förslag från `matchAssignment`, och kopplingen kräver att admin bekräftar. Kopplingen sätter `assignment_id` och status `linked`. Dessutom finns "Markera granskad".
- Ingen schemaändring. Befintlig RLS används.
- Kontroll: typkontroll, befintliga tester och test av det renderade gränssnittet med inloggad admin.
