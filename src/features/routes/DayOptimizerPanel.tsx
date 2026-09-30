import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  Clock,
  Gauge,
  Route,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAssignments, useDrivers } from "@/hooks/useData";
import {
  getStockholmDateKey,
} from "@/features/dispatch/dispatch-utils";
import {
  approveDayRoutePlan,
  listRecentRoutePlans,
  optimizeDayRoutes,
  type DayRoutePlan,
  type RoutePlanHistoryItem,
} from "./day-route-api";
import { aggregateRoutePlanRoi, routePlanSavings } from "./route-roi";
import {
  savedDistancePercent,
  savedDurationPercent,
  savedDurationSeconds,
} from "./route-metrics";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const kilometers = (meters: number | null) =>
  meters == null ? "Ej mätt" : `${(meters / 1_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} km`;

const duration = (seconds: number) => {
  if (seconds <= 0) return "0 min";
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${minutes} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};

export function DayOptimizerPanel() {
  const queryClient = useQueryClient();
  const { data: assignments } = useAssignments();
  const { data: drivers } = useDrivers();
  const [selectedDate, setSelectedDate] = useState(() => getStockholmDateKey());
  const [result, setResult] = useState<DayRoutePlan | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [history, setHistory] = useState<RoutePlanHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let active = true;
    void listRecentRoutePlans()
      .then((rows) => {
        if (!active) return;
        setHistory(rows);
        setHistoryError("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setHistoryError(
          error instanceof Error ? error.message : "Historiken kunde inte hämtas.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const dayAssignments = useMemo(
    () =>
      (assignments ?? []).filter(
        (item) =>
          getStockholmDateKey(item.scheduled_start) === selectedDate &&
          ["pending", "unassigned"].includes(item.status),
      ),
    [assignments, selectedDate],
  );
  const availableDrivers = (drivers ?? []).filter(
    (driver) => driver.is_available !== false,
  );
  const assignmentById = new Map(
    (assignments ?? []).map((item) => [item.id, item]),
  );
  const driverById = new Map((drivers ?? []).map((item) => [item.id, item]));
  const groupedStops =
    result?.stops.reduce<Record<string, typeof result.stops>>(
      (groups, stop) => {
        (groups[stop.driverId] ??= []).push(stop);
        return groups;
      },
      {},
    ) ?? {};

  const optimize = async () => {
    setOptimizing(true);
    try {
      setResult(await optimizeDayRoutes(selectedDate));
      toast.success(
        "Ett nytt dagsförslag är klart. Granska innan du godkänner.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Dagen kunde inte optimeras.",
      );
    } finally {
      setOptimizing(false);
    }
  };

  const approve = async () => {
    if (!result) return;
    setApproving(true);
    try {
      await approveDayRoutePlan(result.plan.id);
      setResult({ ...result, plan: { ...result.plan, status: "approved" } });
      await queryClient.invalidateQueries({ queryKey: ["assignments"] });
      setHistory(await listRecentRoutePlans());
      toast.success(
        "Rutterna är godkända och skickade till chaufförernas körordning.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Ruttplanen kunde inte godkännas.",
      );
    } finally {
      setApproving(false);
    }
  };

  const historyRoi = useMemo(() => aggregateRoutePlanRoi(history), [history]);

  const distanceSavings = result
    ? savedDistancePercent(
        result.plan.distance_before_m,
        result.plan.distance_after_m,
      )
    : 0;
  const timeSaved = result
    ? savedDurationSeconds(
        result.plan.duration_before_s,
        result.plan.duration_after_s,
      )
    : 0;
  const timeSavings = result
    ? savedDurationPercent(
        result.plan.duration_before_s,
        result.plan.duration_after_s,
      )
    : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary">Ingår i Aurora Transport</Badge>
            <Badge variant="outline">
              {result?.plan.optimizer_provider === "vroom" ? "VROOM" : "Aurora"}
            </Badge>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Optimera hela dagen
          </CardTitle>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Fördela ej påbörjade jobb mellan tillgängliga chaufförer utifrån
            koordinater, kapacitet, kompetens och tidsfönster. Ruttoptimeringen
            är en ordinarie del av Aurora Transport och inget ändras innan du
            godkänner förslaget.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-sm font-medium">
            <span className="block">Datum</span>
            <input
              type="date"
              value={selectedDate}
              disabled={optimizing || approving}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setResult(null);
              }}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <Button
            onClick={optimize}
            disabled={
              optimizing || approving ||
              dayAssignments.length === 0 ||
              availableDrivers.length === 0
            }
          >
            <Sparkles className="mr-1 h-4 w-4" />{" "}
            {optimizing ? "Optimerar…" : "Optimera dagen"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs text-muted-foreground">Öppna jobb</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <Route className="h-5 w-5 text-primary" /> {dayAssignments.length}
            </p>
          </div>
          <div className="rounded-xl border bg-background/70 p-4">
            <p className="text-xs text-muted-foreground">
              Tillgängliga chaufförer
            </p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <Users className="h-5 w-5 text-primary" />{" "}
              {availableDrivers.length}
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-background/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                SmartPlan · bevisad effekt
              </p>
              <h3 className="mt-1 font-semibold">Senaste godkända planerna</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Besparing räknas bara när både före- och eftervärden är jämförbara. VROOM-planer utan
                jämförbar baslinje visas i historiken men får ingen påhittad procentsiffra.
              </p>
            </div>
            <Badge variant="outline">{historyRoi.acceptedPlans} accepterade</Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Jämförbara planer</p>
              <p className="mt-1 text-xl font-bold">{historyRoi.comparablePlans}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Summerad sparad sträcka</p>
              <p className="mt-1 text-xl font-bold">{kilometers(historyRoi.totalDistanceSavedM)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Summerad beräknad tidsvinst</p>
              <p className="mt-1 text-xl font-bold">{duration(historyRoi.totalDurationSavedS)}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Accepterade VROOM-planer</p>
              <p className="mt-1 text-xl font-bold">{historyRoi.vroomPlans}</p>
            </div>
          </div>

          {historyError ? (
            <p role="alert" className="mt-3 text-xs text-destructive">{historyError}</p>
          ) : history.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Datum</th>
                    <th className="pb-2 pr-3 font-medium">Motor</th>
                    <th className="pb-2 pr-3 font-medium">Status</th>
                    <th className="pb-2 pr-3 font-medium">Sparad sträcka</th>
                    <th className="pb-2 font-medium">Tidsvinst</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 8).map((plan) => {
                    const savings = routePlanSavings(plan);
                    return (
                      <tr key={plan.id} className="border-t">
                        <td className="py-2 pr-3">{plan.plan_date}</td>
                        <td className="py-2 pr-3">{plan.optimizer_provider === "vroom" ? "VROOM" : "Aurora"}</td>
                        <td className="py-2 pr-3">{plan.status}</td>
                        <td className="py-2 pr-3">
                          {savings.comparableDistance ? kilometers(savings.distanceSavedM) : "Ej jämförbar"}
                        </td>
                        <td className="py-2">
                          {savings.comparableDuration ? duration(savings.durationSavedS) : "Ej jämförbar"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Ingen ruttplanhistorik ännu. Optimera och godkänn en dag för att börja mäta effekten.
            </p>
          )}
        </div>

        {result && (
          <>
            {result.plan.warning && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Beräkningsunderlag</AlertTitle>
                <AlertDescription>{result.plan.warning}</AlertDescription>
              </Alert>
            )}
            {result.unassignedIds.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {result.unassignedIds.length} jobb kunde inte fördelas
                </AlertTitle>
                <AlertDescription>
                  Kontrollera koordinater, kapacitet, kompetenser och
                  tillgängliga chaufförer före godkännande.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Körsträcka före</p>
                <p className="text-xl font-bold">
                  {kilometers(result.plan.distance_before_m)}
                </p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">Optimerat förslag</p>
                <p className="text-xl font-bold">
                  {kilometers(result.plan.distance_after_m)}
                </p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs text-muted-foreground">
                  Minskad körsträcka
                </p>
                <p className="flex items-center gap-2 text-xl font-bold text-primary">
                  <Gauge className="h-5 w-5" /> {result.plan.distance_before_m == null ? "Ej jämförbart" : `${distanceSavings}%`}
                </p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs text-muted-foreground">Beräknad tidsvinst</p>
                <p className="flex items-center gap-2 text-xl font-bold text-primary">
                  <Clock className="h-5 w-5" /> {result.plan.duration_before_s == null ? "Ej jämförbart" : duration(timeSaved)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {result.plan.duration_before_s == null ? "Jämförbar baslinje saknas" : timeSavings > 0 ? `${timeSavings}% kortare beräknad körtid` : "Ingen beräknad tidsvinst"}
                </p>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {Object.entries(groupedStops).map(([driverId, stops]) => (
                <div key={driverId} className="rounded-xl border p-4">
                  <h3 className="font-semibold">
                    {driverById.get(driverId)?.full_name ?? "Chaufför"}{" "}
                    <Badge variant="secondary" className="ml-1">
                      {stops.length} stopp
                    </Badge>
                  </h3>
                  <div className="mt-3 space-y-2">
                    {[...stops]
                      .sort((a, b) => a.sequence - b.sequence)
                      .map((stop) => {
                        const assignment = assignmentById.get(
                          stop.assignmentId,
                        );
                        return (
                          <div
                            key={stop.assignmentId}
                            className="flex gap-3 rounded-lg bg-muted/40 p-3"
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                              {stop.sequence}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {assignment?.title ?? stop.assignmentId}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {assignment?.address}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ETA{" "}
                                {stop.arrivalAt
                                  ? new Date(stop.arrivalAt).toLocaleTimeString(
                                      "sv-SE",
                                      { hour: "2-digit", minute: "2-digit" },
                                    )
                                  : "saknas"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              {result.plan.status === "approved" ? (
                <Badge className="gap-1 px-3 py-2">
                  <Check className="h-4 w-4" /> Godkänd och skickad
                </Badge>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={optimizing || approving || result.stops.length === 0}>
                      <Check className="mr-1 h-4 w-4" /> Godkänn och skicka
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Skicka den nya körordningen?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Det här byter chaufför, ordning och planerad ETA på{" "}
                        {result.stops.length} jobb. Tidigare godkänd plan för
                        dagen ersätts.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction onClick={approve}>
                        {approving ? "Skickar…" : "Godkänn"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
