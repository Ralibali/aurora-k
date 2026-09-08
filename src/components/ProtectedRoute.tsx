import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { getRegistrationDraft } from '@/features/onboarding/registration-service';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'driver';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { session, role, loading, error, refreshProfile, signOut } = useAuth();

  // Still loading auth state, or session exists but role hasn't resolved yet
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!error && !role && getRegistrationDraft(session.user.user_metadata)) return <Navigate to="/register" replace />;
  if (error || !role) return <div className="flex min-h-screen items-center justify-center p-6"><div className="max-w-md space-y-4 rounded-xl border bg-card p-6"><h1 className="font-semibold">Kontot kunde inte öppnas</h1><p className="text-sm text-muted-foreground">{error || 'Kontot saknar en företagsroll. Be administratören kontrollera din inbjudan.'}</p><Button onClick={() => void refreshProfile().catch(() => {})}>Försök igen</Button><Button variant="ghost" onClick={() => void signOut()}>Logga ut</Button></div></div>;

  if (requiredRole && role !== requiredRole) {
    // Redirect to correct area
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'driver') return <Navigate to="/driver" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
