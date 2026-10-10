import { ReactNode, Suspense, useEffect, useLayoutEffect } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { AdminSidebar } from '@/components/AdminSidebar';
import { MobileTabBar } from '@/components/MobileTabBar';
import { Outlet, Link } from 'react-router-dom';
import { Search, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import '@/styles/admin-geist.css';
import { CommandPalette } from '@/components/admin/CommandPalette';
import { DemoBanner } from '@/components/admin/DemoBanner';
import { AssignmentCustomerStatusRuntime } from '@/components/admin/AssignmentCustomerStatusRuntime';
import { DemoModeProvider, useDemoMode } from '@/hooks/useDemoMode';
import { toast } from 'sonner';

export function AdminShell() {
  useLayoutEffect(() => {
    document.body.classList.add('aurora-admin');
    return () => document.body.classList.remove('aurora-admin');
  }, []);
  return (
    <DemoModeProvider>
      <div className="admin-geist-shell min-h-screen text-foreground">
        <AdminSidebar />
        <MobileTabBar />
        <CommandPalette />
        <AssignmentCustomerStatusRuntime />
        <div className="md:ml-60 flex min-h-screen min-w-0 flex-col pb-16 md:pb-0">
          <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </DemoModeProvider>
  );
}

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}

function DemoToggle() {
  const { enabled, disable } = useDemoMode();
  if (!enabled) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        disable();
        toast('Exempeldata borttagen', { description: 'Du ser nu din riktiga data.', duration: 3000 });
      }}
      className="hidden md:inline-flex h-9 gap-1.5 rounded-full border-amber-300/60 bg-white/60 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-900/60 dark:bg-white/5 dark:text-amber-400 dark:hover:bg-amber-950/30"
      title="Ta bort exempeldata"
    >
      <Sparkles className="h-3.5 w-3.5" />
      Ta bort exempeldata
    </Button>
  );
}

function SearchTrigger() {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const trigger = () => {
    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: !isMac });
    window.dispatchEvent(event);
  };
  return (
    <button aria-label="Sök eller hoppa till… (Ctrl K)" onClick={trigger} className="admin-search-trigger inline-flex h-11 md:min-w-[260px] items-center gap-2 rounded-full border border-border/80 bg-white/70 px-3 text-xs text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-foreground dark:bg-white/5 dark:hover:bg-white/10">
      <Search className="h-3.5 w-3.5" />
      <span className="hidden lg:block flex-1 text-left">Sök eller hoppa till…</span>
      <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">{isMac ? '⌘' : 'Ctrl'}K</kbd>
    </button>
  );
}

export function AdminLayout({ children, title, description, actions }: AdminLayoutProps) {
  useEffect(() => { document.title = `${title} | Aurora Transport`; }, [title]);
  return (
    <>
      <DemoBanner />
      <header className="admin-topbar sticky top-0 z-30 shrink-0 border-b bg-background px-5 py-4 md:px-9">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold leading-tight tracking-tight text-foreground md:text-xl">{title}</h1>
            </div>
            {description && <p className="mt-0.5 truncate text-xs text-muted-foreground md:text-sm">{description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SearchTrigger />
            <DemoToggle />
            <Button asChild className="admin-new-job"><Link to="/admin/assignments/new"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Nytt uppdrag</span><span className="sm:hidden">Nytt</span></Link></Button>
          </div>
        </div>
      </header>
      <main className="admin-main flex-1 min-w-0 px-5 py-7 pb-24 md:px-9 md:py-9 md:pb-10">
        <div className="mx-auto max-w-[1600px]">
          <PageTransition>{actions && <div className="mb-5 flex flex-wrap justify-end gap-2">{actions}</div>}{children}</PageTransition>
        </div>
      </main>
    </>
  );
}
