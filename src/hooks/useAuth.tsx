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

  const fetchRole = useCallback(async (userId: string) => {
    if (roleCache.current[userId]) {
      return roleCache.current[userId];
    }
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    const r = (data?.role as 'admin' | 'driver') ?? null;
    if (r) roleCache.current[userId] = r;
    return r;
  }, []);

  useEffect(() => {
    let mounted = true;

    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        if (newSession?.user) {
          const r = await fetchRole(newSession.user.id);
          if (mounted) {
            setRole(r);
            setLoading(false);
          }
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(async ({ data: { session: initial } }) => {
      if (!mounted) return;
      // Only set if onAuthStateChange hasn't already fired
      if (initial?.user) {
        setSession(initial);
        const r = await fetchRole(initial.user.id);
        if (mounted) {
          setRole(r);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchRole]);

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
