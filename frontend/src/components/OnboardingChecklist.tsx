import { Link } from 'react-router-dom';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAssignments, useDrivers } from '@/hooks/useData';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export function OnboardingChecklist() {
  const { data: drivers } = useDrivers();
  const { data: assignments } = useAssignments();

  const { data: customers } = useQuery({
    queryKey: ['customers-count-onboarding'],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('id').limit(1);
      return data ?? [];
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ['invoices-count-onboarding'],
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('id').limit(1);
      return data ?? [];
    },
  });

  const steps = [
    {
      label: 'Lägg till din första kund',
      hint: 'Kundregistret driver pris, faktura och historik.',
      done: (customers?.length ?? 0) > 0,
      link: '/admin/customers/new',
      cta: 'Lägg till kund',
    },
    {
      label: 'Bjud in eller skapa en förare',
      hint: 'Tilldela uppdrag och samla tidrapporter automatiskt.',
      done: (drivers?.length ?? 0) > 0,
      link: '/admin/drivers',
      cta: 'Lägg till förare',
    },
    {
      label: 'Skapa ditt första uppdrag',
      hint: 'Tar under 30 sekunder. Återanvänd som mall senare.',
      done: (assignments?.length ?? 0) > 0,
      link: '/admin/assignments/new',
      cta: 'Skapa uppdrag',
    },
    {
      label: 'Skapa din första faktura',
      hint: 'Sätt ihop fakturaunderlag från utförda uppdrag.',
      done: (invoices?.length ?? 0) > 0,
      link: '/admin/invoices/new',
      cta: 'Skapa faktura',
    },
  ];

  const progress = steps.filter((s) => s.done).length;
  const percent = Math.round((progress / steps.length) * 100);
  const allDone = progress === steps.length;
  if (allDone) return null;

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card mb-6 shadow-sm">
      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm leading-tight">Kom igång med Aurora Transport</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Aurora Transport sparar mest tid när uppdrag, förare och fakturering hänger ihop.
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-foreground tabular-nums leading-none">{percent}%</div>
            <p className="text-[10px] text-muted-foreground mt-1">{progress}/{steps.length} klart</p>
          </div>
        </div>

        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {steps.map((step, i) => (
            <Link
              key={i}
              to={step.done ? '#' : step.link}
              onClick={(e) => step.done && e.preventDefault()}
              className={`group flex items-start gap-3 rounded-lg border p-3 transition-all ${
                step.done
                  ? 'border-success/20 bg-success/5'
                  : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
              }`}
            >
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  step.done ? 'bg-success' : 'border-2 border-border bg-card'
                }`}
              >
                {step.done && <Check className="h-3.5 w-3.5 text-white" />}
                {!step.done && <span className="text-[11px] font-bold text-muted-foreground">{i + 1}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium leading-tight ${step.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{step.hint}</p>
                )}
              </div>
              {!step.done && (
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              )}
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
