import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { useAuth } from '@/hooks/useAuth';

export function PlatformAdminGuard({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isPlatformAdmin, loading } = usePlatformAdmin();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isPlatformAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
