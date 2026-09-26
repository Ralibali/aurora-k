import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Car, Database, MapPin, RefreshCw, Route, Satellite, ShieldCheck } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { summarizeTrips, summarizeVehicles, type FleetPoint, type VehicleLabel } from "@/lib/telematics";
import { toast } from "sonner";

type ProviderConnection = {
  provider: string;
  status: string;
  last_event_at: string | null;
  last_error: string | null;
};

type CompanyFleetSettings = {
  fleet_tracking_enabled: boolean;
  fleet_location_retention_days: number;
};

const formatDateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";

const formatKm = (value: number) => `${value.toLocaleString("sv-SE", { maximumFractionDigits: 1 })} km`;

export default function AdminTelematics() {
  const { companyId } = useAuth();
  const [days, setDays] = useState("7");
  const [points, setPoints] = useState<FleetPoint[]>([]);
  const [vehicles, setVehicles] = useState<VehicleLabel[]>([]);
  const [connections, setConnections] = useState<ProviderConnection[]>([]);
  const [settings, setSettings] = useState<CompanyFleetSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const since = new Date(Date.now() - Number(days) * 86_400_000).toISOString();

    const [historyResult, vehiclesResult, providerResult, companyResult] = await Promise.all([
      supabase
        .from("fleet_location_history")
        .select("vehicle_id,assignment_id,latitude,longitude,speed,source,recorded_at")
        .eq("company_id", companyId)
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true })
        .limit(10000),
      supabase
        .from("vehicles")
        .select("id,name,registration_number")
        .eq("company_id", companyId)
        .eq("active", true)
        .order("name"),
      supabase
        .from("fleet_provider_connections")
        .select("provider,status,last_event_at,last_error")
        .eq("company_id", companyId),
      supabase
        .from("companies")
        .select("fleet_tracking_enabled,fleet_location_retention_days")
        .eq("id", companyId)
        .single(),
    ]);

    const error = historyResult.error || vehiclesResult.error || providerResult.error || companyResult.error;
    if (error) {
      toast.error("Telematikdatan kunde inte hämtas.");
      console.error("[telematics]", error);
    } else {
      setPoints((historyResult.data ?? []) as FleetPoint[]);
      setVehicles((vehiclesResult.data ?? []) as VehicleLabel[]);
      setConnections((providerResult.data ?? []) as ProviderConnection[]);
      setSettings(companyResult.data as CompanyFleetSettings);
    }
    setLoading(false);
  }, [companyId, days]);

  useEffect(() => {
    void load();
  }, [load]);

  const vehicleSummary = useMemo(() => summarizeVehicles(points, vehicles), [points, vehicles]);
  const trips = useMemo(() => summarizeTrips(points, vehicles), [points, vehicles]);
  const trackedVehicleIds = new Set(vehicleSummary.map((row) => row.vehicleId));
  const totalKm = vehicleSummary.reduce((sum, vehicle) => sum + vehicle.distanceKm, 0);
  const traccar = connections.find((connection) => connection.provider === "traccar");

  const updateSettings = async (patch: Partial<CompanyFleetSettings>) => {
    if (!companyId || !settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    const { error } = await supabase.from("companies").update(patch).eq("id", companyId);
    if (error) {
      setSettings(settings);
      toast.error("Inställningen kunde inte sparas.");
      return;
    }
    toast.success("Telematikinställningen är sparad.");
  };

  return (
    <AdminLayout title="Telematik & körjournal">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              GPS-data från förarappen och externa Traccar-enheter, kopplad till fordon och uppdrag.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Körjournalen är beräknad från sparade positionspunkter och ska användas som operativt underlag.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Senaste dygnet</SelectItem>
                <SelectItem value="7">Senaste 7 dagar</SelectItem>
                <SelectItem value="30">Senaste 30 dagar</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Uppdatera
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Car} label="Aktiva fordon" value={String(vehicles.length)} detail={`${trackedVehicleIds.size} med GPS-data`} />
          <Metric icon={Route} label="Beräknad körsträcka" value={formatKm(totalKm)} detail={`${days} dagar`} />
          <Metric icon={Activity} label="Körjournalposter" value={String(trips.length)} detail={`${points.length.toLocaleString("sv-SE")} positionspunkter`} />
          <Metric
            icon={Satellite}
            label="Traccar"
            value={traccar?.status === "active" ? "Ansluten" : "Ej aktiv"}
            detail={traccar?.last_event_at ? `Senast ${formatDateTime(traccar.last_event_at)}` : "Förarappen fungerar utan Traccar"}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <Card>
            <CardHeader><CardTitle className="text-base">Fordonsstatus</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fordon</TableHead>
                    <TableHead>Källa</TableHead>
                    <TableHead>Senast sedd</TableHead>
                    <TableHead className="text-right">Sträcka</TableHead>
                    <TableHead className="text-right">Maxfart</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicleSummary.map((vehicle) => (
                    <TableRow key={vehicle.vehicleId}>
                      <TableCell>
                        <div className="font-medium">{vehicle.name}</div>
                        <div className="text-xs text-muted-foreground">{vehicle.registrationNumber ?? "Inget reg.nr"}</div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{vehicle.source}</Badge></TableCell>
                      <TableCell>{formatDateTime(vehicle.lastSeenAt)}</TableCell>
                      <TableCell className="text-right">{formatKm(vehicle.distanceKm)}</TableCell>
                      <TableCell className="text-right">{vehicle.maxSpeedKmh == null ? "—" : `${Math.round(vehicle.maxSpeedKmh)} km/h`}</TableCell>
                    </TableRow>
                  ))}
                  {!vehicleSummary.length && !loading ? (
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Ingen telematikdata i vald period.</TableCell></TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Integritet & lagring</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Positionsspårning</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Styr om företaget använder fleet tracking.</p>
                </div>
                <Switch
                  checked={settings?.fleet_tracking_enabled ?? false}
                  onCheckedChange={(checked) => void updateSettings({ fleet_tracking_enabled: checked })}
                  disabled={!settings}
                />
              </div>
              <div className="space-y-2">
                <Label>Lagra positionshistorik</Label>
                <Select
                  value={String(settings?.fleet_location_retention_days ?? 90)}
                  onValueChange={(value) => void updateSettings({ fleet_location_retention_days: Number(value) })}
                  disabled={!settings}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 dagar</SelectItem>
                    <SelectItem value="90">90 dagar</SelectItem>
                    <SelectItem value="180">180 dagar</SelectItem>
                    <SelectItem value="365">365 dagar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                <div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Spårning är knuten till aktiva uppdrag. Leverantörshemligheter lagras server-side, inte i webbläsaren.</div>
              </div>
              {traccar?.last_error ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{traccar.last_error}</div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4" /> Körjournal per uppdrag</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fordon</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Slut</TableHead>
                  <TableHead>Uppdrag</TableHead>
                  <TableHead className="text-right">GPS-punkter</TableHead>
                  <TableHead className="text-right">Sträcka</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.slice(0, 100).map((trip) => (
                  <TableRow key={`${trip.assignmentId}-${trip.vehicleId}`}>
                    <TableCell className="font-medium">{trip.vehicleName}</TableCell>
                    <TableCell>{formatDateTime(trip.startedAt)}</TableCell>
                    <TableCell>{formatDateTime(trip.endedAt)}</TableCell>
                    <TableCell className="font-mono text-xs">{trip.assignmentId.slice(0, 8)}</TableCell>
                    <TableCell className="text-right">{trip.points}</TableCell>
                    <TableCell className="text-right">{formatKm(trip.distanceKm)}</TableCell>
                  </TableRow>
                ))}
                {!trips.length && !loading ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground"><MapPin className="mx-auto mb-2 h-5 w-5 opacity-40" />Körjournal skapas när positioner kopplas till aktiva uppdrag.</TableCell></TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Car; label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}
