import { ReactNode, Suspense } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { AdminSidebar } from '@/components/AdminSidebar';
import { MobileTabBar } from '@/components/MobileTabBar';
import { Outlet } from 'react-router-dom';

/** Shared shell — rendered once, sidebar stays mounted across route changes */
export function AdminShell() {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <MobileTabBar />
      <div className="md:ml-60 flex flex-col min-h-screen pb-16 md:pb-0">
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

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

/** Per-page wrapper — only the header + content area re-renders */
export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  return (
    <>
      <header className="h-14 flex items-center gap-3 border-b border-border px-4 md:px-6 bg-card shrink-0 sticky top-0 z-30">
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
