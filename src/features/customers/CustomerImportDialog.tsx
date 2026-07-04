import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertCircle, CheckCircle2, Download, Upload } from 'lucide-react';

const HEADERS = [
  'name', 'org_number', 'invoice_address', 'visit_address',
  'contact_person', 'email', 'phone',
  'pricing_type', 'price_per_delivery', 'price_per_hour',
  'payment_terms_days', 'notes',
] as const;

const rowSchema = z.object({
  name: z.string().trim().min(1, 'Namn krävs').max(200),
  org_number: z.string().trim().max(50).optional().nullable(),
  invoice_address: z.string().trim().max(500).optional().nullable(),
  visit_address: z.string().trim().max(500).optional().nullable(),
  contact_person: z.string().trim().max(200).optional().nullable(),
  email: z.string().trim().email('Ogiltig e-post').max(255).optional().nullable().or(z.literal('').transform(() => null)),
  phone: z.string().trim().max(50).optional().nullable(),
  pricing_type: z.enum(['per_delivery', 'per_hour', 'manual']).default('manual'),
  price_per_delivery: z.number().nonnegative().nullable().optional(),
  price_per_hour: z.number().nonnegative().nullable().optional(),
  payment_terms_days: z.number().int().min(0).max(365).default(30),
  notes: z.string().max(2000).optional().nullable(),
});

type ParsedRow = z.infer<typeof rowSchema>;
type RowResult = { row: number; ok: true; data: ParsedRow } | { row: number; ok: false; errors: string[] };

function toNumber(v: string | undefined): number | null {
  if (v == null || v.trim() === '') return null;
  const n = Number(v.replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

function downloadTemplate() {
  const csv = HEADERS.join(';') + '\n' +
    'Acme AB;5591234567;Boxväg 1;;Anna Andersson;anna@acme.se;08-123456;per_hour;;950;30;Nyckelkund\n';
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'kunder-mall.csv'; a.click();
  URL.revokeObjectURL(url);
}

export function CustomerImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { companyId } = useAuth();
  const qc = useQueryClient();
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [importing, setImporting] = useState(false);

  const summary = useMemo(() => {
    if (!results) return null;
    return {
      total: results.length,
      ok: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
    };
  }, [results]);

  const reset = () => { setResults(null); setImporting(false); };

  const handleFile = (file: File) => {
    reset();
    Papa.parse<Record<string, string>>(file, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^\uFEFF/, '').trim().toLowerCase(),
      complete: ({ data, errors }) => {
        if (errors.length) console.warn('[csv-import] parse warnings', errors);
        const parsed: RowResult[] = data.map((raw, idx) => {
          const rowNum = idx + 2; // +1 header, +1 1-indexed
          const pdNum = toNumber(raw.price_per_delivery);
          const phNum = toNumber(raw.price_per_hour);
          const termsNum = toNumber(raw.payment_terms_days);
          if (Number.isNaN(pdNum) || Number.isNaN(phNum) || Number.isNaN(termsNum)) {
            return { row: rowNum, ok: false, errors: ['Ogiltigt tal i pris/betalvillkor'] };
          }
          const parsedRow = rowSchema.safeParse({
            name: raw.name,
            org_number: raw.org_number || null,
            invoice_address: raw.invoice_address || null,
            visit_address: raw.visit_address || null,
            contact_person: raw.contact_person || null,
            email: raw.email || null,
            phone: raw.phone || null,
            pricing_type: (raw.pricing_type || 'manual').trim(),
            price_per_delivery: pdNum,
            price_per_hour: phNum,
            payment_terms_days: termsNum ?? 30,
            notes: raw.notes || null,
          });
          if (!parsedRow.success) {
            return { row: rowNum, ok: false, errors: parsedRow.error.issues.map(i => `${i.path.join('.') || 'rad'}: ${i.message}`) };
          }
          return { row: rowNum, ok: true, data: parsedRow.data };
        });
        setResults(parsed);
      },
      error: (err) => {
        toast.error('Kunde inte läsa CSV: ' + err.message);
      },
    });
  };

  const runImport = async () => {
    if (!results || !companyId) return;
    const okRows = results.filter((r): r is Extract<RowResult, { ok: true }> => r.ok);
    if (okRows.length === 0) return;
    setImporting(true);
    const payload = okRows.map(r => ({ ...r.data, company_id: companyId }));
    const { error, count } = await supabase.from('customers').insert(payload, { count: 'exact' });
    setImporting(false);
    if (error) {
      toast.error(`Import misslyckades — ingen kund skapades: ${error.message}`);
      return;
    }
    toast.success(`${count ?? okRows.length} kunder importerade`);
    qc.invalidateQueries({ queryKey: ['customers'] });
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importera kunder från CSV</DialogTitle>
          <DialogDescription>
            Semikolon-separerad UTF-8. Kolumnrubriker: {HEADERS.join(', ')}. Ogiltiga rader hoppas över.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-1" /> Ladda ner mall
            </Button>
          </div>

          <div>
            <Label htmlFor="csv-file">Välj CSV-fil</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {summary && (
            <div className="rounded-md border p-3 text-sm space-y-2">
              <div className="flex gap-4">
                <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-600" /> {summary.ok} OK</span>
                <span className="flex items-center gap-1"><AlertCircle className="h-4 w-4 text-red-600" /> {summary.failed} med fel</span>
                <span className="text-muted-foreground">av {summary.total} rader</span>
              </div>
              {summary.failed > 0 && (
                <div className="max-h-48 overflow-auto text-xs bg-muted/50 rounded p-2 space-y-1">
                  {results!.filter(r => !r.ok).map(r => (
                    <div key={r.row}>
                      <strong>Rad {r.row}:</strong> {(r as { errors: string[] }).errors.join('; ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={runImport} disabled={!summary || summary.ok === 0 || importing}>
            <Upload className="h-4 w-4 mr-1" />
            {importing ? 'Importerar...' : `Importera ${summary?.ok ?? 0} kunder`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}