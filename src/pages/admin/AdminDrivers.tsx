import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDrivers, useAssignments, useDriverCompensations, useUpsertDriverCompensation } from '@/hooks/useData';
import { Plus, Trash2, DollarSign, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const COMP_LABELS: Record<string, string> = {
  hourly: 'Timbaserad',
  per_assignment: 'Per uppdrag',
  monthly: 'Månadslön',
};

function CompensationDialog({
  driverId,
  driverName,
  existing,
}: {
  driverId: string;
  driverName: string;
  existing?: any;
}) {
  const [open, setOpen] = useState(false);
  const [compType, setCompType] = useState<'hourly' | 'per_assignment' | 'monthly'>(
    existing?.compensation_type ?? 'hourly'
  );
  const [hourlyRate, setHourlyRate] = useState(String(existing?.hourly_rate ?? '0'));
  const [perAssignmentRate, setPerAssignmentRate] = useState(String(existing?.per_assignment_rate ?? '0'));
  const [monthlySalary, setMonthlySalary] = useState(String(existing?.monthly_salary ?? '0'));
  const [taxTable, setTaxTable] = useState(existing?.tax_table ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const upsert = useUpsertDriverCompensation();

  useEffect(() => {
    if (existing) {
      setCompType(existing.compensation_type ?? 'hourly');
      setHourlyRate(String(existing.hourly_rate ?? '0'));
      setPerAssignmentRate(String(existing.per_assignment_rate ?? '0'));
      setMonthlySalary(String(existing.monthly_salary ?? '0'));
      setTaxTable(existing.tax_table ?? '');
      setNotes(existing.notes ?? '');
    }
  }, [existing]);

  const handleSave = () => {
    upsert.mutate(
      {
        driver_id: driverId,
        compensation_type: compType,
        hourly_rate: parseFloat(hourlyRate) || 0,
        per_assignment_rate: parseFloat(perAssignmentRate) || 0,
        monthly_salary: parseFloat(monthlySalary) || 0,
        tax_table: taxTable || null,
        notes: notes || null,
      },
      {
        onSuccess: () => {
          toast.success(`Löneuppgifter sparade för ${driverName}`);
          setOpen(false);
        },
        onError: (err) => toast.error('Kunde inte spara: ' + err.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Löneuppgifter">
          <DollarSign className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Löneuppgifter – {driverName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ersättningstyp</Label>
            <Select value={compType} onValueChange={(v) => setCompType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Timbaserad (kr/timme)</SelectItem>
                <SelectItem value="per_assignment">Per uppdrag (kr/uppdrag)</SelectItem>
                <SelectItem value="monthly">Månadslön (kr/månad)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {compType === 'hourly' && (
            <div className="space-y-2">
              <Label>Timpris (kr)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          {compType === 'per_assignment' && (
            <div className="space-y-2">
              <Label>Pris per uppdrag (kr)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={perAssignmentRate}
                onChange={(e) => setPerAssignmentRate(e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          {compType === 'monthly' && (
            <div className="space-y-2">
              <Label>Månadslön (kr)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Skattetabell (valfritt)</Label>
            <Input
              value={taxTable}
              onChange={(e) => setTaxTable(e.target.value)}
              placeholder="T.ex. Tabell 30, kolumn 1"
            />
          </div>

          <div className="space-y-2">
            <Label>Anteckningar (valfritt)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Extra löneinfo, t.ex. ob-tillägg, bilersättning..."
              rows={3}
            />
          </div>

          <Button onClick={handleSave} className="w-full" disabled={upsert.isPending}>
            <Save className="h-4 w-4 mr-1" />
            {upsert.isPending ? 'Sparar...' : 'Spara löneuppgifter'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDrivers() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const { data: drivers, isLoading } = useDrivers();
  const { data: assignments } = useAssignments();
  const { data: compensations } = useDriverCompensations();
  const qc = useQueryClient();

  const getCompletedCount = (driverId: string) =>
    (assignments ?? []).filter(a => a.assigned_driver_id === driverId && a.status === 'completed').length;

  const getCompensation = (driverId: string) =>
    (compensations ?? []).find(c => c.driver_id === driverId);

  const formatCompensation = (comp: any) => {
    if (!comp) return null;
    switch (comp.compensation_type) {
      case 'hourly':
        return `${Number(comp.hourly_rate).toFixed(0)} kr/h`;
      case 'per_assignment':
        return `${Number(comp.per_assignment_rate).toFixed(0)} kr/uppdrag`;
      case 'monthly':
        return `${Number(comp.monthly_salary).toFixed(0)} kr/mån`;
      default:
        return null;
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('create-driver', {
        body: { email, full_name: name, password },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`Chaufför ${name} skapad!`);
      qc.invalidateQueries({ queryKey: ['drivers'] });
      setName('');
      setEmail('');
      setPassword('');
      setOpen(false);
    } catch (err: any) {
      toast.error('Kunde inte skapa chaufför: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout title="Chaufförshantering" description="Hantera chaufförskonton, löneuppgifter och prestationer">
      <div className="space-y-5 max-w-5xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chaufförer</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Ny chaufför
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lägg till ny chaufför</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateDriver} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="driverName">Namn</Label>
                  <Input id="driverName" placeholder="Förnamn Efternamn" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverEmail">E-post</Label>
                  <Input id="driverEmail" type="email" placeholder="namn@exempel.se" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driverPassword">Lösenord</Label>
                  <Input id="driverPassword" type="password" placeholder="Minst 6 tecken" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? 'Skapar...' : 'Skapa chaufförskonto'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="admin-table-card">
          <div className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namn</TableHead>
                  <TableHead>E-post</TableHead>
                  <TableHead>Ersättning</TableHead>
                  <TableHead className="text-center">Slutförda</TableHead>
                  <TableHead className="w-[100px]">Åtgärd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && [1, 2].map(i => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))}
                {(drivers ?? []).map(driver => {
                  const comp = getCompensation(driver.id);
                  const compLabel = formatCompensation(comp);
                  return (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{driver.email}</TableCell>
                      <TableCell>
                        {compLabel ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-normal">
                              {COMP_LABELS[comp.compensation_type]}
                            </Badge>
                            <span className="text-sm font-medium">{compLabel}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Ej angiven</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{getCompletedCount(driver.id)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <CompensationDialog
                            driverId={driver.id}
                            driverName={driver.full_name}
                            existing={comp}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => toast.info('Ta bort chaufför kräver admin-åtkomst')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!isLoading && (drivers ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Inga chaufförer</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
