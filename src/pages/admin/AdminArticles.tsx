import { useMemo, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useArticles, useCreateArticle, useUpdateArticle, useDeleteArticle } from '@/hooks/useNewFeatures';
import { Plus, Pencil, Trash2, Package, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { UsageInfoCard } from '@/components/admin/UsageInfoCard';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SortKey = 'article_number' | 'name' | 'unit' | 'default_price' | 'vat_rate';
type SortDir = 'asc' | 'desc';

export default function AdminArticles() {
  const { data: articles, isLoading } = useArticles();
  const createArticle = useCreateArticle();
  const updateArticle = useUpdateArticle();
  const deleteArticle = useDeleteArticle();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('st');
  const [price, setPrice] = useState('');
  const [articleNumber, setArticleNumber] = useState('');
  const [vatRate, setVatRate] = useState('0');

  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    (articles ?? []).forEach((a) => { if (a.unit) set.add(a.unit); });
    return Array.from(set).sort();
  }, [articles]);

  const filtered = useMemo(() => {
    const list = articles ?? [];
    const q = search.trim().toLowerCase();
    const matched = list.filter((a) => {
      if (unitFilter !== 'all' && a.unit !== unitFilter) return false;
      if (!q) return true;
      return (
        (a.name || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        (a.article_number || '').toLowerCase().includes(q)
      );
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    matched.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'sv') * dir;
    });
    return matched;
  }, [articles, search, unitFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col ? <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-40" />
      : sortDir === 'asc' ? <ArrowUp className="inline h-3 w-3 ml-1" />
      : <ArrowDown className="inline h-3 w-3 ml-1" />;

  const resetForm = () => {
    setEditId(null); setName(''); setDescription(''); setUnit('st'); setPrice(''); setArticleNumber(''); setVatRate('0');
  };

  const openEdit = (a) => {
    setEditId(a.id); setName(a.name); setDescription(a.description || ''); setUnit(a.unit); setPrice(String(a.default_price)); setArticleNumber(a.article_number || ''); setVatRate(String(a.vat_rate)); setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, description: description || null, unit, default_price: parseFloat(price) || 0, article_number: articleNumber || null, vat_rate: parseFloat(vatRate) || 0 };
    if (editId) {
      updateArticle.mutate({ id: editId, ...payload }, { onSuccess: () => { setDialogOpen(false); resetForm(); } });
    } else {
      createArticle.mutate(payload, { onSuccess: () => { setDialogOpen(false); resetForm(); } });
    }
  };

  return (
    <AdminLayout title="Artikelregister">
      <div className="space-y-4">
        <UsageInfoCard
          icon={Package}
          title="Artiklar används för att räkna fram pris på uppdrag och fakturor"
          description="När du skapar artiklar hämtas pris, enhet och moms automatiskt vid orderläggning och fakturering — så slipper du räkna manuellt."
          usedFor={[
            'Förvalt pris vid nya uppdrag',
            'Snabbval på fakturarader',
            'Kund-specifika prislistor',
            'Korrekt momssats per rad',
          ]}
          nextStep={{ label: 'Skapa kundspecifik prislista', href: '/admin/customers' }}
        />
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">Hantera artiklar med priser för uppdrag och fakturering.</p>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Skapa artikel</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? 'Redigera artikel' : 'Ny artikel'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Namn *</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} required placeholder="T.ex. Transport per timme" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Beskrivning</Label>
                    <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Valfri beskrivning" />
                  </div>
                  <div className="space-y-2">
                    <Label>Artikelnummer</Label>
                    <Input value={articleNumber} onChange={e => setArticleNumber(e.target.value)} placeholder="T.ex. ART-001" />
                  </div>
                  <div className="space-y-2">
                    <Label>Enhet</Label>
                    <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="st, tim, km" />
                  </div>
                  <div className="space-y-2">
                    <Label>Standardpris (kr)</Label>
                    <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Moms (%)</Label>
                    <Input type="number" step="1" value={vatRate} onChange={e => setVatRate(e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Avbryt</Button>
                  <Button type="submit">{editId ? 'Spara' : 'Skapa'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {!!articles?.length && (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Sök namn, beskrivning eller artikelnummer"
                className="pl-9"
              />
            </div>
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Alla enheter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla enheter</SelectItem>
                {unitOptions.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !articles?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Skapa din första artikel</p>
                <p className="text-sm mt-1 max-w-sm mx-auto">När du skapat dina vanligaste tjänster eller produkter kan du återanvända dem i alla uppdrag och fakturor.</p>
                <Button size="sm" className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Skapa artikel
                </Button>
              </div>
            ) : !filtered.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Inga artiklar matchar</p>
                <p className="text-sm mt-1">Prova att rensa sökning eller filter.</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={() => { setSearch(''); setUnitFilter('all'); }}>
                  Rensa filter
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('article_number')}>
                      Art.nr <SortIcon col="article_number" />
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                      Namn <SortIcon col="name" />
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('unit')}>
                      Enhet <SortIcon col="unit" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('default_price')}>
                      Pris <SortIcon col="default_price" />
                    </TableHead>
                    <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('vat_rate')}>
                      Moms <SortIcon col="vat_rate" />
                    </TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.article_number || '—'}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{a.name}</p>
                          {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell>{a.unit}</TableCell>
                      <TableCell className="text-right">{a.default_price} kr</TableCell>
                      <TableCell className="text-right">{a.vat_rate}%</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteArticle.mutate(a.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
