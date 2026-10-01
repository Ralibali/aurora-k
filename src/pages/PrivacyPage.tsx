import { Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import { usePageMeta } from '@/lib/use-page-meta';

const PrivacyPage = () => {
  usePageMeta({
    title: 'Integritetspolicy – Aurora Transport',
    description: 'Läs om hur Aurora Transport hanterar personuppgifter, cookies och datasäkerhet i enlighet med GDPR.',
    canonical: 'https://auroratransport.se/privacy',
  });
  useBreadcrumbJsonLd(useMemo(() => [
    { name: 'Hem', url: 'https://auroratransport.se/' },
    { name: 'Integritetspolicy', url: 'https://auroratransport.se/privacy' },
  ], []));

  return (
  <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold text-foreground">Integritetspolicy</h1>
      </div>
    </header>

    <main className="max-w-3xl mx-auto px-4 py-10 prose prose-neutral dark:prose-invert">
      <p className="text-muted-foreground text-sm">Senast uppdaterad: 30 september 2026</p>

      <h2>1. Vilka vi är</h2>
      <p>
        Aurora Transport tillhandahålls av Aurora Media AB, org.nr 559272-0220 ("vi", "oss"), Linköping. Vi tillhandahåller ett transportledningssystem för webb och
        mobilapp. Denna policy beskriver hur vi samlar in, använder och skyddar dina personuppgifter.
      </p>

      <h2>2. Vilka uppgifter vi samlar in</h2>
      <ul>
        <li><strong>Kontouppgifter</strong> – namn, e-postadress, telefonnummer och lösenord vid registrering.</li>
        <li><strong>Företagsuppgifter</strong> – organisationsnummer, adress och kontaktperson.</li>
        <li><strong>Användningsdata</strong> – teknisk information som webbläsartyp, IP-adress och sidvisningar för att förbättra tjänsten.</li>
        <li><strong>Platsdata</strong> – GPS-position för förare när platsdelning är aktiverad för ett pågående uppdrag.</li>
        <li><strong>Leveransbevis</strong> – foton och signaturer som förare samlar in vid leverans.</li>
        <li><strong>Enhetsidentifierare</strong> – push-tokens för att kunna skicka notiser om nya uppdrag (mobilappen).</li>
      </ul>

      <h2>3. Hur vi använder uppgifterna</h2>
      <ul>
        <li>Tillhandahålla och driva tjänsten, inklusive mobilapparna.</li>
        <li>Autentisera användare och hålla sessioner aktiva.</li>
        <li>Skicka tjänsterelaterade meddelanden (t.ex. lösenordsåterställning, uppdragsnotiser).</li>
        <li>Visa förarens position för trafikledningen under pågående uppdrag.</li>
        <li>Förbättra prestanda och användarupplevelse.</li>
      </ul>

      <h2>Rättslig grund och roller</h2>
      <p>Vi behandlar dina konto- och avtalsuppgifter för att fullgöra avtal. Kontaktförfrågningar hanteras för att besvara din begäran och, när den gäller ditt företag, med stöd av vårt berättigade intresse att ha affärskontakt. Säkerhetsåtgärder bygger på berättigat intresse att skydda tjänsten. Bokföringsuppgifter behandlas när lag kräver det.</p>
      <p>För uppgifter om förare, mottagare, leveranser och personal som en kund lägger in är kundens transportföretag normalt personuppgiftsansvarigt. Aurora Media AB behandlar dessa uppgifter som biträde enligt kundens instruktioner. Kontakta även transportföretaget om du vill utöva dina rättigheter för sådana uppgifter. Appens platsbehörighet är ett tekniskt tillstånd; transportföretaget ansvarar för att ha rättslig grund och informera sina förare.</p>
      <h2>4. Mobilappen</h2>
      <p>
        Förarappen ber om tillgång till <strong>plats</strong> (för live-följning av uppdrag) och
        <strong> aviseringar</strong> (för nya körorder). Båda är frivilliga att neka — appen fungerar
        ändå, men utan respektive funktion. Plats delas aldrig i bakgrunden när inget uppdrag pågår
        och används aldrig för marknadsföring.
      </p>

      <h2>5. Cookies</h2>
      <p>
        Vi använder nödvändiga cookies för inloggning och preferenser. Med ditt samtycke
        använder vi Google Analytics 4 från Google för sidvisningar och produkthändelser.
        _ga och _ga_* innehåller pseudonyma besöksidentifierare och statistik om besök och händelser. Googles standardlivslängd är upp till två år. Valet i aurora_ga4_consent_v1 är lokal lagring för att komma ihåg ditt ja eller nej i högst tolv månader. Inloggningssessionen sparas separat i sb-*-auth-token tills du loggar ut eller rensar lagringen. Du kan när som helst återkalla statistik via Cookieinställningar. Diagnostik via Sentry aktiveras också endast efter statistikvalet; sessioninspelning och prestandaspårning används inte.
      </p>

      <h2>6. Delning av uppgifter</h2>
      <p>
        Vi säljer aldrig dina personuppgifter. Data delas enbart med:
      </p>
      <ul>
        <li><strong>Infrastrukturleverantörer</strong> – för hosting och datalagring (Lovable Cloud / Supabase).</li>
        <li><strong>Betalningsleverantörer</strong> – Stripe, vid hantering av prenumerationer.</li>
        <li><strong>Notisleverantörer</strong> – Google (Firebase/FCM) och Apple (APNs) för push-notiser till förarappen; endast enhetstoken och notisens innehåll delas.</li>
        <li><strong>Kartleverantörer</strong> – Google Maps respektive OpenStreetMap för kartvisning.</li>
        <li><strong>Sentry</strong> – teknisk feldiagnostik efter statistikval; kontaktuppgifter, formulärdata, cookies och URL-parametrar tas bort från diagnostik.</li>
        <li><strong>Myndigheter</strong> – om det krävs enligt lag.</li>
      </ul>

      <p>Google, Apple, kart- och andra infrastrukturleverantörer kan behandla uppgifter utanför EU/EES. Kontakta oss för information om aktuella mottagare och de överföringsskydd som gäller för din behandling.</p>

      <h2>7. Lagring och säkerhet</h2>
      <p>
        Kontouppgifter behövs medan kontot används. Transport-, personal- och leveransuppgifter behandlas på transportföretagets instruktioner och ska raderas eller återlämnas när de inte längre behövs. Bokföringsunderlag kan behöva bevaras enligt lag. Kontakta oss för registerutdrag eller en raderingsbegäran; vi bedömer eventuella bevarandekrav och svarar normalt inom en månad. Anslutningar skyddas med TLS.
      </p>

      <h2>8. Dina rättigheter (GDPR)</h2>
      <p>Du har rätt att:</p>
      <ul>
        <li>Begära tillgång till dina personuppgifter.</li>
        <li>Begära rättelse eller radering.</li>
        <li>Invända mot behandling.</li>
        <li>Begära dataportabilitet när den rätten gäller.</li>
        <li>Begära begränsning och återkalla samtycke för frivillig statistik.</li>
        <li>Lämna klagomål till <a href="https://www.imy.se/" className="underline">Integritetsskyddsmyndigheten (IMY)</a>.</li>
      </ul>

      <h2>9. Kontakt</h2>
      <p>
        Har du frågor om vår hantering av personuppgifter? Kontakta oss på{" "}
        <a href="mailto:info@auroramedia.se" className="text-primary hover:text-primary/80">
          info@auroramedia.se
        </a>.
      </p>
    </main>
  </div>
  );
};

export default PrivacyPage;
