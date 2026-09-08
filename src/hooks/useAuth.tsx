import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { removeCurrentDevicePushToken } from '@/lib/push-notifications';

type AuthProfile = { role: 'admin' | 'driver' | null; companyId: string | null; isPlatformAdmin: boolean };
const emptyProfile: AuthProfile = { role: null, companyId: null, isPlatformAdmin: false };
interface AuthContextType extends AuthProfile {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<AuthProfile>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType>({
  ...emptyProfile, session: null, user: null, loading: true, error: null,
  refreshProfile: async () => emptyProfile, signOut: async () => {},
});

async function fetchProfile(userId: string): Promise<AuthProfile> {
  const [{ data: roles, error: rolesError }, { data: profile, error: profileError }, { data: platformAdmin, error: platformError }] = await Promise.all([
    supabase.from('user_roles').select('role, company_id').eq('user_id', userId),
    supabase.from('profiles').select('company_id, role').eq('id', userId).maybeSingle(),
    supabase.rpc('is_platform_admin', { _user_id: userId }),
  ]);
  if (rolesError || profileError || platformError) throw rolesError || profileError || platformError;
  // Roles come from protected database membership, never editable user metadata.
  const role = roles?.some(row => row.role === 'admin') ? 'admin' : roles?.some(row => row.role === 'driver') ? 'driver' : null;
  return { role, companyId: roles?.find(row => row.role === role)?.company_id ?? profile?.company_id ?? null, isPlatformAdmin: Boolean(platformAdmin) };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const revision = useRef(0);
  const currentUser = useRef<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const { data: { session: current }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!current?.user) throw new Error('Logga in igen för att fortsätta.');
    const request = ++revision.current;
    if (currentUser.current !== current.user.id) { queryClient.clear(); setProfile(emptyProfile); setLoading(true); }
    currentUser.current = current.user.id;
    setSession(current);
    setError(null);
    try {
      const next = await fetchProfile(current.user.id);
      if (mounted.current && request === revision.current) { setProfile(next); setLoading(false); }
      return next;
    } catch (cause) {
      if (mounted.current && request === revision.current) { setError('Kontouppgifterna kunde inte hämtas. Försök igen.'); setLoading(false); }
      throw cause;
    }
  }, [queryClient]);

  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    let receivedAuthEvent = false;
    const apply = async (nextSession: Session | null) => {
      if (disposed) return;
      const request = ++revision.current;
      const changedUser = currentUser.current !== (nextSession?.user.id ?? null);
      currentUser.current = nextSession?.user.id ?? null;
      setSession(nextSession);
      setError(null);
      if (changedUser) { queryClient.clear(); setProfile(emptyProfile); }
      if (!nextSession) { setProfile(emptyProfile); setLoading(false); return; }
      if (changedUser) setLoading(true);
      try {
        const next = await fetchProfile(nextSession.user.id);
        if (!disposed && request === revision.current) setProfile(next);
      } catch {
        if (!disposed && request === revision.current) setError('Kontouppgifterna kunde inte hämtas. Försök igen.');
      } finally {
        if (!disposed && request === revision.current) setLoading(false);
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'INITIAL_SESSION') return;
      receivedAuthEvent = true;
      // Defer requests until Supabase releases its auth callback lock.
      window.setTimeout(() => { void apply(nextSession); }, 0);
    });
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (disposed || receivedAuthEvent) return;
      if (sessionError) { setError('Inloggningen kunde inte läsas. Försök igen.'); setLoading(false); }
      else void apply(data.session);
    }).catch(() => {
      if (!disposed && !receivedAuthEvent) { setError('Inloggningen kunde inte läsas. Försök igen.'); setLoading(false); }
    });
    return () => { disposed = true; mounted.current = false; subscription.unsubscribe(); };
  }, [queryClient]);

  const signOut = useCallback(async () => {
    try { await removeCurrentDevicePushToken(currentUser.current); }
    catch { console.warn('[auth] Push cleanup failed during sign out'); }
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    revision.current++;
    queryClient.clear();
    currentUser.current = null;
    setSession(null); setProfile(emptyProfile); setError(null); setLoading(false);
  }, [queryClient]);

  return <AuthContext.Provider value={{ ...profile, session, user: session?.user ?? null, loading, error, refreshProfile, signOut }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
