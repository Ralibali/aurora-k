import dpa from '@/content/legal/dpa.json';
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
      <p className="text-muted-foreground text-sm">Senast uppdaterad: 23 september 2026</p>

      <h2>1. Vilka vi är</h2>
      <p>
        Aurora Transport ("vi", "oss") tillhandahåller ett transportledningssystem för webb och
        mobilapp. Denna policy beskriver hur vi samlar in, använder och skyddar dina personuppgifter.
      </p>

      <h2>2. Vilka uppgifter vi samlar in</h2>
      <ul>
        <li><strong>Kontouppgifter</strong> – namn, e-postadress, telefonnummer och lösenord vid registrering.</li>
        <li><strong>Företagsuppgifter</strong> – organisationsnummer, adress och kontaktperson.</li>
        <li><strong>Användningsdata</strong> – teknisk information som webbläsartyp, IP-adress och sidvisningar för att förbättra tjänsten.</li>
        <li><strong>Platsdata</strong> – GPS-position för förare (enbart under aktiva uppdrag, med samtycke).</li>
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
        Statistikcookies skiljer besök åt. Du kan när som helst återkalla samtycket via Cookieinställningar.
      </p>

      <h2>6. Delning av uppgifter</h2>
      <p>
        Vi säljer aldrig dina personuppgifter. Data delas enbart med:
      </p>
      <p>När vi behandlar uppgifter för kundföretaget gäller <Link to="/pub-avtal">PUB-avtalet</Link>. För våra egna konto- och betalningsändamål kan Aurora Media AB vara personuppgiftsansvarig.</p>
      <ul>{dpa.subprocessors.map(service => <li key={service.name}><strong>{service.name}</strong> – {service.purpose} Region: {service.region}. Tredjelandsöverföring: {service.transfer}</li>)}</ul>
      <h2>7. Lagring och säkerhet</h2>
      <p>Avslutad prenumeration startar inget automatiskt raderingsjobb. Data raderas på begäran. Kontakta info@auroramedia.se för instruktion om återlämnande eller radering. Lagstadgade bevarandekrav kan gälla. Se PUB-avtalet för säkerhetsåtgärder och uppgifter om lagring som behöver kompletteras.</p>

      <h2>8. Dina rättigheter (GDPR)</h2>
      <p>Du har rätt att:</p>
      <ul>
        <li>Begära tillgång till dina personuppgifter.</li>
        <li>Begära rättelse eller radering.</li>
        <li>Invända mot behandling.</li>
        <li>Begära dataportabilitet.</li>
      </ul>

      <h2>9. Kontakt</h2>
      <p>
        Har du frågor om vår hantering av personuppgifter? Kontakta oss på{" "}
        <a href="mailto:info@auroratransport.se" className="text-primary hover:text-primary/80">
          info@auroratransport.se
        </a>.
      </p>
    </main>
  </div>
  );
};

export default PrivacyPage;
