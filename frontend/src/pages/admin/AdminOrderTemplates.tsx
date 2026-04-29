import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useOrderTemplates, useCreateOrderTemplate, useDeleteOrderTemplate } from '@/hooks/useNewFeatures';
import { Plus, Trash2, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminOrderTemplates() {
  const { data: templates, isLoading } = useOrderTemplates();
  const createTemplate = useCreateOrderTemplate();
  const deleteTemplate = useDeleteOrderTemplate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTemplate.mutate({ name, description: description || null, template_data: {} }, {
      onSuccess: () => { setDialogOpen(false); setName(''); setDescription(''); },
    });
  };

  return (
    <AdminLayout title="Beställningsmallar">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">Standardiserade arbetsflöden för återkommande beställningar.</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ny mall</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ny beställningsmall</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Namn *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} required placeholder="T.ex. Månadsservice" />
                </div>
                <div className="space-y-2">
                  <Label>Beskrivning</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Beskriv arbetsflödet" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Avbryt</Button>
                  <Button type="submit">Skapa</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !templates?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Inga mallar ännu</p>
                <p className="text-sm">Skapa mallar för att effektivisera ditt arbetsflöde.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Namn</TableHead>
                    <TableHead>Beskrivning</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{t.description || '—'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteTemplate.mutate(t.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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
