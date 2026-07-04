// FCM HTTP v1 push sender for driver notifications.
// Auth: service role bearer OR admin whose company matches all recipients.
// Signs OAuth2 JWT (RS256) using FCM_SERVICE_ACCOUNT (Firebase service account JSON).
// Cleans up UNREGISTERED tokens.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { getEdgeCaller, getSupabaseClients, requireAdminForRecipientCompany } from "../_shared/auth-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri?: string;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64UrlEncode(bytes: Uint8Array | string): string {
  const b = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let bin = "";
  for (const byte of b) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(cleaned);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt - 60 > now) return cachedAccessToken.token;

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput)));
  const jwt = `${signingInput}.${base64UrlEncode(sig)}`;

  const resp = await fetch(sa.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!resp.ok) throw new Error(`OAuth token exchange failed: ${resp.status} ${await resp.text()}`);
  const data = await resp.json() as { access_token: string; expires_in: number };
  cachedAccessToken = { token: data.access_token, expiresAt: now + data.expires_in };
  return data.access_token;
}

function parseServiceAccount(): ServiceAccount {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT");
  if (!raw) throw new Error("FCM_SERVICE_ACCOUNT is not configured");
  const sa = JSON.parse(raw) as ServiceAccount;
  if (!sa.client_email || !sa.private_key || !sa.project_id) {
    throw new Error("FCM_SERVICE_ACCOUNT missing required fields");
  }
  return sa;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

  const caller = await getEdgeCaller(authHeader);
  if (!caller) return json(401, { error: "Unauthorized" });

  let body: { userIds?: unknown; title?: unknown; body?: unknown; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const userIds = Array.isArray(body.userIds) ? body.userIds.filter((v): v is string => typeof v === "string") : [];
  const title = typeof body.title === "string" ? body.title : "";
  const message = typeof body.body === "string" ? body.body : "";
  const extra = body.data && typeof body.data === "object" ? body.data as Record<string, unknown> : {};

  if (userIds.length === 0 || !title || !message) {
    return json(400, { error: "userIds, title and body are required" });
  }

  const authz = await requireAdminForRecipientCompany(caller, userIds);
  if (!authz.ok) return json(403, { error: authz.error ?? "Forbidden" });

  const { serviceClient } = getSupabaseClients(authHeader);

  const { data: tokens, error: tokensError } = await serviceClient
    .from("driver_push_tokens")
    .select("token, platform, user_id")
    .in("user_id", userIds);
  if (tokensError) return json(500, { error: tokensError.message });
  if (!tokens || tokens.length === 0) return json(200, { sent: 0, failed: 0, removed: 0 });

  let sa: ServiceAccount;
  let accessToken: string;
  try {
    sa = parseServiceAccount();
    accessToken = await getAccessToken(sa);
  } catch (err) {
    return json(500, { error: (err as Error).message });
  }

  const stringData: Record<string, string> = {};
  for (const [k, v] of Object.entries(extra)) {
    if (v == null) continue;
    stringData[k] = typeof v === "string" ? v : JSON.stringify(v);
  }

  const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  const tokensToRemove: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(tokens.map(async (row: { token: string }) => {
    const payload = {
      message: {
        token: row.token,
        notification: { title, body: message },
        data: stringData,
        android: { priority: "HIGH" as const },
        apns: { payload: { aps: { sound: "default", "content-available": 1 } } },
      },
    };
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (resp.ok) {
        sent += 1;
        return;
      }
      failed += 1;
      const errBody = await resp.text();
      if (resp.status === 404 || /UNREGISTERED|INVALID_ARGUMENT|NOT_FOUND/i.test(errBody)) {
        tokensToRemove.push(row.token);
      }
      console.warn("[send-push] FCM error", resp.status, errBody);
    } catch (err) {
      failed += 1;
      console.warn("[send-push] fetch failed", err);
    }
  }));

  let removed = 0;
  if (tokensToRemove.length > 0) {
    const { error: delError, count } = await serviceClient
      .from("driver_push_tokens")
      .delete({ count: "exact" })
      .in("token", tokensToRemove);
    if (delError) console.warn("[send-push] failed to remove stale tokens", delError);
    else removed = count ?? tokensToRemove.length;
  }

  return json(200, { sent, failed, removed });
});

// createClient is re-exported to keep the import graph explicit for the runtime.
export { createClient };