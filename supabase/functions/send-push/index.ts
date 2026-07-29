// Push-sändare för förar-notiser, per plattform:
//  - Android/web → FCM HTTP v1 (RS256-JWT mot FCM_SERVICE_ACCOUNT)
//  - iOS         → APNs HTTP/2 direkt (ES256-JWT mot APNS_KEY_P8)
// Auth: service role bearer ELLER admin vars bolag matchar alla mottagare.
// Städar bort döda tokens (UNREGISTERED / BadDeviceToken / 410).
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

// ─── APNs (iOS) ─────────────────────────────────────────────────────────────

type ApnsConfig = {
  keyP8: string;
  keyId: string;
  teamId: string;
  bundleId: string;
  host: string;
};

function parseApnsConfig(): ApnsConfig | null {
  let keyP8 = Deno.env.get("APNS_KEY_P8") ?? "";
  const keyId = Deno.env.get("APNS_KEY_ID") ?? "";
  const teamId = Deno.env.get("APNS_TEAM_ID") ?? "";
  if (!keyP8 || !keyId || !teamId) return null;
  // Tillåt både rå PEM och base64-kodad PEM (env-hantering av radbrytningar varierar)
  if (!keyP8.includes("BEGIN PRIVATE KEY")) {
    try {
      keyP8 = new TextDecoder().decode(
        Uint8Array.from(atob(keyP8.replace(/\s+/g, "")), (c) => c.charCodeAt(0)),
      );
    } catch {
      return null;
    }
  }
  return {
    keyP8,
    keyId,
    teamId,
    bundleId: Deno.env.get("APNS_BUNDLE_ID") ?? "se.auroramedia.auroratransport",
    host: Deno.env.get("APNS_SANDBOX") === "true"
      ? "https://api.sandbox.push.apple.com"
      : "https://api.push.apple.com",
  };
}

// APNs provider-token får max förnyas var 20:e minut per topic — cacha ~50 min.
let cachedApnsJwt: { jwt: string; createdAt: number } | null = null;

async function getApnsJwt(cfg: ApnsConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedApnsJwt && now - cachedApnsJwt.createdAt < 3000) return cachedApnsJwt.jwt;

  const header = { alg: "ES256", kid: cfg.keyId, typ: "JWT" };
  const claims = { iss: cfg.teamId, iat: now };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(cfg.keyP8),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  // Deno returnerar IEEE-P1363 (r||s) — exakt det ES256-JWS förväntar sig
  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput),
  ));
  const jwt = `${signingInput}.${base64UrlEncode(sig)}`;
  cachedApnsJwt = { jwt, createdAt: now };
  return jwt;
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

  const stringData: Record<string, string> = {};
  for (const [k, v] of Object.entries(extra)) {
    if (v == null) continue;
    stringData[k] = typeof v === "string" ? v : JSON.stringify(v);
  }

  const tokensToRemove: string[] = [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  const iosRows = tokens.filter((t: { platform?: string }) => t.platform === "ios");
  const fcmRows = tokens.filter((t: { platform?: string }) => t.platform !== "ios");

  // ─── iOS via APNs ─────────────────────────────────────────────────────────
  if (iosRows.length > 0) {
    const apns = parseApnsConfig();
    if (!apns) {
      skipped += iosRows.length;
      console.warn("[send-push] APNS_KEY_P8/APNS_KEY_ID/APNS_TEAM_ID saknas — hoppar över iOS-tokens");
    } else {
      const apnsJwt = await getApnsJwt(apns);
      await Promise.all(iosRows.map(async (row: { token: string }) => {
        try {
          const resp = await fetch(`${apns.host}/3/device/${row.token}`, {
            method: "POST",
            headers: {
              authorization: `bearer ${apnsJwt}`,
              "apns-topic": apns.bundleId,
              "apns-push-type": "alert",
              "apns-priority": "10",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              aps: {
                alert: { title, body: message },
                sound: "default",
                "content-available": 1,
              },
              ...extra,
            }),
          });
          if (resp.ok) {
            sent += 1;
            return;
          }
          failed += 1;
          const errBody = await resp.text();
          if (resp.status === 410 || /BadDeviceToken|Unregistered/i.test(errBody)) {
            tokensToRemove.push(row.token);
          }
          console.warn("[send-push] APNs error", resp.status, errBody);
        } catch (err) {
          failed += 1;
          console.warn("[send-push] APNs fetch failed", err);
        }
      }));
    }
  }

  // ─── Android/web via FCM ──────────────────────────────────────────────────
  if (fcmRows.length > 0) {
    let accessToken: string;
    let projectId: string;
    try {
      const sa = parseServiceAccount();
      projectId = sa.project_id;
      accessToken = await getAccessToken(sa);
    } catch (err) {
      return json(500, { error: (err as Error).message });
    }

    const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    await Promise.all(fcmRows.map(async (row: { token: string }) => {
      const payload = {
        message: {
          token: row.token,
          notification: { title, body: message },
          data: stringData,
          android: { priority: "HIGH" as const },
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
  }

  let removed = 0;
  if (tokensToRemove.length > 0) {
    const { error: delError, count } = await serviceClient
      .from("driver_push_tokens")
      .delete({ count: "exact" })
      .in("token", tokensToRemove);
    if (delError) console.warn("[send-push] failed to remove stale tokens", delError);
    else removed = count ?? tokensToRemove.length;
  }

  return json(200, { sent, failed, skipped, removed });
});