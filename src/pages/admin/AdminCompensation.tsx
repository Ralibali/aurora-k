import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  useObRates, useCreateObRate, useUpdateObRate, useDeleteObRate,
  usePerDiemRates, useCreatePerDiemRate, useUpdatePerDiemRate, useDeletePerDiemRate,
} from '@/hooks/useNewFeatures';
import { Plus, Moon, Briefcase, Trash2 } from 'lucide-react';

export default function AdminCompensation() {
  const { data: obRates, isLoading: obLoading } = useObRates();
  const createOb = useCreateObRate();
  const deleteOb = useDeleteObRate();
  const { data: perDiemRates, isLoading: pdLoading } = usePerDiemRates();
  const createPd = useCreatePerDiemRate();
  const deletePd = useDeletePerDiemRate();

  const [obDialog, setObDialog] = useState(false);
  const [obName, setObName] = useState('');
  const [obRate, setObRate] = useState('');
  const [obStart, setObStart] = useState('18:00');
  const [obEnd, setObEnd] = useState('06:00');
  const [obWeekday, setObWeekday] = useState(true);
  const [obSat, setObSat] = useState(false);
  const [obSun, setObSun] = useState(false);

  const [pdDialog, setPdDialog] = useState(false);
  const [pdName, setPdName] = useState('');
  const [pdAmount, setPdAmount] = useState('');
  const [pdMinHours, setPdMinHours] = useState('10');
  const [pdType, setPdType] = useState('full_day');

  const handleCreateOb = (e: React.FormEvent) => {
    e.preventDefault();
    createOb.mutate({
      name: obName,
      rate_per_hour: parseFloat(obRate) || 0,
      start_time: obStart,
      end_time: obEnd,
      applies_to_weekdays: obWeekday,
      applies_to_saturdays: obSat,
      applies_to_sundays: obSun,
    }, {
      onSuccess: () => { setObDialog(false); setObName(''); setObRate(''); },
    });
  };

  const handleCreatePd = (e: React.FormEvent) => {
    e.preventDefault();
    createPd.mutate({
      name: pdName,
      type: pdType,
      amount: parseFloat(pdAmount) || 0,
      min_hours: parseFloat(pdMinHours) || 10,
    }, {
      onSuccess: () => { setPdDialog(false); setPdName(''); setPdAmount(''); },
    });
  };

  return (
    <AdminLayout title="OB & Traktamente" description="Hantera OB-tillägg och traktamenten för chaufförer">
      <div className="max-w-3xl space-y-6">
        <Tabs defaultValue="ob">
          <TabsList className="mb-4">
            <TabsTrigger value="ob" className="gap-1.5"><Moon className="h-3.5 w-3.5" /> OB-tillägg</TabsTrigger>
            <TabsTrigger value="perdiem" className="gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Traktamente</TabsTrigger>
          </TabsList>

          <TabsContent value="ob" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Definiera OB-scheman för obekväm arbetstid.</p>
              <Dialog open={obDialog} onOpenChange={setObDialog}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nytt OB-schema</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nytt OB-tillägg</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreateOb} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Namn *</Label>
                      <Input value={obName} onChange={e => setObName(e.target.value)} required placeholder="T.ex. Kväll vardag" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tillägg per timme (kr) *</Label>
                      <Input type="number" step="0.01" value={obRate} onChange={e => setObRate(e.target.value)} required placeholder="75" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Starttid</Label>
                        <Input type="time" value={obStart} onChange={e => setObStart(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Sluttid</Label>
                        <Input type="time" value={obEnd} onChange={e => setObEnd(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label>Gäller för</Label>
                      <div className="flex items-center gap-3">
                        <Switch checked={obWeekday} onCheckedChange={setObWeekday} />
                        <span className="text-sm">Vardagar</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={obSat} onCheckedChange={setObSat} />
                        <span className="text-sm">Lördagar</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={obSun} onCheckedChange={setObSun} />
                        <span className="text-sm">Sön- & helgdagar</span>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setObDialog(false)}>Avbryt</Button>
                      <Button type="submit" disabled={createOb.isPending}>Skapa</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                {obLoading ? (
                  <div className="p-6 space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : !obRates?.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Moon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>Inga OB-scheman definierade</p>
                    <p className="text-sm">Skapa ett schema för att beräkna OB-tillägg automatiskt.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Namn</TableHead>
                        <TableHead>Tid</TableHead>
                        <TableHead className="text-right">Kr/h</TableHead>
                        <TableHead>Gäller</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {obRates.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="font-mono text-xs">{r.start_time?.slice(0,5)}–{r.end_time?.slice(0,5)}</TableCell>
                          <TableCell className="text-right font-mono">{r.rate_per_hour} kr</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {r.applies_to_weekdays && <Badge variant="secondary" className="text-[10px]">Vardag</Badge>}
                              {r.applies_to_saturdays && <Badge variant="secondary" className="text-[10px]">Lör</Badge>}
                              {r.applies_to_sundays && <Badge variant="secondary" className="text-[10px]">Sön</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteOb.mutate(r.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="perdiem" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Definiera traktamentsnivåer baserat på uppdragslängd.</p>
              <Dialog open={pdDialog} onOpenChange={setPdDialog}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nytt traktamente</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nytt traktamente</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreatePd} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Namn *</Label>
                      <Input value={pdName} onChange={e => setPdName(e.target.value)} required placeholder="T.ex. Heldagstraktamente" />
                    </div>
                    <div className="space-y-2">
                      <Label>Belopp (kr) *</Label>
                      <Input type="number" step="0.01" value={pdAmount} onChange={e => setPdAmount(e.target.value)} required placeholder="260" />
                    </div>
                    <div className="space-y-2">
                      <Label>Minsta antal timmar</Label>
                      <Input type="number" step="0.5" value={pdMinHours} onChange={e => setPdMinHours(e.target.value)} placeholder="10" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setPdDialog(false)}>Avbryt</Button>
                      <Button type="submit" disabled={createPd.isPending}>Skapa</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                {pdLoading ? (
                  <div className="p-6 space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : !perDiemRates?.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>Inga traktamentsnivåer definierade</p>
                    <p className="text-sm">Skapa nivåer för att beräkna traktamente automatiskt.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Namn</TableHead>
                        <TableHead className="text-right">Belopp</TableHead>
                        <TableHead className="text-right">Min timmar</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {perDiemRates.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="text-right font-mono">{r.amount} kr</TableCell>
                          <TableCell className="text-right font-mono">{r.min_hours}h</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deletePd.mutate(r.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
