import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useArticles, useCreateArticle, useUpdateArticle, useDeleteArticle } from '@/hooks/useNewFeatures';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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

  const resetForm = () => {
    setEditId(null); setName(''); setDescription(''); setUnit('st'); setPrice(''); setArticleNumber(''); setVatRate('0');
  };

  const openEdit = (a: any) => {
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
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">Hantera artiklar med priser för uppdrag och fakturering.</p>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ny artikel</Button>
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

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !articles?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Inga artiklar ännu</p>
                <p className="text-sm">Skapa din första artikel för att komma igång.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Art.nr</TableHead>
                    <TableHead>Namn</TableHead>
                    <TableHead>Enhet</TableHead>
                    <TableHead className="text-right">Pris</TableHead>
                    <TableHead className="text-right">Moms</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map(a => (
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
