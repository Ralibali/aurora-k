import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function usePlatformAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsPlatformAdmin(false);
      setLoading(false);
      return;
    }

    supabase
      .from('platform_admins' as any)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsPlatformAdmin(!!data);
        setLoading(false);
      });
  }, [user, authLoading]);

  return { isPlatformAdmin, loading };
}
