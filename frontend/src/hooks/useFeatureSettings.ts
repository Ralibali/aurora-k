import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface FeatureSetting {
  id: string;
  feature_key: string;
  enabled: boolean;
  label: string;
  description: string | null;
  category: string;
  sort_order: number;
}

const DEFAULT_FEATURE_SETTINGS: FeatureSetting[] = [
  { id: 'default-assignments', feature_key: 'assignments', enabled: true, label: 'Uppdrag', description: null, category: 'Operativt', sort_order: 1 },
  { id: 'default-calendar', feature_key: 'calendar', enabled: true, label: 'Kalender', description: null, category: 'Operativt', sort_order: 2 },
  { id: 'default-orders', feature_key: 'orders', enabled: true, label: 'Beställningar', description: null, category: 'Operativt', sort_order: 3 },
  { id: 'default-live-map', feature_key: 'live_map', enabled: true, label: 'Live-karta', description: null, category: 'Operativt', sort_order: 4 },
  { id: 'default-routes', feature_key: 'routes', enabled: true, label: 'Ruttoptimering', description: null, category: 'Operativt', sort_order: 5 },
  { id: 'default-drivers', feature_key: 'drivers', enabled: true, label: 'Chaufförer', description: null, category: 'Personal', sort_order: 10 },
  { id: 'default-vehicles', feature_key: 'vehicles', enabled: true, label: 'Fordon', description: null, category: 'Personal', sort_order: 11 },
  { id: 'default-absences', feature_key: 'absences', enabled: true, label: 'Frånvaro', description: null, category: 'Personal', sort_order: 12 },
  { id: 'default-external-resources', feature_key: 'external_resources', enabled: true, label: 'Externa resurser', description: null, category: 'Personal', sort_order: 13 },
  { id: 'default-customers', feature_key: 'customers', enabled: true, label: 'Kunder', description: null, category: 'Kunder', sort_order: 20 },
  { id: 'default-booking-requests', feature_key: 'booking_requests', enabled: true, label: 'Förfrågningar', description: null, category: 'Kunder', sort_order: 21 },
  { id: 'default-satisfaction', feature_key: 'satisfaction', enabled: true, label: 'Kundnöjdhet', description: null, category: 'Kunder', sort_order: 22 },
  { id: 'default-invoices', feature_key: 'invoices', enabled: true, label: 'Fakturering', description: null, category: 'Ekonomi', sort_order: 30 },
  { id: 'default-invoice-templates', feature_key: 'invoice_templates', enabled: true, label: 'Fakturamallar', description: null, category: 'Ekonomi', sort_order: 31 },
  { id: 'default-reports', feature_key: 'reports', enabled: true, label: 'Tidrapporter', description: null, category: 'Ekonomi', sort_order: 32 },
  { id: 'default-statistics', feature_key: 'statistics', enabled: true, label: 'Statistik', description: null, category: 'Ekonomi', sort_order: 33 },
  { id: 'default-articles', feature_key: 'articles', enabled: true, label: 'Artiklar', description: null, category: 'Register', sort_order: 40 },
  { id: 'default-order-templates', feature_key: 'order_templates', enabled: true, label: 'Mallar', description: null, category: 'Register', sort_order: 41 },
  { id: 'default-driver-settings', feature_key: 'driver_settings', enabled: true, label: 'Förarapp', description: null, category: 'System', sort_order: 50 },
  { id: 'default-notifications', feature_key: 'notifications', enabled: true, label: 'Notiser', description: null, category: 'System', sort_order: 51 },
  { id: 'default-approvals', feature_key: 'approvals', enabled: true, label: 'Attestering', description: null, category: 'System', sort_order: 52 },
  { id: 'default-environment', feature_key: 'environment', enabled: true, label: 'Miljödata', description: null, category: 'System', sort_order: 53 },
  { id: 'default-api', feature_key: 'api', enabled: true, label: 'API', description: null, category: 'System', sort_order: 54 },
];

