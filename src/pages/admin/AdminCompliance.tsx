import { useMemo, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, ShieldCheck, AlertTriangle, FileWarning, Car } from 'lucide-react';
import { toast } from 'sonner';
import { useDrivers } from '@/hooks/useData';
import { useVehicles } from '@/hooks/useNewFeatures';
import {
  DRIVER_DOC_TYPES,
  MAINTENANCE_TYPES,
  daysUntil,
  expiryStatus,
  useCreateDriverDocument,
  useCreateVehicleMaintenance,
  useDeleteDriverDocument,
  useDeleteVehicleMaintenance,
  useDriverDocuments,
  useVehicleMaintenance,
  type ExpiryStatus,
} from '@/hooks/useCompliance';

const statusConfig: Record<ExpiryStatus, { label: (days: number | null) => string; className: string }> = {
  expired: {
    label: (days) => (days !== null ? `Utgånget (${Math.abs(days)} dgr sedan)` : 'Utgånget'),
    className: 'bg-red-500/15 text-red-700 border-red-500/30',
  },
  warning: {
    label: (days) => (days !== null ? `${days} dagar kvar` : 'Går ut snart'),
    className: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  },
  ok: {
    label: () => 'Giltigt',
    className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  },
  none: {
    label: () => 'Inget datum',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

function ExpiryBadge({ date }: { date: string | null }) {
  const status = expiryStatus(date);
  const days = daysUntil(date);
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={config.className}>
      {config.label(days)}
    </Badge>
  );
}

const docTypeLabel = (value: string) => DRIVER_DOC_TYPES.find((t) => t.value === value)?.label ?? value;
const maintenanceTypeLabel = (value: string) => MAINTENANCE_TYPES.find((t) => t.value === value)?.label ?? value;

export default function AdminCompliance() {
  const { data: documents, isLoading: docsLoading } = useDriverDocuments();
  const { data: maintenance, isLoading: maintLoading } = useVehicleMaintenance();
  const { data: drivers } = useDrivers();
  const { data: vehicles } = useVehicles();

  const createDocument = useCreateDriverDocument();
  const deleteDocument = useDeleteDriverDocument();
  const createMaintenance = useCreateVehicleMaintenance();
  const deleteMaintenance = useDeleteVehicleMaintenance();

  // Dokument-formulär
  const [docOpen, setDocOpen] = useState(false);
  const [docDriverId, setDocDriverId] = useState('');
  const [docType, setDocType] = useState('korkort');
  const [docLabel, setDocLabel] = useState('');
  const [docExpires, setDocExpires] = useState('');
  const [docNotes, setDocNotes] = useState('');

  // Underhålls-formulär
  const [maintOpen, setMaintOpen] = useState(false);
  const [maintVehicleId, setMaintVehicleId] = useState('');
  const [maintType, setMaintType] = useState('besiktning');
  const [maintDueDate, setMaintDueDate] = useState('');
  const [maintOdometer, setMaintOdometer] = useState('');
  const [maintNotes, setMaintNotes] = useState('');

  const stats = useMemo(() => {
    const count = (dates: (string | null)[]) =>
      dates.reduce(
        (acc, date) => {
          const status = expiryStatus(date);
          if (status === 'expired') acc.expired += 1;
          if (status === 'warning') acc.warning += 1;
          return acc;
        },
        { expired: 0, warning: 0 }
      );
    const docStats = count((documents ?? []).map((d) => d.expires_at));
    const maintStats = count((maintenance ?? []).map((m) => m.due_date));
    return { expired: docStats.expired + maintStats.expired, warning: docStats.warning + maintStats.warning };
  }, [documents, maintenance]);

  // Förare utan registrerat körkort — compliance-risk många åkerier missar
  const driversWithoutLicense = useMemo(() => {
    const withLicense = new Set((documents ?? []).filter((d) => d.doc_type === 'korkort').map((d) => d.driver_id));
    return (drivers ?? []).filter((driver) => !withLicense.has(driver.id));
  }, [documents, drivers]);

  const submitDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docDriverId) {
      toast.error('Välj förare');
      return;
    }
    createDocument.mutate(
      {
        driver_id: docDriverId,
        doc_type: docType,
        label: docLabel || null,
        expires_at: docExpires || null,
        notes: docNotes || null,
      },
      {
        onSuccess: () => {
          setDocOpen(false);
          setDocDriverId('');
          setDocType('korkort');
          setDocLabel('');
          setDocExpires('');
          setDocNotes('');
        },
      }
    );
  };

  const submitMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintVehicleId) {
      toast.error('Välj fordon');
      return;
    }
    createMaintenance.mutate(
      {
        vehicle_id: maintVehicleId,
        type: maintType,
        due_date: maintDueDate || null,
        due_odometer_km: maintOdometer ? parseInt(maintOdometer, 10) : null,
        notes: maintNotes || null,
      },
      {
        onSuccess: () => {
          setMaintOpen(false);
          setMaintVehicleId('');
          setMaintType('besiktning');
          setMaintDueDate('');
          setMaintOdometer('');
          setMaintNotes('');
        },
      }
    );
  };

  return (
    <AdminLayout title="Efterlevnad">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dokument & underhåll</h1>
            <p className="text-muted-foreground text-sm">
              Körkort, ADR-intyg, besiktningar och service — med automatiska varningar innan något går ut.
            </p>
          </div>
          <div className="flex gap-2">
            {stats.expired > 0 && (
              <Badge variant="outline" className="bg-red-500/15 text-red-700 border-red-500/30">
                <AlertTriangle className="mr-1 h-3 w-3" /> {stats.expired} utgångna
              </Badge>
            )}
            {stats.warning > 0 && (
              <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-500/30">
                <FileWarning className="mr-1 h-3 w-3" /> {stats.warning} går ut inom 30 dagar
              </Badge>
            )}
            {stats.expired === 0 && stats.warning === 0 && (
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                <ShieldCheck className="mr-1 h-3 w-3" /> Allt giltigt
              </Badge>
            )}
          </div>
        </div>

        {driversWithoutLicense.length > 0 && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="flex items-start gap-3 pt-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Körkort saknas registrerat</p>
                <p className="text-sm text-muted-foreground">
                  {driversWithoutLicense.map((d) => d.full_name).join(', ')} har inget körkort dokumenterat.
                  Lägg till det under fliken Förardokument.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="documents">
          <TabsList>
            <TabsTrigger value="documents">Förardokument</TabsTrigger>
            <TabsTrigger value="maintenance">Fordonsunderhåll</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={docOpen} onOpenChange={setDocOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-1 h-4 w-4" /> Lägg till dokument
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nytt förardokument</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={submitDocument} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Förare</Label>
                      <Select value={docDriverId} onValueChange={setDocDriverId}>
                        <SelectTrigger><SelectValue placeholder="Välj förare" /></SelectTrigger>
                        <SelectContent>
                          {(drivers ?? []).map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>{driver.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Dokumenttyp</Label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DRIVER_DOC_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Beteckning (valfritt)</Label>
                      <Input value={docLabel} onChange={(e) => setDocLabel(e.target.value)} placeholder="T.ex. ADR klass 1" />
                    </div>
                    <div className="space-y-2">
                      <Label>Utgångsdatum</Label>
                      <Input type="date" value={docExpires} onChange={(e) => setDocExpires(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Anteckningar (valfritt)</Label>
                      <Input value={docNotes} onChange={(e) => setDocNotes(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={createDocument.isPending}>
                      Spara dokument
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                {docsLoading ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (documents ?? []).length === 0 ? (
                  <p className="p-8 text-center text-muted-foreground text-sm">
                    Inga dokument ännu. Lägg till körkort, ADR-intyg eller förarbevis för att få varningar innan de går ut.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Förare</TableHead>
                        <TableHead>Typ</TableHead>
                        <TableHead>Beteckning</TableHead>
                        <TableHead>Utgångsdatum</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(documents ?? []).map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.driver?.full_name ?? '—'}</TableCell>
                          <TableCell>{docTypeLabel(doc.doc_type)}</TableCell>
                          <TableCell className="text-muted-foreground">{doc.label || '—'}</TableCell>
                          <TableCell>{doc.expires_at ?? '—'}</TableCell>
                          <TableCell><ExpiryBadge date={doc.expires_at} /></TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => deleteDocument.mutate(doc.id)}>
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
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

          <TabsContent value="maintenance" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-1 h-4 w-4" /> Lägg till underhåll
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nytt fordonsunderhåll</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={submitMaintenance} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Fordon</Label>
                      <Select value={maintVehicleId} onValueChange={setMaintVehicleId}>
                        <SelectTrigger><SelectValue placeholder="Välj fordon" /></SelectTrigger>
                        <SelectContent>
                          {(vehicles ?? []).map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.name}{vehicle.registration_number ? ` (${vehicle.registration_number})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Typ</Label>
                      <Select value={maintType} onValueChange={setMaintType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MAINTENANCE_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Förfallodatum</Label>
                      <Input type="date" value={maintDueDate} onChange={(e) => setMaintDueDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Mätarställning, km (valfritt)</Label>
                      <Input type="number" value={maintOdometer} onChange={(e) => setMaintOdometer(e.target.value)} placeholder="T.ex. 120000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Anteckningar (valfritt)</Label>
                      <Input value={maintNotes} onChange={(e) => setMaintNotes(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={createMaintenance.isPending}>
                      Spara underhåll
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                {maintLoading ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (maintenance ?? []).length === 0 ? (
                  <p className="p-8 text-center text-muted-foreground text-sm">
                    <Car className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                    Inget underhåll registrerat. Lägg till besiktning eller service så får du varning i god tid.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fordon</TableHead>
                        <TableHead>Typ</TableHead>
                        <TableHead>Förfallodatum</TableHead>
                        <TableHead>Vid mätarställning</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(maintenance ?? []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.vehicle?.name ?? '—'}
                            {item.vehicle?.registration_number && (
                              <span className="ml-1 text-muted-foreground text-xs">({item.vehicle.registration_number})</span>
                            )}
                          </TableCell>
                          <TableCell>{maintenanceTypeLabel(item.type)}</TableCell>
                          <TableCell>{item.due_date ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.due_odometer_km ? `${item.due_odometer_km.toLocaleString('sv-SE')} km` : '—'}
                          </TableCell>
                          <TableCell><ExpiryBadge date={item.due_date} /></TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => deleteMaintenance.mutate(item.id)}>
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
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
