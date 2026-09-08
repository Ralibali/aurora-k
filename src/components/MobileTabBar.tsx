import { LayoutDashboard, Briefcase, Map, Users, Menu, Plus, ChevronRight, LogOut, Sparkles, Shield } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { adminNavigation } from '@/lib/admin-navigation';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const tabs = [
  { label: 'Hem', icon: LayoutDashboard, to: '/admin', exact: true },
  { label: 'Uppdrag', icon: Briefcase, to: '/admin/assignments', exact: false },
  { label: 'Karta', icon: Map, to: '/admin/live-map', exact: false },
  { label: 'Personal', icon: Users, to: '/admin/drivers', exact: false },
];

export function MobileTabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const { signOut, isPlatformAdmin } = useAuth();
  const { enabled: demoEnabled, disable: disableDemo } = useDemoMode();
  const isActive = (to: string, exact = false) => exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  const showFab = pathname === '/admin' || pathname === '/admin/assignments';
  const moreActive = !tabs.some(tab => isActive(tab.to, tab.exact));
  const sections = adminNavigation.map(section => ({
    ...section,
    items: section.items.filter(item => `${section.label} ${item.title}`.toLocaleLowerCase('sv').includes(search.trim().toLocaleLowerCase('sv'))),
  })).filter(section => section.items.length > 0);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setMenuOpen(false);
      navigate('/');
    } catch { toast.error('Utloggningen misslyckades. Försök igen.'); }
    finally { setSigningOut(false); }
  };

  return (
    <>
      {showFab && !menuOpen && <button
        onClick={() => navigate('/admin/assignments/new')}
        className="md:hidden fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4 z-40 h-14 w-14 rounded-full bg-primary shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Nytt uppdrag"
      ><Plus className="h-6 w-6 text-primary-foreground" /></button>}

      <Sheet open={menuOpen} onOpenChange={open => { setMenuOpen(open); if (!open) setSearch(''); }}>
        <nav aria-label="Huvudnavigation" className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border flex items-center justify-around pb-safe">
          {tabs.map(tab => <Link key={tab.to} to={tab.to} aria-current={isActive(tab.to, tab.exact) ? 'page' : undefined}
            className={`flex min-h-16 min-w-[56px] flex-col items-center justify-center gap-1 border-t-2 px-2 transition-colors ${isActive(tab.to, tab.exact) ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            <tab.icon className="h-5 w-5" /><span className="text-[11px] font-medium">{tab.label}</span>
          </Link>)}
          <SheetTrigger asChild><button aria-label="Öppna mer-meny"
            className={`flex min-h-16 min-w-[56px] flex-col items-center justify-center gap-1 border-t-2 px-2 ${moreActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            <Menu className="h-5 w-5" /><span className="text-[11px] font-medium">Mer</span>
          </button></SheetTrigger>
        </nav>
        <SheetContent side="bottom" className="flex max-h-[85dvh] flex-col gap-0 rounded-t-2xl p-0 pb-safe">
          <SheetHeader className="shrink-0 border-b p-5 pr-14 text-left">
            <SheetTitle>Alla funktioner</SheetTitle>
            <SheetDescription>Planering, personal och ekonomi på samma ställe.</SheetDescription>
          </SheetHeader>
          <div className="shrink-0 px-5 py-3"><Input aria-label="Sök funktion" placeholder="Sök funktion…" value={search} onChange={event => setSearch(event.target.value)} className="h-11" /></div>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-3 pb-5">
            <nav aria-label="Alla funktioner">
              {sections.map(section => <section key={section.label} className="mb-3">
                <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.label}</h3>
                {section.items.map(item => <SheetClose asChild key={item.url}><Link to={item.url}
                  aria-current={isActive(item.url, item.url === '/admin') ? 'page' : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-lg px-3 py-3 text-sm ${isActive(item.url, item.url === '/admin') ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted'}`}>
                  <item.icon className="h-4 w-4 shrink-0" /><span className="flex-1">{item.title}</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link></SheetClose>)}
              </section>)}
              {!sections.length && <p role="status" className="p-5 text-sm text-muted-foreground">Ingen funktion matchar din sökning.</p>}
            </nav>
            <div className="space-y-1 border-t px-3 pt-3">
              {isPlatformAdmin && <SheetClose asChild><Link to="/platform" className="flex min-h-12 items-center gap-3 text-sm"><Shield className="h-4 w-4" />Plattformsadmin</Link></SheetClose>}
              {demoEnabled && <button onClick={() => { disableDemo(); setMenuOpen(false); toast('Exempeldata borttagen', { description: 'Du ser nu din riktiga data.' }); }} className="flex min-h-12 w-full items-center gap-3 text-sm"><Sparkles className="h-4 w-4" />Ta bort exempeldata</button>}
              <button onClick={() => void handleLogout()} disabled={signingOut} className="flex min-h-12 w-full items-center gap-3 text-sm text-destructive disabled:opacity-50"><LogOut className="h-4 w-4" />{signingOut ? 'Loggar ut…' : 'Logga ut'}</button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
