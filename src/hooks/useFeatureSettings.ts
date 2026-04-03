import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FeatureSetting {
  id: string;
  feature_key: string;
  enabled: boolean;
  label: string;
  description: string | null;
  category: string;
  sort_order: number;
}

export function useFeatureSettings() {
  return useQuery({
    queryKey: ['feature_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_settings')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as FeatureSetting[];
    },
  });
}

export function useToggleFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('feature_settings')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feature_settings'] }),
  });
}

export function useResetAllFeatures() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('feature_settings')
        .update({ enabled: true, updated_at: new Date().toISOString() })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // match all rows
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feature_settings'] }),
  });
}

/** Returns a Set of enabled feature keys for quick lookup */
export function useEnabledFeatures() {
  const { data, isLoading } = useFeatureSettings();
  const enabledSet = new Set(
    (data ?? []).filter(f => f.enabled).map(f => f.feature_key)
  );
  // If still loading, assume all enabled so sidebar doesn't flash
  return { enabledFeatures: enabledSet, isLoading, isEmpty: !data || data.length === 0 };
}
