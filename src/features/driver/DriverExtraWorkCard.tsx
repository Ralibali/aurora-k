import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Wrench } from 'lucide-react';
import { toast } from 'sonner';

const CUSTOM = 'custom';

type Props = {
  assignmentId: string;
  companyId: string | null | undefined;
  readOnly?: boolean;
};

export default function DriverExtraWorkCard({ assignmentId, companyId, readOnly }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [articleId, setArticleId] = useState<string>(CUSTOM);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('st');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');
  const [vatRate, setVatRate] = useState('25');

  const { data: articles } = useQuery({
    queryKey: ['driver-articles', companyId],
    enabled: !!companyId && !readOnly,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('id, name, unit, default_price, vat_rate')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: lines, isLoading } = useQuery({
    queryKey: ['assignment-articles', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignment_articles')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });

  const total = useMemo(
    () => (lines ?? []).reduce((sum, line) => sum + Number(line.quantity) * Number(line.unit_price), 0),
    [lines],
  );

  const reset = () => {
    setArticleId(CUSTOM);
    setName('');
    setUnit('st');
    setQuantity('1');
    setUnitPrice('0');
    setVatRate('25');
  };

  const addLine = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Saknar företagskoppling');
      const label = name.trim();
      if (!label) throw new Error('Beskriv vad du gjort extra');
      const qty = Number(quantity.replace(',', '.'));
      const price = Number(unitPrice.replace(',', '.'));
      if (!Number.isFinite(qty) || qty <= 0) throw new Error('Ange ett antal större än 0');
      if (!Number.isFinite(price) || price < 0) throw new Error('Ange ett giltigt á-pris');
      const { error } = await supabase.from('assignment_articles').insert({
        assignment_id: assignmentId,
        company_id: companyId,
        article_id: articleId === CUSTOM ? null : articleId,
        name: label,
        unit: unit.trim() || 'st',
        quantity: qty,
        unit_price: price,
        vat_rate: Number(vatRate) || 25,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tillägget är registrerat och går vidare till fakturering');
      reset();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['assignment-articles', assignmentId] });
    },
    onError: (error: Error) => toast.error(error.message || 'Kunde inte spara tillägget'),
  });

  const removeLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assignment_articles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tillägget borttaget');
      queryClient.invalidateQueries({ queryKey: ['assignment-articles', assignmentId] });
    },
    onError: () => toast.error('Kunde inte ta bort tillägget'),
  });

  const pickArticle = (value: string) => {
    setArticleId(value);
    if (value === CUSTOM) return;
    const article = (articles ?? []).find(item => item.id === value);
    if (!article) return;
    setName(article.name);
    setUnit(article.unit);
    setUnitPrice(String(article.default_price ?? 0));
    setVatRate(String(article.vat_rate ?? 25));
  };

  if (readOnly && !isLoading && !(lines ?? []).length) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="h-4 w-4" /> Extra arbete och tillägg
        </CardTitle>
        {!readOnly && (
          <p className="text-sm text-muted-foreground">
            Behövde du t.ex. en annan kran, extra timmar eller material? Lägg till det här så kommer det med på fakturan.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {(lines ?? []).length > 0 && (
          <div className="divide-y rounded-xl border">
            {(lines ?? []).map(line => (
              <div key={line.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{line.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {Number(line.quantity)} {line.unit} × {Number(line.unit_price).toLocaleString('sv-SE')} kr
                  </p>
                </div>
                <span className="font-mono text-sm">
                  {(Number(line.quantity) * Number(line.unit_price)).toLocaleString('sv-SE')} kr
                </span>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Ta bort ${line.name}`}
                    onClick={() => removeLine.mutate(line.id)}
                    disabled={removeLine.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold">
              <span>Summa tillägg (exkl. moms)</span>
              <span className="font-mono">{total.toLocaleString('sv-SE')} kr</span>
            </div>
          </div>
        )}

        {!readOnly && !open && (
          <Button type="button" variant="outline" className="h-12 w-full" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Lägg till extra arbete
          </Button>
        )}

        {!readOnly && open && (
          <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
            {(articles ?? []).length > 0 && (
              <div className="space-y-1.5">
                <Label>Välj tjänst</Label>
                <Select value={articleId} onValueChange={pickArticle}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Välj" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CUSTOM}>Egen rad (skriv själv)</SelectItem>
                    {(articles ?? []).map(article => (
                      <SelectItem key={article.id} value={article.id}>{article.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="extra-name">Vad gjordes?</Label>
              <Input
                id="extra-name"
                className="h-12"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="T.ex. Extra kran 30 ton"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="extra-qty">Antal</Label>
                <Input id="extra-qty" className="h-12" inputMode="decimal" value={quantity} onChange={e => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="extra-unit">Enhet</Label>
                <Input id="extra-unit" className="h-12" value={unit} onChange={e => setUnit(e.target.value)} placeholder="st / tim" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="extra-price">Á-pris</Label>
                <Input id="extra-price" className="h-12" inputMode="decimal" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="ghost" className="h-12" onClick={() => { reset(); setOpen(false); }}>
                Avbryt
              </Button>
              <Button type="button" className="h-12" onClick={() => addLine.mutate()} disabled={addLine.isPending}>
                Spara tillägg
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
