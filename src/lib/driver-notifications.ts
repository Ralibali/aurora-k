import { supabase } from '@/integrations/supabase/client';

export function sendDriverAssignmentPush(
  userId: string | null | undefined,
  title: string,
  body: string,
  assignmentId: string,
) {
  if (!userId || !assignmentId) return;

  supabase.functions.invoke('send-push', {
    body: {
      userIds: [userId],
      title,
      body,
      data: { assignmentId },
    },
  }).catch((err) => console.warn('[send-push] failed', err));
}
