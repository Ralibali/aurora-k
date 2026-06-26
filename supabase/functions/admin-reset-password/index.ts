import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await admin.auth.admin.updateUserById(
    "15b59e10-3e5d-47a3-8057-5025ba939323",
    { password: "Isabelle1993" }
  );
  return new Response(JSON.stringify({ ok: !error, error: error?.message }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
