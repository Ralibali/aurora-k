import { useMemo, useState } from 'react';
import { ArrowRight, Clock, TrendingUp, Wallet } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import type { LandingCopy, Lang } from '@/i18n/landing';

type RoiCopy = LandingCopy['roi'];

type RoiCalculatorProps = {
  t: RoiCopy;
  lang: Lang;
  monthlyPrice?: number;
  onCta: () => void;
};

// Antagandet som hela räkneexemplet vilar på – kommuniceras även i texten
// (t.roi.assumption) så att besökaren själv kan bedöma rimligheten.
const MINUTES_SAVED_PER_ASSIGNMENT = 15;
const WEEKS_PER_MONTH = 4.33;

function formatNumber(value: number, lang: Lang) {
  return new Intl.NumberFormat(lang === 'sv' ? 'sv-SE' : 'en-GB', {
    maximumFractionDigits: 0,
  }).format(value);
}

export function RoiCalculator({ t, lang, monthlyPrice = 449, onCta }: RoiCalculatorProps) {
  const [drivers, setDrivers] = useState(5);
  const [jobsPerDriver, setJobsPerDriver] = useState(12);
  const [hourlyCost, setHourlyCost] = useState(350);

  const result = useMemo(() => {
    const monthlyAssignments = drivers * jobsPerDriver * WEEKS_PER_MONTH;
    const hoursSaved = (monthlyAssignments * MINUTES_SAVED_PER_ASSIGNMENT) / 60;
    const moneySaved = hoursSaved * hourlyCost;
    const paybackMultiple = moneySaved / monthlyPrice;
    return { hoursSaved, moneySaved, paybackMultiple };
  }, [drivers, jobsPerDriver, hourlyCost, monthlyPrice]);

  const controls: {
    label: string;
    unit: string;
    value: number;
    min: number;
    max: number;
    step: number;
    set: (value: number) => void;
  }[] = [
    { label: t.driversLabel, unit: t.driversUnit, value: drivers, min: 1, max: 50, step: 1, set: setDrivers },
    { label: t.assignmentsLabel, unit: t.assignmentsUnit, value: jobsPerDriver, min: 1, max: 30, step: 1, set: setJobsPerDriver },
    { label: t.rateLabel, unit: t.rateUnit, value: hourlyCost, min: 200, max: 800, step: 25, set: setHourlyCost },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[2rem] border border-[#1e1e5a] bg-[#141432] p-7 shadow-[0_22px_70px_rgba(0,0,0,0.4)] sm:p-9">
        <div className="space-y-9">
          {controls.map((control) => (
            <div key={control.label}>
              <div className="flex items-baseline justify-between gap-3">
                <label className="text-sm font-bold text-slate-300">{control.label}</label>
                <span className="rounded-full border border-[#4f46e5]/40 bg-[#4f46e5]/15 px-3 py-1 text-sm font-black text-[#a5b4fc]">
                  {formatNumber(control.value, lang)}{control.unit ? ` ${control.unit}` : ''}
                </span>
              </div>
              <Slider
                className="mt-4"
                trackClassName="bg-[#1e1e5a]"
                rangeClassName="bg-[#4f46e5]"
                thumbClassName="border-[#4f46e5] bg-white shadow-[0_0_16px_rgba(79,70,229,0.6)]"
                value={[control.value]}
                min={control.min}
                max={control.max}
                step={control.step}
                onValueChange={(values) => control.set(values[0] ?? control.value)}
                aria-label={control.label}
              />
              <div className="mt-2 flex justify-between text-xs font-semibold text-slate-500">
                <span>{formatNumber(control.min, lang)}</span>
                <span>{formatNumber(control.max, lang)}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-9 border-t border-[#1e1e5a] pt-5 text-xs leading-6 text-slate-500">{t.assumption}</p>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-[#1e1e5a] bg-[#141432] p-7 shadow-[0_30px_90px_rgba(79,70,229,0.25)] sm:p-9">
        <div className="absolute right-[-5rem] top-[-5rem] h-56 w-56 rounded-full bg-[#4f46e5]/30 blur-3xl" />
        <div className="relative space-y-7">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-[#4f46e5]/20 p-3 text-[#818cf8]">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">{t.hoursSavedLabel}</p>
              <p className="mt-1 text-4xl font-black tracking-tight text-white">
                {formatNumber(result.hoursSaved, lang)} <span className="text-lg font-bold text-slate-400">h</span>
              </p>
              <p className="text-sm font-semibold text-slate-500">{t.perMonth}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-[#4f46e5]/20 p-3 text-[#818cf8]">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">{t.moneySavedLabel}</p>
              <p className="mt-1 text-4xl font-black tracking-tight text-white">
                {formatNumber(result.moneySaved, lang)} <span className="text-lg font-bold text-slate-400">{lang === 'sv' ? 'kr' : 'SEK'}</span>
              </p>
              <p className="text-sm font-semibold text-slate-500">{t.perMonth}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-[#4f46e5]/40 bg-[#4f46e5]/15 p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-[#4f46e5] p-3 text-white shadow-[0_0_24px_rgba(79,70,229,0.5)]">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#a5b4fc]">{t.paybackLabel}</p>
                <p className="mt-0.5 text-3xl font-black tracking-tight text-white">
                  {formatNumber(result.paybackMultiple, lang)}× <span className="text-base font-bold text-slate-300">{t.paybackSuffix}</span>
                </p>
              </div>
            </div>
          </div>

          <Button
            size="lg"
            onClick={onCta}
            className="w-full rounded-2xl bg-[#4f46e5] font-black text-white shadow-[0_0_30px_rgba(79,70,229,0.45)] hover:bg-[#4338ca]"
          >
            {t.cta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
