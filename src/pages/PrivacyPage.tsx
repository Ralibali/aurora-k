import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPage = () => (
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
      <p className="text-muted-foreground text-sm">Senast uppdaterad: 4 april 2025</p>

      <h2>1. Vilka vi är</h2>
      <p>
        Aurora TMS ("vi", "oss") tillhandahåller ett transportledningssystem. Denna policy
        beskriver hur vi samlar in, använder och skyddar dina personuppgifter.
      </p>

      <h2>2. Vilka uppgifter vi samlar in</h2>
      <ul>
        <li><strong>Kontouppgifter</strong> – namn, e-postadress och lösenord vid registrering.</li>
        <li><strong>Företagsuppgifter</strong> – organisationsnummer, adress och kontaktperson.</li>
        <li><strong>Användningsdata</strong> – teknisk information som webbläsartyp, IP-adress och sidvisningar för att förbättra tjänsten.</li>
        <li><strong>Platsdata</strong> – GPS-position för förare (enbart under aktiva uppdrag, med samtycke).</li>
      </ul>

      <h2>3. Hur vi använder uppgifterna</h2>
      <ul>
        <li>Tillhandahålla och driva tjänsten.</li>
        <li>Autentisera användare och hålla sessioner aktiva.</li>
        <li>Skicka tjänsterelaterade meddelanden (t.ex. lösenordsåterställning).</li>
        <li>Förbättra prestanda och användarupplevelse.</li>
      </ul>

      <h2>4. Cookies</h2>
      <p>
        Vi använder <strong>enbart nödvändiga förstapartscookies</strong> för att hålla dig inloggad
        och lagra dina preferenser (t.ex. tema och cookie-samtycke). Vi använder inga
        tredjepartscookies för spårning eller marknadsföring.
      </p>

      <h2>5. Delning av uppgifter</h2>
      <p>
        Vi säljer aldrig dina personuppgifter. Data delas enbart med:
      </p>
      <ul>
        <li><strong>Infrastrukturleverantörer</strong> – för hosting och datalagring (inom EU/EES).</li>
        <li><strong>Betalningsleverantörer</strong> – vid hantering av prenumerationer.</li>
        <li><strong>Myndigheter</strong> – om det krävs enligt lag.</li>
      </ul>

      <h2>6. Lagring och säkerhet</h2>
      <p>
        Uppgifter lagras så länge ditt konto är aktivt. Vid radering av konto tar vi bort dina
        personuppgifter inom 30 dagar. All data krypteras vid överföring (TLS) och i vila.
      </p>

      <h2>7. Dina rättigheter (GDPR)</h2>
      <p>Du har rätt att:</p>
      <ul>
        <li>Begära tillgång till dina personuppgifter.</li>
        <li>Begära rättelse eller radering.</li>
        <li>Invända mot behandling.</li>
        <li>Begära dataportabilitet.</li>
      </ul>

      <h2>8. Kontakt</h2>
      <p>
        Har du frågor om vår hantering av personuppgifter? Kontakta oss på{" "}
        <a href="mailto:info@aurora-tms.se" className="text-primary hover:text-primary/80">
          info@aurora-tms.se
        </a>.
      </p>
    </main>
  </div>
);

export default PrivacyPage;
