import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { CONTENT_POLICY_VERSION } from './content-policy';

export function DriverContentPolicy() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>Reglerna gäller text, foton, signaturer och annat material som du skickar i Aurora Transport.</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Skicka bara arbetsrelaterat material som du har rätt att använda och dela.</li>
        <li>Skicka inte olagligt, kränkande, hotfullt eller sexuellt innehåll. Trakasserier och hot mot andra användare är inte tillåtna.</li>
        <li>Rapportera olämpligt innehåll eller användare via rapportfunktionen i Profil. Rapporterna skickas till Aurora Transports support och kan också läsas av företagets administratörer.</li>
      </ul>
      <p>Godkänn reglerna innan du börjar skicka material. Du kan läsa dem igen från Profil.</p>
      <p className="text-xs text-muted-foreground">Policyversion {CONTENT_POLICY_VERSION}</p>
    </div>
  );
}

export function DriverContentPolicyPage() {
  const { user, role } = useAuth();
  return (
    <main className="min-h-screen bg-background px-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-[calc(2rem+env(safe-area-inset-top,0px))]">
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-semibold">Regler för innehåll</h1>
        <DriverContentPolicy />
        <Button variant="outline" asChild><Link to={user && role === 'driver' ? '/driver/profile' : '/login'}>Tillbaka</Link></Button>
      </div>
    </main>
  );
}
