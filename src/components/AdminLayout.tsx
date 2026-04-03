import { ReactNode } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/AdminSidebar';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b px-4 md:px-6 bg-card shrink-0 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="h-6 w-px bg-border" />
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-foreground truncate leading-tight">{title}</h1>
              {description && <p className="text-[11px] text-muted-foreground truncate">{description}</p>}
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
