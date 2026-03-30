import { ReactNode } from 'react';
import { ClipboardList, User } from 'lucide-react';
import { NavLink } from '@/components/NavLink';

interface DriverLayoutProps {
  children: ReactNode;
}

export function DriverLayout({ children }: DriverLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-14 pt-safe flex items-center justify-center border-b bg-card px-4 shrink-0">
        <h1 className="text-base font-semibold text-foreground">Aurora Medias Transport</h1>
      </header>
      <main className="flex-1 overflow-auto pb-24">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t flex z-50 pb-safe">
        <NavLink
          to="/driver"
          end
          className="flex-1 flex flex-col items-center justify-center py-3 text-muted-foreground transition-colors touch-target"
          activeClassName="text-primary"
        >
          <ClipboardList className="h-5 w-5" />
          <span className="text-xs mt-1">Uppdrag</span>
        </NavLink>
        <NavLink
          to="/driver/profile"
          className="flex-1 flex flex-col items-center justify-center py-3 text-muted-foreground transition-colors touch-target"
          activeClassName="text-primary"
        >
          <User className="h-5 w-5" />
          <span className="text-xs mt-1">Profil</span>
        </NavLink>
      </nav>
    </div>
  );
}
