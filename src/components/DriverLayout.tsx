import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Briefcase, Clock, FileText, User, Truck, Bell } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';

export function DriverLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Top header */}
      <header className="h-14 pt-safe flex items-center justify-between border-b border-border bg-white px-4 shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Truck className="h-3.5 w-3.5 text-white" />
          </div>
          <h1 className="text-sm font-semibold text-foreground">Aurora Transport</h1>
        </div>
        <button className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-secondary transition-colors">
          <Bell className="h-5 w-5" />
        </button>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-auto pb-20">
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-border flex z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <NavLink
          to="/driver/assignments"
          className="flex-1 flex flex-col items-center justify-center py-2.5 text-muted-foreground transition-colors duration-100 min-h-[48px]"
          activeClassName="!text-primary"
        >
          <Briefcase className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">Mina uppdrag</span>
        </NavLink>
        <NavLink
          to="/driver/time-report"
          className="flex-1 flex flex-col items-center justify-center py-2.5 text-muted-foreground transition-colors duration-100 min-h-[48px]"
          activeClassName="!text-primary"
        >
          <Clock className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">Tidrapport</span>
        </NavLink>
        <NavLink
          to="/driver/invoices"
          className="flex-1 flex flex-col items-center justify-center py-2.5 text-muted-foreground transition-colors duration-100 min-h-[48px]"
          activeClassName="!text-primary"
        >
          <FileText className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">Fakturor</span>
        </NavLink>
        <NavLink
          to="/driver/profile"
          className="flex-1 flex flex-col items-center justify-center py-2.5 text-muted-foreground transition-colors duration-100 min-h-[48px]"
          activeClassName="!text-primary"
        >
          <User className="h-5 w-5" />
          <span className="text-[10px] mt-0.5 font-medium">Profil</span>
        </NavLink>
      </nav>
    </div>
  );
}
