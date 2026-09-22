import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export async function loadAssignmentArticles(assignmentIds: string[]) {
  const rows: Tables<'assignment_articles'>[] = [];
  const ids = [...new Set(assignmentIds)];
  // Bound URL length and paginate so the API row limit never drops invoice lines.
  for (let chunk = 0; chunk < ids.length; chunk += 100) {
    for (let start = 0; ; start += 1000) {
      const { data, error } = await supabase.from('assignment_articles').select('*')
        .in('assignment_id', ids.slice(chunk, chunk + 100)).order('id').range(start, start + 999);
      if (error) throw error;
      if (!data) throw new Error('Artiklarna kunde inte hämtas. Försök igen.');
      rows.push(...data);
      if (data.length < 1000) break;
    }
  }
  return rows;
}
