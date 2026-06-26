import { Check, Circle, Play, Truck } from 'lucide-react';

type Step = {
  key: 'assigned' | 'active' | 'completed';
  label: string;
  description: string;
  icon: typeof Circle;
};

const steps: Step[] = [
  { key: 'assigned', label: 'Tilldelat', description: 'Uppdraget är klart att starta', icon: Truck },
  { key: 'active', label: 'Pågår', description: 'Tid och position registreras', icon: Play },
  { key: 'completed', label: 'Slutfört', description: 'Underlaget är klart för admin', icon: Check },
];

const order = { assigned: 0, active: 1, completed: 2 } as const;

export function AssignmentProgress({ status }: { status: string }) {
  const current = status === 'completed' ? 2 : status === 'active' ? 1 : 0;

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="grid grid-cols-3 gap-1">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const done = index < current;
          const active = index === current;
          return (
            <div key={step.key} className="relative text-center">
              {index < steps.length - 1 && <div className={`absolute left-[55%] top-5 h-0.5 w-[90%] ${index < current ? 'bg-emerald-500' : 'bg-border'}`} />}
              <div className={`relative z-10 mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${done ? 'border-emerald-500 bg-emerald-500 text-white' : active ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'border-border bg-background text-muted-foreground'}`}>
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <p className={`mt-2 text-xs font-semibold ${done || active ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
              <p className="mt-0.5 hidden text-[10px] leading-tight text-muted-foreground sm:block">{step.description}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-center text-xs text-muted-foreground">
        {current === order.assigned && 'Öppna kartan och starta när du börjar köra.'}
        {current === order.active && 'Uppdraget är aktivt. Rapportera avvikelser direkt till admin.'}
        {current === order.completed && 'Klart – uppdraget är sparat som slutfört.'}
      </p>
    </div>
  );
}
