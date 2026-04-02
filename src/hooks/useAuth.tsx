import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: 'admin' | 'driver' | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'driver' | null>(null);
  const [loading, setLoading] = useState(true);
  const roleCache = useRef<Record<string, 'admin' | 'driver'>>({});
  const mounted = useRef(true);

  const applySession = useCallback((newSession: Session | null) => {
    if (!mounted.current) return;

    setSession(newSession);
    // Unblock UI immediately
    setLoading(false);

    if (newSession?.user) {
      const userId = newSession.user.id;
      // Return cached role instantly if available
      if (roleCache.current[userId]) {
        setRole(roleCache.current[userId]);
        return;
      }
      // Fetch role in background — UI is already unblocked
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single()
        .then(({ data }) => {
          if (!mounted.current) return;
          const r = (data?.role as 'admin' | 'driver') ?? null;
          if (r) roleCache.current[userId] = r;
          setRole(r);
        });
    } else {
      setRole(null);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    // Get initial session first
    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      applySession(initial);
    });

    // Then listen for changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        applySession(newSession);
      }
    );

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    roleCache.current = {};
    setSession(null);
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
