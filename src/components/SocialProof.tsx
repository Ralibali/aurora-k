import { Quote, Star } from 'lucide-react';
import type { LandingCopy } from '@/i18n/landing';

type SocialProofProps = {
  t: LandingCopy['social'];
};

export function SocialProof({ t }: SocialProofProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#818cf8]">{t.eyebrow}</p>
        <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">{t.h2}</h2>
        <p className="mt-5 text-lg leading-8 text-slate-400">{t.sub}</p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {t.quotes.map((quote) => (
          <figure
            key={quote.role + quote.company}
            className="relative flex flex-col rounded-[2rem] border border-[#1e1e5a] bg-[#141432] p-7 shadow-[0_22px_70px_rgba(0,0,0,0.35)]"
          >
            <Quote className="absolute right-6 top-6 h-8 w-8 text-[#4f46e5]/40" />
            <div className="flex gap-1 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <blockquote className="mt-5 flex-1 text-base leading-8 text-slate-200">
              ”{quote.text}”
            </blockquote>
            <figcaption className="mt-6 border-t border-[#1e1e5a] pt-5">
              <p className="text-sm font-black text-white">{quote.role}</p>
              <p className="text-sm font-semibold text-slate-500">{quote.company}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
