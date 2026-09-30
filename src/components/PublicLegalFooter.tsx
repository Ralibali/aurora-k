import { useLocation } from 'react-router-dom';
export function LegalFooterLinks() {
  return <footer className="border-t p-5 text-center text-sm"><nav aria-label="Juridisk information" className="flex flex-wrap justify-center gap-5"><a href="/villkor" className="underline">Användarvillkor</a><a href="/pub-avtal" className="underline">PUB-avtal</a><a href="/privacy" className="underline">Integritetspolicy</a></nav></footer>;
}
export function PublicLegalFooter() {
  const { pathname } = useLocation();
  return /^\/(admin|driver|platform|onboarding)(\/|$)/.test(pathname) ? null : <LegalFooterLinks />;
}
