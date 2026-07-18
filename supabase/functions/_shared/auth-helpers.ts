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

  const { data: adminRoleRows, error: roleError } = await callerClient
    .from("user_roles")
    .select("company_id, role")
    .eq("user_id", caller.userId)
    .eq("role", "admin");

  if (roleError) return { ok: false, error: roleError.message };

  const adminCompanyIds = new Set((adminRoleRows ?? []).map((row: { company_id: string | null }) => row.company_id).filter(Boolean));

  if (adminCompanyIds.size === 0) {
    const { data: profile, error: profileError } = await callerClient
      .from("profiles")
      .select("company_id, role")
      .eq("id", caller.userId)
      .maybeSingle();

    if (profileError) return { ok: false, error: profileError.message };
    if (profile?.role === "admin" && profile.company_id) adminCompanyIds.add(profile.company_id);
  }

  if (adminCompanyIds.size === 0) return { ok: false, error: "Admin role required" };

  const { data: recipientProfiles, error: recipientsError } = await serviceClient
    .from("profiles")
    .select("id, company_id")
    .in("id", userIds);

  if (recipientsError) return { ok: false, error: recipientsError.message };
  if ((recipientProfiles ?? []).length !== userIds.length) return { ok: false, error: "Recipient not found" };

  const allSameCompany = (recipientProfiles ?? []).every((profile: { company_id: string | null }) => adminCompanyIds.has(profile.company_id));
  if (!allSameCompany) return { ok: false, error: "Recipients must belong to your company" };

  return { ok: true };
}
