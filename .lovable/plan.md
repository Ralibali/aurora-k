# Dokumentinkorg för transportdokument

Bygger vidare på den befintliga orderinkorgen (OrderInboxPage, PdfOrderImportDialog, SmartOrderImportDialog, order-parser, parse-order-document). Inget nytt projekt, ingen ny domän, ingen paywall.

## Vad du får

- **Ladda upp PDF eller mobilbild** (JPG, PNG, WebP) direkt i Beställningar. Tydlig kontroll av filtyp och maxstorlek (20 MB), med begripliga svenska felmeddelanden.
- **Automatisk dokumenttyp**: transportorder, leveransbevis (POD), fraktsedel/CMR — eller "okänd", som fortfarande går att granska manuellt.
- **Utläst information** visas där den finns: ordernummer/referens, kund, hämtning, leverans, datum och tid, kontakt, tjänst, vikt/gods, belopp och om det ser ut att finnas en signatur. Tomma fält lämnas tomma, inget gissas fram.
- **Säkerhetsgrad** totalt och på de viktigaste fälten. Låg säkerhet markeras som "kräver granskning" och kan inte gå vidare utan att du bekräftar.
- **Försiktig matchning** mot befintlig kund (namn/org.nr) och mot befintligt uppdrag (referens, kund, datum). Osäkra matchningar föreslås bara — inget skrivs över automatiskt.
- **Dokumentinkorg per bolag** med status Ny / Granskad / Kopplad / Fel, filter på status och dokumenttyp, och originalfilen sparad privat.
- **Transportorder** öppnar det befintliga färdigifyllda uppdragsformuläret. **POD och fraktsedel** kopplas till ett redan befintligt uppdrag utan att nytt uppdrag skapas.

## Teknisk plan

1. **Migration** `inbound_documents`: company_id, uploaded_by, filename, content_type, size_bytes, storage_path, document_type, status (`new|reviewed|linked|error`), parsed_payload, confidence, field_confidence, signature_detected, assignment_id (FK assignments, on delete set null), error_message, tidsstämplar. GRANT till authenticated/service_role, RLS enligt befintligt `user_roles`-mönster med company_id, index på (company_id, created_at desc) och (company_id, status). Återanvänder den befintliga privata bucketen `order-inbox` och lägger till insert/select/update-policy på `storage.objects` scoped på company-mappen. Ingen publik bucket, inga dubbletter av order_inbox_channels/inbound_order_emails.
2. **Delad parsning** i `supabase/functions/_shared/`: ny `document-classifier.ts` (typ + typ-säkerhet från nyckelord) och utökning av `order-parser.ts` med `parseTransportDocument()` som återanvänder `parseInboundOrder` och lägger till belopp, signaturindikation och per-fält-säkerhet. `parseInboundOrder` och `ParsedInboundOrder` behåller exakt nuvarande beteende.
3. **parse-order-document** utökas: godkänner bild-mimetyper och kör Azure OCR (befintlig `azure-document-ocr.ts`) för bilder; returnerar fortfarande `parsed` + `document` men även `documentType`, `fields` och `fieldConfidence`. Nytt läge `persist` som laddar upp originalfilen till Storage och skriver en `inbound_documents`-rad. OCR-fel skriver status `error` med felmeddelande och raderar aldrig filen eller andra rader. Inga nya externa tjänster.
4. **Frontend** i `src/features/order-inbox/`: `document-inbox.ts` (typer + kund- och uppdragsmatchning, normalisering), `DocumentUploadDialog.tsx` (filval, validering, uppladdning), `DocumentInboxPanel.tsx` (lista, filter, granskningsdialog, koppla/skapa uppdrag) monterad på befintliga `AdminOrders`-sidan. Befintliga dialoger och OrderInboxPage lämnas fungerande.
5. **Tester**: klassificering, fältnormalisering/belopp/signatur, kund- och uppdragsmatchning samt ett regressionsfall som låser nuvarande `parseInboundOrder`-utfall och `parseTransportOrder`-CSV-flödet.
6. Kör lint på berörda filer, typecheck, tester och build; fixa fel som ändringen orsakar, och gör en sammanhållen commit.
