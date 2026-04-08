import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAssignments, useDrivers } from '@/hooks/useData';

export function OnboardingChecklist() {
  const { data: drivers } = useDrivers();
  const { data: assignments } = useAssignments();

  const steps = [
    { label: 'Konto och betalning klart', done: true, link: undefined, cta: undefined },
    { label: 'Lägg till en förare', done: (drivers?.length ?? 0) > 0, link: '/admin/drivers', cta: 'Lägg till förare' },
    { label: 'Skapa ditt första uppdrag', done: (assignments?.length ?? 0) > 0, link: '/admin/assignments/new', cta: 'Skapa uppdrag' },
  ];

  const allDone = steps.every(s => s.done);
  if (allDone) return null;

  const progress = steps.filter(s => s.done).length;

  return (
    <Card className="p-5 border-primary/20 bg-primary/5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground text-sm">Kom igång med Aurora Transport</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{progress} av {steps.length} steg klara</p>
        </div>
        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${(progress / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className={`flex items-center gap-3 ${step.done ? 'opacity-50' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${step.done ? 'bg-green-500' : 'bg-muted border-2 border-border'}`}>
              {step.done && <Check className="h-3.5 w-3.5 text-white" />}
            </div>
            <span className={`text-sm flex-1 ${step.done ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}>
              {step.label}
            </span>
            {!step.done && step.link && (
              <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                <Link to={step.link}>{step.cta}</Link>
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
