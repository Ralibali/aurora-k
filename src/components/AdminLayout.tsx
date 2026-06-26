import { ReactNode, Suspense } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { AdminSidebar } from '@/components/AdminSidebar';
import { MobileTabBar } from '@/components/MobileTabBar';
import { Outlet } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickCreateMenu } from '@/components/admin/QuickCreateMenu';
import { CommandPalette } from '@/components/admin/CommandPalette';
import { DemoBanner } from '@/components/admin/DemoBanner';
import { AssignmentCustomerStatusRuntime } from '@/components/admin/AssignmentCustomerStatusRuntime';
import { DemoModeProvider, useDemoMode } from '@/hooks/useDemoMode';
import { toast } from 'sonner';

export function AdminShell() {
  return (
    <DemoModeProvider>
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <MobileTabBar />
        <CommandPalette />
        <AssignmentCustomerStatusRuntime />
        <div className="md:ml-60 flex flex-col min-h-screen pb-16 md:pb-0">
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
      className={`hidden md:inline-flex h-9 gap-1.5 ${enabled ? '' : 'border-amber-300/60 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-900/60 dark:text-amber-400 dark:hover:bg-amber-950/30'}`}
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
    <button onClick={trigger} className="hidden md:inline-flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-card hover:bg-secondary text-xs text-muted-foreground transition-colors min-w-[200px]">
      <Search className="h-3.5 w-3.5" />
      <span className="flex-1 text-left">Sök eller hoppa till…</span>
      <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-muted/40 text-[10px] font-mono font-medium text-muted-foreground">{isMac ? '⌘' : 'Ctrl'}K</kbd>
    </button>
  );
}

export function AdminLayout({ children, title, description, actions }: AdminLayoutProps) {
  return (
    <>
      <DemoBanner />
      <header className="h-16 flex items-center gap-3 border-b border-border px-4 md:px-6 bg-card/80 backdrop-blur-sm shrink-0 sticky top-0 z-30">
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-foreground truncate leading-tight tracking-tight">{title}</h1>
          {description && <p className="text-xs text-muted-foreground truncate mt-0.5">{description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SearchTrigger />
          <DemoToggle />
          {actions ?? <QuickCreateMenu />}
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-auto">
        <PageTransition>{children}</PageTransition>
      </main>
    </>
  );
}
