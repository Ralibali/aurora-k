import { ReactNode, Suspense } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { AdminSidebar } from '@/components/AdminSidebar';
import { MobileTabBar } from '@/components/MobileTabBar';
import { Outlet } from 'react-router-dom';
import { Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickCreateMenu } from '@/components/admin/QuickCreateMenu';
import { CommandPalette } from '@/components/admin/CommandPalette';
import { DemoBanner } from '@/components/admin/DemoBanner';
import { AssignmentCustomerStatusRuntime } from '@/components/admin/AssignmentCustomerStatusRuntime';
import { FortnoxRuntime } from '@/components/admin/FortnoxRuntime';
import { DemoModeProvider, useDemoMode } from '@/hooks/useDemoMode';
import { toast } from 'sonner';

export function AdminShell() {
  return (
    <DemoModeProvider>
      <div className="admin-nordic-shell min-h-screen text-foreground">
        <AdminSidebar />
        <MobileTabBar />
        <CommandPalette />
        <AssignmentCustomerStatusRuntime />
        <FortnoxRuntime />
        <div className="md:ml-60 flex min-h-screen flex-col pb-16 md:pb-0">
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
  const { enabled, toggle } = useDemoMode();
  const handleToggle = () => {
    toggle();
    toast(enabled ? 'Exempeldata avstängt' : 'Exempeldata påslaget', {
      description: enabled ? 'Du ser nu din riktiga data.' : 'Du ser nu exempeldata — inget sparas.',
      duration: 3000,
    });
  };
  return (
    <Button
      variant={enabled ? 'default' : 'outline'}
      size="sm"
      onClick={handleToggle}
      className={`hidden md:inline-flex h-9 gap-1.5 rounded-full ${enabled ? 'shadow-sm' : 'border-amber-300/60 bg-white/60 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-900/60 dark:bg-white/5 dark:text-amber-400 dark:hover:bg-amber-950/30'}`}
      title="Visa eller dölj exempeldata"
    >
      <Sparkles className="h-3.5 w-3.5" />
      {enabled ? 'Exempeldata på' : 'Visa exempeldata'}
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
    <button onClick={trigger} className="hidden md:inline-flex h-9 min-w-[230px] items-center gap-2 rounded-full border border-border/80 bg-white/70 px-3 text-xs text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-foreground dark:bg-white/5 dark:hover:bg-white/10">
      <Search className="h-3.5 w-3.5" />
      <span className="flex-1 text-left">Sök kunder, uppdrag, sidor…</span>
      <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">{isMac ? '⌘' : 'Ctrl'}K</kbd>
    </button>
  );
}

function TrustPill() {
  return (
    <div className="hidden items-center gap-2 xl:flex">
      <span className="nordic-trust-pill"><ShieldCheck className="h-3.5 w-3.5 text-success" /> Svensk admin</span>
      <span className="nordic-trust-pill">Realtid</span>
      <span className="nordic-trust-pill">Trygg fakturakoll</span>
    </div>
  );
}

export function AdminLayout({ children, title, description, actions }: AdminLayoutProps) {
  return (
    <>
      <DemoBanner />
      <header className="sticky top-0 z-30 shrink-0 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur-xl md:px-6">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold leading-tight tracking-tight text-foreground md:text-lg">{title}</h1>
              <span className="hidden rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success md:inline-flex">Aktiv</span>
            </div>
            {description && <p className="mt-0.5 truncate text-xs text-muted-foreground md:text-sm">{description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <TrustPill />
            <SearchTrigger />
            <DemoToggle />
            {actions ?? <QuickCreateMenu />}
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto px-4 py-5 pb-24 md:px-6 md:py-7 md:pb-8">
        <div className="mx-auto max-w-[1600px]">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </>
  );
}
