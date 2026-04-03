import { ReactNode } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { ClipboardList, User, LogOut, Clock, Truck, Home } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffectiveDriverSettings } from '@/hooks/useDriverSettings';

interface DriverLayoutProps {
  children: ReactNode;
  hideHeader?: boolean;
}

export function DriverLayout({ children, hideHeader }: DriverLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: driverSettings } = useEffectiveDriverSettings(user?.id);
  const showTimeReport = driverSettings?.show_time_report ?? true;

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {!hideHeader && (
        <header className="h-14 pt-safe flex items-center justify-between border-b bg-card px-4 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Truck className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <h1 className="text-sm font-semibold text-foreground">Aurora Medias</h1>
          </div>
          <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </header>
      )}

      <main className="flex-1 overflow-auto pb-20">
        <PageTransition>{children}</PageTransition>
      </main>

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t flex z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <NavLink
          to="/driver"
          end
          className="flex-1 flex flex-col items-center justify-center py-2.5 text-muted-foreground transition-colors duration-100 min-h-[48px]"
          activeClassName="text-primary"
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">Hem</span>
        </NavLink>
        <NavLink
          to="/driver/assignments"
          className="flex-1 flex flex-col items-center justify-center py-2.5 text-muted-foreground transition-colors duration-100 min-h-[48px]"
          activeClassName="text-primary"
        >
          <ClipboardList className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">Uppdrag</span>
        </NavLink>
        {showTimeReport && (
          <NavLink
            to="/driver/time-report"
            className="flex-1 flex flex-col items-center justify-center py-2.5 text-muted-foreground transition-colors duration-100 min-h-[48px]"
            activeClassName="text-primary"
          >
            <Clock className="h-5 w-5" />
            <span className="text-[10px] mt-0.5 font-medium">Tidrapport</span>
          </NavLink>
        )}
        <NavLink
          to="/driver/profile"
          className="flex-1 flex flex-col items-center justify-center py-2.5 text-muted-foreground transition-colors duration-100 min-h-[48px]"
          activeClassName="text-primary"
        >
          <User className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">Profil</span>
        </NavLink>
      </nav>
    </div>
  );
}