const hasPersistedId = (id: string) => !id.startsWith('default-');

function mergeFeatureSettings(companyFeatures: FeatureSetting[] = []) {
  const companyFeaturesByKey = new Map(companyFeatures.map((feature) => [feature.feature_key, feature]));

  const mergedDefaults = DEFAULT_FEATURE_SETTINGS.map((feature) => companyFeaturesByKey.get(feature.feature_key) ?? feature);
  const extraCompanyFeatures = companyFeatures.filter(
    (feature) => !DEFAULT_FEATURE_SETTINGS.some((defaultFeature) => defaultFeature.feature_key === feature.feature_key),
  );

  return [...mergedDefaults, ...extraCompanyFeatures].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));
}

export function useFeatureSettings() {
  const { companyId } = useAuth();

  return useQuery({
    queryKey: ['feature_settings', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_settings')
        .select('*')
        .eq('company_id', companyId)
        .order('sort_order');

      if (error) throw error;
      return mergeFeatureSettings((data as FeatureSetting[]) ?? []);
    },
    enabled: !!companyId,
  });
}

export function useToggleFeature() {
  const qc = useQueryClient();
  const { companyId } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      enabled,
      featureKey,
      label,
      description,
      category,
      sortOrder,
    }: {
      id: string;
      enabled: boolean;
      featureKey: string;
      label: string;
      description: string | null;
      category: string;
      sortOrder: number;
    }) => {
      if (!companyId) {
        throw new Error('Det finns inget företag kopplat till kontot ännu.');
      }

      if (hasPersistedId(id)) {
        const { error } = await supabase
          .from('feature_settings')
          .update({ enabled, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;
        return;
      }

      const { data: existing, error: lookupError } = await supabase
        .from('feature_settings')
        .select('id')
        .eq('company_id', companyId)
        .eq('feature_key', featureKey)
        .limit(1)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existing?.id) {
        const { error } = await supabase
          .from('feature_settings')
          .update({ enabled, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (error) throw error;
        return;
      }

      const { error } = await supabase.from('feature_settings').insert({
        company_id: companyId,
        feature_key: featureKey,
        enabled,
        label,
        description,
        category,
        sort_order: sortOrder,
      });

      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feature_settings', companyId] }),
  });
}

export function useResetAllFeatures() {
  const qc = useQueryClient();
  const { companyId } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!companyId) {
        throw new Error('Det finns inget företag kopplat till kontot ännu.');
      }

      const { data: existing, error: fetchError } = await supabase
        .from('feature_settings')
        .select('id, feature_key')
        .eq('company_id', companyId);

      if (fetchError) throw fetchError;

      const updateResults = await Promise.all(
        (existing ?? []).map((feature) =>
          supabase
            .from('feature_settings')
            .update({ enabled: true, updated_at: new Date().toISOString() })
            .eq('id', feature.id),
        ),
      );

      const updateError = updateResults.find((result) => result.error)?.error;
      if (updateError) throw updateError;

      const existingKeys = new Set((existing ?? []).map((feature) => feature.feature_key));
      const missingDefaults = DEFAULT_FEATURE_SETTINGS.filter((feature) => !existingKeys.has(feature.feature_key)).map((feature) => ({
        company_id: companyId,
        feature_key: feature.feature_key,
        enabled: true,
        label: feature.label,
        description: feature.description,
        category: feature.category,
        sort_order: feature.sort_order,
      }));

      if (missingDefaults.length > 0) {
        const { error: insertError } = await supabase.from('feature_settings').insert(missingDefaults);
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feature_settings', companyId] }),
  });
}

/** Returns a Set of enabled feature keys for quick lookup */
export function useEnabledFeatures() {
  const { data, isLoading } = useFeatureSettings();
  const enabledSet = new Set(
    (data ?? []).filter(f => f.enabled).map(f => f.feature_key)
  );
  return { enabledFeatures: enabledSet, isLoading, isEmpty: !data || data.length === 0 };
}
