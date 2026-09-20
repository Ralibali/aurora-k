import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

export type EdgeCaller = {
  isServiceRole: boolean;
  userId: string | null;
  authHeader: string;
};

export function getSupabaseClients(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  return {
    callerClient: createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    }),
    serviceClient: createClient(supabaseUrl, serviceKey),
  };
}

export async function getEdgeCaller(authHeader: string): Promise<EdgeCaller | null> {
  const { callerClient } = getSupabaseClients(authHeader);
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await callerClient.auth.getClaims(token);
  if (error || !data?.claims) return null;

  return {
    isServiceRole: data.claims.role === "service_role",
    userId: typeof data.claims.sub === "string" ? data.claims.sub : null,
    authHeader,
  };
}

export async function requireAdminForRecipientCompany(
  caller: EdgeCaller,
  userIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (caller.isServiceRole) return { ok: true };
  if (!caller.userId) return { ok: false, error: "Unauthorized" };

  const { callerClient, serviceClient } = getSupabaseClients(caller.authHeader);

  // The profile supplies only the current tenant. Authorization must come from
  // protected membership in that same tenant, never the profile's display role.
  const { data: profile, error: profileError } = await callerClient
    .from("profiles")
    .select("company_id")
    .eq("id", caller.userId)
    .maybeSingle();

  if (profileError) return { ok: false, error: profileError.message };
  if (!profile?.company_id) return { ok: false, error: "Admin role required" };

  const { data: adminRole, error: roleError } = await callerClient
    .from("user_roles")
    .select("company_id")
    .eq("user_id", caller.userId)
    .eq("company_id", profile.company_id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError) return { ok: false, error: roleError.message };
  if (adminRole?.company_id !== profile.company_id) return { ok: false, error: "Admin role required" };

  const { data: recipientProfiles, error: recipientsError } = await serviceClient
    .from("profiles")
    .select("id, company_id")
    .in("id", userIds);

  if (recipientsError) return { ok: false, error: recipientsError.message };
  if ((recipientProfiles ?? []).length !== userIds.length) return { ok: false, error: "Recipient not found" };

  const allSameCompany = (recipientProfiles ?? []).every((recipient: { company_id: string | null }) => recipient.company_id === profile.company_id);
  if (!allSameCompany) return { ok: false, error: "Recipients must belong to your company" };

  return { ok: true };
}
