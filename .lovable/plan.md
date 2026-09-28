# Driftåtgärd: deploy av två funktioner + borttagning av engångsfunktion

## Omfattning (endast detta)
1. Deploya befintlig Edge Function **send-push** från nuvarande kod, med befintliga JWT-inställningar.
2. Deploya befintlig Edge Function **generate-recurring-assignments** från nuvarande kod, med befintliga JWT-inställningar.
3. Ta bort ENDAST den deployade Edge Function **store-review-provision-039d4b33** (bekräftat aktiv), utan att anropa den.

## Explicit utelämnat
- Inga källfiländringar (inkl. bun.lock, previewAuthStorage.ts), inga nya filer, migrationer eller commits.
- Ingen databasdata-, konfigurations- eller secret-ändring.
- Ingen frontendpublicering.
- Inga anrop/tester av share-assignment, send-push eller generate-recurring-assignments.
- Inga andra funktioner deployas eller tas bort.

## Verktyg
- Deploy: Supabase Edge Function-deployverktyget (deploy_edge_functions) med funktionsnamnen ["send-push", "generate-recurring-assignments"].
- Borttagning: motsvarande delete-verktyg (delete_edge_functions) med ["store-review-provision-039d4b33"].
- Båda är ren driftåtgärd mot live-projektet och rör inga filer i repot — ingen byggprocess körs, så bun.lock/previewAuthStorage.ts kan inte påverkas.

## Verifiering och rapportering
- Rapportera lyckad/misslyckad deploy separat per funktion, med deploytid (UTC) från verktygsresultatet.
- Rapportera att borttagningen av store-review-provision-039d4b33 lyckades/misslyckades.
- Om något verktyg saknas eller misslyckas: stanna och rapportera exakt hinder, utan vidare åtgärder.
