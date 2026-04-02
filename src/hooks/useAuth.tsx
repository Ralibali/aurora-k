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

const roleCache: Record<string, 'admin' | 'driver'> = {};

async function fetchRole(userId: string): Promise<'admin' | 'driver' | null> {
  if (roleCache[userId]) return roleCache[userId];
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  const r = (data?.role as 'admin' | 'driver') ?? null;
  if (r) roleCache[userId] = r;
  return r;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'driver' | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let ignore = false;

    const apply = async (s: Session | null) => {
      if (ignore) return;
      setSession(s);
      if (s?.user) {
        const r = await fetchRole(s.user.id);
        if (!ignore) {
          setRole(r);
          setLoading(false);
        }
      } else {
        setRole(null);
        setLoading(false);
      }
    };

    // 1. Set up listener FIRST so we don't miss events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        apply(newSession);
      }
    );

    // 2. Then get initial session
    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      apply(initial);
    });

    return () => {
      ignore = true;
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    delete roleCache[Object.keys(roleCache)[0]];
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
