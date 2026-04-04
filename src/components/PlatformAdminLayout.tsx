import { ReactNode, Suspense } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { PageTransition } from '@/components/PageTransition';
import {
  LayoutDashboard, Building2, HeadphonesIcon, Megaphone, LogOut, Truck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/platform', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/platform/companies', icon: Building2, label: 'Företag' },
  { to: '/platform/support', icon: HeadphonesIcon, label: 'Support' },
  { to: '/platform/announcements', icon: Megaphone, label: 'Meddelanden' },
];

export function PlatformAdminShell() {
  const { signOut } = useAuth();
  const location = useLocation();

  const isActive = (path: string) =>
    path === '/platform'
      ? location.pathname === '/platform'
      : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-border bg-card z-40">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <Truck className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm text-foreground">Aurora Media</span>
            <p className="text-[10px] text-muted-foreground leading-none">Platform Admin</p>
          </div>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive(item.to)
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-2 border-t border-border">
          <Link
            to="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Tenant Admin
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            Logga ut
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:ml-60 flex flex-col min-h-screen">
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}

interface PlatformLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function PlatformLayout({ children, title, description }: PlatformLayoutProps) {
  return (
    <>
      <header className="h-14 flex items-center gap-3 border-b border-border px-4 md:px-6 bg-card shrink-0 sticky top-0 z-30">
        {/* Mobile nav */}
        <div className="flex md:hidden items-center gap-2">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className="p-2 rounded-lg hover:bg-muted">
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-foreground truncate leading-tight">{title}</h1>
          {description && <p className="text-[11px] text-muted-foreground truncate">{description}</p>}
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <PageTransition>{children}</PageTransition>
      </main>
    </>
  );
}
