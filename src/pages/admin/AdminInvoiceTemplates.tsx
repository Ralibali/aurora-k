import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useInvoiceTemplates, useCreateInvoiceTemplate, useUpdateInvoiceTemplate, useDeleteInvoiceTemplate } from '@/hooks/useAllFeatures';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminInvoiceTemplates() {
  const { data: templates, isLoading } = useInvoiceTemplates();
  const create = useCreateInvoiceTemplate();
  const update = useUpdateInvoiceTemplate();
  const del = useDeleteInvoiceTemplate();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [headerHtml, setHeaderHtml] = useState('');
  const [footerHtml, setFooterHtml] = useState('');
  const [color, setColor] = useState('#1a1a2e');
  const [showLogo, setShowLogo] = useState(true);
  const [showBank, setShowBank] = useState(true);

  const reset = () => { setEditId(null); setName(''); setHeaderHtml(''); setFooterHtml(''); setColor('#1a1a2e'); setShowLogo(true); setShowBank(true); };
  const openEdit = (t: any) => { setEditId(t.id); setName(t.name); setHeaderHtml(t.header_html || ''); setFooterHtml(t.footer_html || ''); setColor(t.primary_color); setShowLogo(t.show_logo); setShowBank(t.show_bank_details); setOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, header_html: headerHtml || null, footer_html: footerHtml || null, primary_color: color, show_logo: showLogo, show_bank_details: showBank };
    if (editId) update.mutate({ id: editId, ...payload }, { onSuccess: () => { setOpen(false); reset(); } });
    else create.mutate(payload, { onSuccess: () => { setOpen(false); reset(); } });
  };

  return (
    <AdminLayout title="Fakturamallar">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">Anpassa utseendet på dina fakturor.</p>
          <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ny mall</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editId ? 'Redigera mall' : 'Ny fakturamall'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Namn *</Label><Input value={name} onChange={e => setName(e.target.value)} required placeholder="T.ex. Standard" /></div>
                <div className="space-y-2"><Label>Sidhuvud (HTML)</Label><Textarea value={headerHtml} onChange={e => setHeaderHtml(e.target.value)} placeholder="<p>Tack för ert förtroende</p>" rows={3} /></div>
                <div className="space-y-2"><Label>Sidfot (HTML)</Label><Textarea value={footerHtml} onChange={e => setFooterHtml(e.target.value)} placeholder="<p>Betalningsvillkor...</p>" rows={3} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Primärfärg</Label><Input type="color" value={color} onChange={e => setColor(e.target.value)} /></div>
                </div>
                <div className="flex items-center justify-between"><Label>Visa logotyp</Label><Switch checked={showLogo} onCheckedChange={setShowLogo} /></div>
                <div className="flex items-center justify-between"><Label>Visa bankuppgifter</Label><Switch checked={showBank} onCheckedChange={setShowBank} /></div>
                <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>Avbryt</Button><Button type="submit">{editId ? 'Spara' : 'Skapa'}</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Card><CardContent className="p-0">
          {isLoading ? <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div> :
          !templates?.length ? <div className="text-center py-12 text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>Inga fakturamallar</p></div> :
          <Table><TableHeader><TableRow><TableHead>Namn</TableHead><TableHead>Färg</TableHead><TableHead>Logotyp</TableHead><TableHead>Bank</TableHead><TableHead className="w-[100px]" /></TableRow></TableHeader>
            <TableBody>{templates.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}{t.is_default && <Badge variant="secondary" className="ml-2 text-xs">Standard</Badge>}</TableCell>
                <TableCell><div className="h-5 w-5 rounded border" style={{ backgroundColor: t.primary_color }} /></TableCell>
                <TableCell>{t.show_logo ? '✓' : '—'}</TableCell>
                <TableCell>{t.show_bank_details ? '✓' : '—'}</TableCell>
                <TableCell><div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(t.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>}
        </CardContent></Card>
      </div>
    </AdminLayout>
  );
}
