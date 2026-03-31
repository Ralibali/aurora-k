import { ReactNode } from 'react';
import { ClipboardList, User, LogOut, Clock, Truck } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useDriverSettings } from '@/hooks/useDriverSettings';

interface DriverLayoutProps {
  children: ReactNode;
}

export function DriverLayout({ children }: DriverLayoutProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { data: driverSettings } = useDriverSettings();
  const showTimeReport = driverSettings?.show_time_report ?? true;

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-14 pt-safe flex items-center justify-between border-b bg-card/80 backdrop-blur-sm px-4 shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Truck className="h-3.5 w-3.5 text-primary" />
          </div>
          <h1 className="text-sm font-semibold text-foreground">Aurora Medias</h1>
        </div>
        <button onClick={handleLogout} className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted transition-colors">
          <LogOut className="h-4.5 w-4.5" />
        </button>
      </header>
      <main className="flex-1 overflow-auto pb-24">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t flex z-50 pb-safe">
        <NavLink
          to="/driver"
          end
          className="flex-1 flex flex-col items-center justify-center py-3 text-muted-foreground transition-all duration-150 touch-target"
          activeClassName="text-primary"
        >
          <ClipboardList className="h-5 w-5" />
          <span className="text-[11px] mt-1 font-medium">Uppdrag</span>
        </NavLink>
        {showTimeReport && (
          <NavLink
            to="/driver/time-report"
            className="flex-1 flex flex-col items-center justify-center py-3 text-muted-foreground transition-all duration-150 touch-target"
            activeClassName="text-primary"
          >
            <Clock className="h-5 w-5" />
            <span className="text-[11px] mt-1 font-medium">Tidrapport</span>
          </NavLink>
        )}
        <NavLink
          to="/driver/profile"
          className="flex-1 flex flex-col items-center justify-center py-3 text-muted-foreground transition-all duration-150 touch-target"
          activeClassName="text-primary"
        >
          <User className="h-5 w-5" />
          <span className="text-[11px] mt-1 font-medium">Profil</span>
        </NavLink>
      </nav>
    </div>
  );
}
