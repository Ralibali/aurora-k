import { useAuth } from './useAuth';

export function usePlatformAdmin() {
  const { isPlatformAdmin, loading } = useAuth();
  return { isPlatformAdmin, loading };
}
