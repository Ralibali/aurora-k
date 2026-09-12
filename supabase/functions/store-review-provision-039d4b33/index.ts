// Local template only. Generate the pinned source with --prepare-function.
// The generated source contains hashes, never the password or authorization secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const pinned = {
  "projectRef": "dqjwtnziasqtveuwnalx",
  "userId": "039d4b33-ab0a-4c80-a697-637df926d419",
  "email": "store-review-039d4b33-ab0a-4c80-a697-637df926d419@aurora.test",
  "fullName": "Granskningschaufför",
  "expiresAt": "2026-09-12T12:43:06.329Z",
  "secretHash": "d2fa9bbd0dabdaae28d4328ac6ef76a5c408d34d208f7015562ee6b8abdf4699",
  "passwordHash": "12d5c0977ed31eefe84c991c78e2313d6c1f8e52a08f1ba0dc03cf84150a036e"
};
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});
async function sha256(value: string) {
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,"0")).join("");
}
Deno.serve(async req => {
  // There are no list, reset, read-customer, role-update or arbitrary-user paths.
  if (req.method!=="POST") return json({error:"Method not allowed"},405);
  if (Date.now()>=Date.parse(pinned.expiresAt)) return json({error:"Expired"},410);
  const secret=req.headers.get("x-review-provision-key") ?? "";
  if (secret.length!==43 || await sha256(secret)!==pinned.secretHash) return json({error:"Unauthorized"},401);
  const url=Deno.env.get("SUPABASE_URL");
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (url!==`https://${pinned.projectRef}.supabase.co` || !serviceKey) return json({error:"Wrong backend configuration"},503);
  try {
    if (Number(req.headers.get("content-length") ?? 0)>512) return json({error:"Request too large"},413);
    const text=await req.text();
    if (text.length>512) return json({error:"Request too large"},413);
    const body=JSON.parse(text);
    if (typeof body.password!=="string" || Object.keys(body).length!==1 || await sha256(body.password)!==pinned.passwordHash) return json({error:"Invalid request"},400);
    const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    // createUser is insert-only. The pinned ID + email enforce one-use without
    // a reusable admin route, lookup, reset, replacement or mutable allowlist.
    const {data,error}=await admin.auth.admin.createUser({
      id:pinned.userId,email:pinned.email,password:body.password,email_confirm:true,
      user_metadata:{full_name:pinned.fullName},
    });
    if (error || !data.user || data.user.id!==pinned.userId || data.user.email!==pinned.email || !data.user.email_confirmed_at) return json({error:"Creation failed; inspect the pinned identity before retrying"},409);
    return json({success:true,userId:data.user.id});
  } catch {
    // Avoid logging headers, request body, service key or Auth response.
    return json({error:"Provisioning failed; inspect the pinned identity before retrying"},500);
  }
});
