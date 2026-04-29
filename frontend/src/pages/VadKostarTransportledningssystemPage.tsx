import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileText, HelpCircle, ShieldCheck, Truck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageMeta } from '@/lib/use-page-meta';

const included = [
  'Uppdrag och dispatch',
  'Förare och mobil vy',
  'Digital tidrapportering',
  'Fakturaunderlag',
  'Rapporter och överblick',
  'Support på svenska',
  'Ingen bindningstid',
  'Obegränsat antal förare',
];

const costFactors = [
  {
    title: 'Antal användare och förare',
    text: 'Många system tar betalt per användare, förare eller administratör. För mindre åkerier och budfirmor kan det göra priset svårt att förutse när teamet växer. Aurora Transport har i stället ett fast månadspris, vilket gör det enklare att räkna på kostnaden.',
  },
  {
    title: 'Funktioner som ingår',
    text: 'Ett transportledningssystem kan innehålla allt från enkel uppdragshantering till ruttplanering, tidrapportering, fakturaunderlag och rapporter. När du jämför pris bör du inte bara titta på månadskostnaden, utan också på vad som faktiskt ingår.',
  },
  {
    title: 'Implementation och onboarding',
    text: 'Vissa system kräver långa projekt, konsulter och anpassningar. För många mindre transportföretag är det viktigare att komma igång snabbt. Aurora Transport har en tydlig setupkostnad för uppstart, konfiguration och onboarding.',
  },
];

export default function VadKostarTransportledningssystemPage() {
  usePageMeta({
    title: 'Vad kostar ett transportledningssystem? Pris för åkerier | Aurora Transport',
    description: 'Vad kostar ett transportledningssystem för åkerier, budfirmor och transportföretag? Läs om pris, setup, tidrapportering, dispatch och vad som ingår i Aurora Transport.',
    canonical: 'https://auroratransport.se/vad-kostar-transportledningssystem',
    ogImage: 'https://auroratransport.se/og-image.png',
  });

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 font-black">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#123b88] text-white"><Truck className="h-5 w-5" /></span>
            Aurora Transport
          </Link>
          <Button asChild className="rounded-xl bg-[#123b88] font-bold text-white hover:bg-[#0f2f6e]"><Link to="/boka">Boka demo</Link></Button>
        </div>
      </header>

      <section className="bg-[radial-gradient(circle_at_20%_0%,rgba(18,59,136,0.16),transparent_34rem),linear-gradient(180deg,#eef5ff,#fff)] py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#123b88]">Pris transportledningssystem</p>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">Vad kostar ett transportledningssystem?</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">Priset på ett transportledningssystem beror ofta på antal användare, funktioner, implementation och vilken typ av transportföretag som ska använda systemet. Aurora Transport är byggt för åkerier, budfirmor och transportbemanning som vill ha ett enkelt och tydligt system för uppdrag, förare, digital tidrapportering och fakturaunderlag — utan dyra licenser per användare.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-2xl bg-[#123b88] px-7 font-black text-white hover:bg-[#0f2f6e]"><Link to="/boka">Boka demo <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline" className="rounded-2xl bg-white px-7 font-black"><Link to="/tidrapportering-transport">Läs om tidrapportering</Link></Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,47,110,0.14)]">
            <div className="bg-[#0b1730] p-7 text-white">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">Aurora Transport</p>
              <div className="mt-4 text-5xl font-black tracking-tight">449 kr</div>
              <p className="mt-2 text-slate-300">per månad</p>
            </div>
            <div className="p-7">
              <div className="text-4xl font-black tracking-tight text-slate-950">3 500 kr</div>
              <p className="mt-2 text-slate-600">engångskostnad för setup och onboarding</p>
              <div className="mt-6 space-y-3">
                {included.slice(0, 5).map((item) => <div key={item} className="flex items-start gap-3 text-sm font-bold text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#123b88]" />{item}</div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Så ska du jämföra pris på transportledningssystem</h2>
          <div className="mt-6 space-y-6 text-lg leading-8 text-slate-600">
            <p>När någon söker efter vad ett transportledningssystem kostar handlar det sällan bara om själva priset. Det handlar om att förstå vad man får för pengarna, hur snabbt systemet kan börja användas och om det faktiskt minskar administrationen i vardagen. Ett billigt system som inte löser uppdragshantering, förare, tidrapportering och fakturaunderlag kan i praktiken bli dyrt eftersom arbetet ändå behöver göras manuellt vid sidan av.</p>
            <p>För åkerier, budfirmor och mindre transportföretag är det ofta viktigt med ett pris som går att förstå direkt. Många vill slippa långa säljmöten, dolda avgifter och licenser som växer varje gång en ny förare läggs till. Aurora Transport har därför ett tydligt upplägg: en engångskostnad för setup och onboarding, och därefter ett fast månadspris. Det gör det enklare att budgetera och lättare att avgöra om systemet passar verksamheten.</p>
            <p>Priset ska också sättas i relation till tiden som sparas. Om du i dag lägger timmar varje vecka på att samla tidrapporter, leta upp information i WhatsApp, uppdatera Excel-filer och skapa fakturaunderlag manuellt kan ett transportledningssystem snabbt betala tillbaka sig. Det gäller särskilt när systemet samlar dispatch, uppdrag, förare, digital tidrapportering och fakturaunderlag i samma flöde.</p>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f9fc] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Vad påverkar kostnaden?</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {costFactors.map((factor) => (
              <article key={factor.title} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#123b88] text-white"><HelpCircle className="h-6 w-6" /></div>
                <h3 className="mt-6 text-2xl font-black tracking-tight text-slate-950">{factor.title}</h3>
                <p className="mt-4 leading-7 text-slate-600">{factor.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-[#eef5ff] p-8 sm:p-10">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#123b88] text-white"><Wallet className="h-6 w-6" /></span>
              <h2 className="text-3xl font-black tracking-tight text-slate-950">Vad ingår i Aurora Transport?</h2>
            </div>
            <p className="mt-5 text-lg leading-8 text-slate-600">Aurora Transport är gjort för att ge mindre transportföretag ett prisvärt alternativ till tunga affärssystem. Du får ett transportledningssystem där uppdrag, förare, tidrapportering och fakturaunderlag hänger ihop. Det gör att du inte behöver köpa flera separata verktyg för att hantera planering, rapportering och underlag.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {included.map((item) => <div key={item} className="flex items-start gap-3 rounded-2xl bg-white p-4 text-sm font-bold text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#123b88]" />{item}</div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-300">Se om det passar</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Vill du se vad Aurora Transport skulle kosta för er?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">Boka en kort demo så visar vi hur systemet fungerar, vad som ingår och hur Aurora Transport kan ersätta Excel, WhatsApp och manuell administration i ditt transportföretag.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-2xl bg-white px-7 font-black text-slate-950 hover:bg-blue-50"><Link to="/boka">Boka demo</Link></Button>
            <Button asChild size="lg" variant="outline" className="rounded-2xl border-white/20 bg-transparent px-7 font-black text-white hover:bg-white/10 hover:text-white"><Link to="/">Till startsidan</Link></Button>
          </div>
        </div>
      </section>
    </main>
  );
}
