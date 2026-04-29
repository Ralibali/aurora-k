import { Link } from 'react-router-dom';
import { Clock, Truck, Smartphone, FileText, CheckCircle2, ArrowRight, Wallet, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageMeta } from '@/lib/use-page-meta';

const benefits = [
  'Digital tidrapportering direkt i mobilen',
  'Tydligare underlag för fakturering och uppföljning',
  'Mindre manuellt arbete i Excel och papperslappar',
  'Bättre kontroll på förare, uppdrag och arbetstid',
  'Passar åkerier, budfirmor och transportbemanning',
  'Fast pris och enkel uppstart utan krångel',
];

const sections = [
  {
    title: 'Tidrapportering i mobilen för förare',
    text: 'När förare rapporterar tid direkt i mobilen minskar risken för borttappade lappar, sena rapporter och missförstånd. Aurora Transport gör det enklare att koppla arbetstid till rätt uppdrag, rätt kund och rätt förare. Det ger admin bättre överblick och gör det snabbare att gå från utfört jobb till färdigt fakturaunderlag.',
    icon: Smartphone,
  },
  {
    title: 'Digital tidrapportering för transportföretag',
    text: 'Transportföretag har ofta rörliga dagar med snabba ändringar, flera förare, olika kunder och uppdrag som behöver rapporteras korrekt. Ett system för digital tidrapportering samlar informationen på ett ställe, i stället för att tider ligger utspridda i SMS, chattar, Excel-filer eller anteckningsblock.',
    icon: Clock,
  },
  {
    title: 'Från tidrapport till fakturaunderlag',
    text: 'Tidrapporteringen är inte bara viktig för lön och intern uppföljning. Den påverkar också fakturering, kundunderlag och lönsamhet. Med Aurora Transport får du bättre struktur på vilka uppdrag som är utförda, vem som körde, hur lång tid arbetet tog och vilket underlag som behöver vidare till fakturering.',
    icon: FileText,
  },
];

export default function TidrapporteringTransportPage() {
  usePageMeta({
    title: 'Tidrapportering transport | Tidrapportera i mobilen med Aurora Transport',
    description: 'Digital tidrapportering för transportföretag, åkerier och budfirmor. Låt förare tidrapportera i mobilen och skapa tydligare fakturaunderlag med Aurora Transport.',
    canonical: 'https://auroratransport.se/tidrapportering-transport',
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
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#123b88]">Tidrapportering transport</p>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">Tidrapportering för transportföretag — direkt i mobilen</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">Aurora Transport hjälper åkerier, budfirmor och transportbemanning att samla tidrapporter, uppdrag, förare och fakturaunderlag i ett enkelt digitalt system. I stället för att jaga tider i Excel, papperslappar, SMS eller WhatsApp kan föraren rapportera digitalt och admin får bättre kontroll på arbetstid, utförda jobb och underlag för fakturering.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-2xl bg-[#123b88] px-7 font-black text-white hover:bg-[#0f2f6e]"><Link to="/boka">Boka demo <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline" className="rounded-2xl bg-white px-7 font-black"><Link to="/vad-kostar-transportledningssystem">Se pris och kostnad</Link></Button>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_30px_90px_rgba(15,47,110,0.14)]">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#123b88]"><Clock className="h-6 w-6" /></span>
              <div>
                <p className="text-sm font-black text-slate-950">Digital tidrapport</p>
                <p className="text-sm text-slate-500">Förare → uppdrag → underlag</p>
              </div>
            </div>
            <div className="mt-7 space-y-3">
              {benefits.map((item) => <div key={item} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#123b88]" />{item}</div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Varför transportföretag behöver digital tidrapportering</h2>
          <div className="mt-6 space-y-6 text-lg leading-8 text-slate-600">
            <p>För många transportföretag är tidrapportering en av de saker som skapar mest onödig administration. Förare rapporterar tider på olika sätt, uppdrag ändras under dagen och informationen behöver ofta samlas ihop i efterhand. Det kan fungera när bolaget är litet, men så fort antalet förare, kunder och uppdrag växer blir det svårt att få en pålitlig överblick. Digital tidrapportering för transport gör att arbetstiden kopplas närmare uppdraget, så att du snabbare kan se vad som är utfört och vilket underlag som finns.</p>
            <p>Aurora Transport är byggt för den här vardagen. Systemet samlar transportplanering, uppdrag, förare, tidrapportering och fakturaunderlag i samma flöde. Det betyder att en förare inte behöver leta efter information i olika chattar, och att administratören slipper tolka handskrivna lappar eller föra över tider manuellt till Excel. Resultatet blir bättre kontroll, färre missförstånd och snabbare väg till fakturering.</p>
            <p>Den här sidan är särskilt relevant för dig som söker efter tidrapport online transport, tidrapportera i mobilen transport eller vad ett system för tidrapportering inom transport kostar. Aurora Transport är inte ett tungt affärssystem som kräver lång implementation, utan ett fokuserat transportledningssystem för mindre och växande transportföretag som vill få ordning på uppdrag, förare och rapportering utan att göra vardagen mer komplicerad.</p>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f9fc] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {sections.map((section) => (
              <article key={section.title} className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#123b88] text-white"><section.icon className="h-6 w-6" /></div>
                <h2 className="mt-6 text-2xl font-black tracking-tight text-slate-950">{section.title}</h2>
                <p className="mt-4 leading-7 text-slate-600">{section.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-300">Kom igång</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Vill du slippa manuell tidrapportering?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">Boka en kort demo så visar vi hur Aurora Transport kan hjälpa ditt transportföretag att samla uppdrag, förare, tidrapportering och fakturaunderlag i ett enklare system.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-2xl bg-white px-7 font-black text-slate-950 hover:bg-blue-50"><Link to="/boka">Boka demo</Link></Button>
            <Button asChild size="lg" variant="outline" className="rounded-2xl border-white/20 bg-transparent px-7 font-black text-white hover:bg-white/10 hover:text-white"><Link to="/transportledningssystem">Läs om transportledningssystem</Link></Button>
          </div>
        </div>
      </section>
    </main>
  );
}
