import { LayoutDashboard, Briefcase, Map, Users, Menu, Plus, X, ChevronRight, LogOut, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { toast } from 'sonner';

const tabs = [
  { label: 'Hem', icon: LayoutDashboard, to: '/admin', exact: true },
  { label: 'Uppdrag', icon: Briefcase, to: '/admin/assignments', exact: false },
  { label: 'Karta', icon: Map, to: '/admin/live-map', exact: false },
  { label: 'Personal', icon: Users, to: '/admin/drivers', exact: false },
];

const moreLinks = [
  { label: 'Kunder', to: '/admin/customers' },
  { label: 'Fakturor', to: '/admin/invoices' },
  { label: 'Kalender', to: '/admin/calendar' },
  { label: 'Ordrar', to: '/admin/orders' },
  { label: 'Rapporter', to: '/admin/reports' },
  { label: 'Fordon', to: '/admin/vehicles' },
  { label: 'Inställningar', to: '/admin/settings' },
];

export function MobileTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const { enabled: demoEnabled, toggle: toggleDemo } = useDemoMode();

  const isTabActive = (tab: typeof tabs[number]) => {
    if (tab.exact) return location.pathname === tab.to;
    return location.pathname.startsWith(tab.to);
  };

  // Only show FAB on pages where "new assignment" makes sense
  const showFab = location.pathname === '/admin' || location.pathname.startsWith('/admin/assignments');

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <>
      {/* Floating Action Button — only on dashboard/assignments */}
      {showFab && (
        <button
          onClick={() => navigate('/admin/assignments/new')}
          className="md:hidden fixed bottom-20 right-4 z-50 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Nytt uppdrag"
        >
          <Plus className="h-6 w-6 text-primary-foreground" />
        </button>
      )}

      {/* Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border h-16 flex items-center justify-around pb-safe">
        {tabs.map((tab) => {
          const active = isTabActive(tab);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="mobile-tab-indicator"
                  className="absolute -top-px left-2 right-2 h-0.5 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Öppna mer-meny"
          className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground min-w-[56px] min-h-11 py-1"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium">Mer</span>
        </button>
      </nav>

      {/* "More" slide-up sheet */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-50 bg-black/40"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card rounded-t-2xl border-t border-border max-h-[60vh] overflow-y-auto pb-safe"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Mer</h3>
                <button onClick={() => setMenuOpen(false)} aria-label="Stäng meny" className="p-2 text-muted-foreground min-h-11 min-w-11 flex items-center justify-center">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="py-2">
                {moreLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between px-5 py-3.5 text-sm text-foreground active:bg-muted transition-colors"
                  >
                    {link.label}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
              <div className="border-t border-border px-5 py-3">
                <button
                  onClick={() => {
                    toggleDemo();
                    setMenuOpen(false);
                    toast(demoEnabled ? 'Exempeldata avstängt' : 'Exempeldata påslaget', {
                      description: demoEnabled ? 'Du ser nu din riktiga data.' : 'Du ser nu exempeldata — inget sparas.',
                      duration: 3000,
                    });
                  }}
                  className="flex items-center justify-between w-full py-3 px-2 text-sm text-foreground active:bg-muted rounded-lg transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {demoEnabled ? 'Stäng av exempeldata' : 'Visa exempeldata'}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${demoEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {demoEnabled ? 'PÅ' : 'AV'}
                  </span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full py-3 text-sm text-destructive active:bg-muted rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logga ut
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
