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
      <p className="text-muted-foreground text-sm">Senast uppdaterad: 30 juli 2026</p>

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
        Vi använder <strong>enbart nödvändiga förstapartscookies</strong> för att hålla dig inloggad
        och lagra dina preferenser (t.ex. tema och cookie-samtycke). Vi använder inga
        tredjepartscookies för spårning eller marknadsföring.
      </p>

      <h2>6. Delning av uppgifter</h2>
      <p>
        Vi säljer aldrig dina personuppgifter. Data delas enbart med:
      </p>
      <ul>
        <li><strong>Infrastrukturleverantörer</strong> – för hosting och datalagring (Supabase, inom EU/EES).</li>
        <li><strong>Betalningsleverantörer</strong> – Stripe, vid hantering av prenumerationer.</li>
        <li><strong>Notisleverantörer</strong> – Google (Firebase/FCM) och Apple (APNs) för push-notiser till förarappen; endast enhetstoken och notisens innehåll delas.</li>
        <li><strong>Kartleverantörer</strong> – Google Maps respektive OpenStreetMap för kartvisning.</li>
        <li><strong>Myndigheter</strong> – om det krävs enligt lag.</li>
      </ul>

      <h2>7. Lagring och säkerhet</h2>
      <p>
        Uppgifter lagras så länge ditt konto är aktivt. Vid radering av konto tar vi bort dina
        personuppgifter inom 30 dagar. All data krypteras vid överföring (TLS) och i vila.
      </p>

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
