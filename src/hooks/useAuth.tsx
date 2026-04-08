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

const profileCache: Record<string, { role: 'admin' | 'driver' | null; companyId: string | null }> = {};

async function fetchProfile(userId: string): Promise<{ role: 'admin' | 'driver' | null; companyId: string | null }> {
  if (profileCache[userId]) return profileCache[userId];

  const [{ data: roleRows, error: rolesError }, { data: profileData, error: profileError }] = await Promise.all([
    supabase
      .from('user_roles')
      .select('role, company_id')
      .eq('user_id', userId),
    supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  if (rolesError) {
    console.warn('[Auth] failed to load user roles:', rolesError.message);
  }

  if (profileError) {
    console.warn('[Auth] failed to load profile:', profileError.message);
  }

  const resolvedRole = roleRows?.some((row) => row.role === 'admin')
    ? 'admin'
    : (roleRows?.[0]?.role as 'admin' | 'driver' | undefined) ??
      (profileData?.role === 'admin' || profileData?.role === 'driver' ? profileData.role : null);

  const companyIdFromRoles =
    roleRows?.find((row) => row.role === resolvedRole)?.company_id ??
    roleRows?.find((row) => !!row.company_id)?.company_id ??
    null;

  const result = {
    role: resolvedRole,
    companyId: companyIdFromRoles ?? profileData?.company_id ?? null,
  };

  if (result.role || result.companyId) {
    profileCache[userId] = result;
  }

  return result;
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
      if (import.meta.env.DEV) console.log('[Auth] apply called from', source, 'session:', !!s);
      setSession(s);
      if (s?.user) {
        const profile = await fetchProfile(s.user.id);
        if (import.meta.env.DEV) console.log('[Auth] profile resolved:', profile, 'ignore:', ignore);
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
        if (import.meta.env.DEV) console.log('[Auth] onAuthStateChange event:', _event);
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
    const currentUserId = session?.user?.id;
    await supabase.auth.signOut();
    if (currentUserId) delete profileCache[currentUserId];
    setSession(null);
    setRole(null);
    setCompanyId(null);
  }, [session]);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, role, companyId, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
