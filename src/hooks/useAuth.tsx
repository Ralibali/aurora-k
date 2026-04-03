import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: 'admin' | 'driver' | null;
  companyId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  companyId: null,
  loading: true,
  signOut: async () => {},
});

const profileCache: Record<string, { role: 'admin' | 'driver'; companyId: string | null }> = {};

async function fetchProfile(userId: string): Promise<{ role: 'admin' | 'driver' | null; companyId: string | null }> {
  if (profileCache[userId]) return profileCache[userId];

  // Fetch role from user_roles
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  // Fetch company_id from profiles
  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single();

  const role = (roleData?.role as 'admin' | 'driver') ?? null;
  const companyId = profileData?.company_id ?? null;

  if (role) {
    profileCache[userId] = { role, companyId };
  }

  return { role, companyId };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'driver' | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let ignore = false;

    let initialDone = false;

    const apply = async (s: Session | null, source: string) => {
      if (ignore) return;
      console.log('[Auth] apply called from', source, 'session:', !!s, 'user:', s?.user?.email);
      setSession(s);
      if (s?.user) {
        const profile = await fetchProfile(s.user.id);
        console.log('[Auth] profile resolved:', profile, 'ignore:', ignore);
        if (!ignore) {
          setRole(profile.role);
          setCompanyId(profile.companyId);
          setLoading(false);
        }
      } else {
        setRole(null);
        setCompanyId(null);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        console.log('[Auth] onAuthStateChange event:', _event);
        if (_event === 'INITIAL_SESSION') return;
        apply(newSession, 'onAuthStateChange:' + _event);
      }
    );

    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      if (!initialDone) {
        initialDone = true;
        apply(initial, 'getSession');
      }
    });

    return () => {
      ignore = true;
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    delete profileCache[Object.keys(profileCache)[0]];
    setSession(null);
    setRole(null);
    setCompanyId(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, role, companyId, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
