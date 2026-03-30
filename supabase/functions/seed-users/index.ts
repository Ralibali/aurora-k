import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const users = [
    { email: "info@auroramedia.se", password: "transport", fullName: "Maria Andersson", role: "admin" as const },
    { email: "christofferh91@gmail.com", password: "förare", fullName: "Christoffer H", role: "driver" as const },
  ];

  const results = [];

  for (const u of users) {
    // Check if user exists
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existing?.users?.find((x) => x.email === u.email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      results.push({ email: u.email, status: "already exists", id: userId });
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.fullName },
      });
      if (error) {
        results.push({ email: u.email, status: "error", error: error.message });
        continue;
      }
      userId = data.user.id;
      results.push({ email: u.email, status: "created", id: userId });
    }

    // Upsert profile
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email: u.email,
      full_name: u.fullName,
      role: u.role,
    }, { onConflict: "id" });

    // Upsert user_role
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", u.role)
      .maybeSingle();

    if (!existingRole) {
      await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: u.role,
      });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
