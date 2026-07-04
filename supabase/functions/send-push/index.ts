import { corsHeaders } from "npm:@supabase/supabase-js@2.100.1/cors";
import { getEdgeCaller, getSupabaseClients, requireAdminForRecipientCompany } from "../_shared/auth-helpers.ts";

type SendPushBody = {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fcmData(data?: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data ?? {})
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );
}

function staleFcmToken(payload: unknown) {
  const serialized = JSON.stringify(payload);
  return serialized.includes("UNREGISTERED") || serialized.includes("registration-token-not-registered");
}

async function getAccessToken() {
  const tokenEndpoint = Deno.env.get("FCM_TOKEN_ENDPOINT") ?? "https://oauth2.googleapis.com/token";
  const assertion = Deno.env.get("FCM_OAUTH_ASSERTION");
  if (!assertion) throw new Error("FCM_OAUTH_ASSERTION is not configured");

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    console.error("[send-push] FCM auth failed", payload);
    throw new Error("Could not authorize FCM request");
  }
  return payload.access_token as string;
}

async function sendFcmMessage(params: {
  projectId: string;
  accessToken: string;
  token: string;
  title: string;
  body: string;
  data: Record<string, string>;
}) {
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${params.projectId}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token: params.token,
        notification: { title: params.title, body: params.body },
        data: params.data,
        android: { priority: "HIGH", notification: { channel_id: "assignments" } },
        apns: { payload: { aps: { sound: "default" } } },
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const caller = await getEdgeCaller(authHeader);
    if (!caller) return jsonResponse({ error: "Unauthorized" }, 401);

    const requestBody = (await req.json()) as SendPushBody;
    const userIds = [...new Set(requestBody.userIds ?? [])].filter(Boolean);
    const title = requestBody.title?.trim();
    const body = requestBody.body?.trim();

    if (!userIds.length || !title || !body) return jsonResponse({ error: "Missing userIds, title or body" }, 400);

    const authz = await requireAdminForRecipientCompany(caller, userIds);
    if (!authz.ok) return jsonResponse({ error: authz.error ?? "Forbidden" }, 403);

    const projectId = Deno.env.get("FCM_PROJECT_ID");
    if (!projectId) throw new Error("FCM_PROJECT_ID is not configured");

    const { serviceClient } = getSupabaseClients(authHeader);
    const { data: tokens, error: tokenError } = await serviceClient
      .from("driver_push_tokens")
      .select("id, user_id, token")
      .in("user_id", userIds);

    if (tokenError) throw tokenError;
    if (!tokens?.length) return jsonResponse({ success: true, sent: 0, deleted: 0 });

    const accessToken = await getAccessToken();
    const data = fcmData(requestBody.data);
    const staleIds: string[] = [];
    let sent = 0;
    const failed: Array<{ tokenId: string; status: number; error: unknown }> = [];

    await Promise.all(tokens.map(async (tokenRow: any) => {
      const result = await sendFcmMessage({ projectId, accessToken, token: tokenRow.token, title, body, data });
      if (result.ok) {
        sent += 1;
      } else if (staleFcmToken(result.payload)) {
        staleIds.push(tokenRow.id);
      } else {
        failed.push({ tokenId: tokenRow.id, status: result.status, error: result.payload });
      }
    }));

    if (staleIds.length) {
      const { error: deleteError } = await serviceClient.from("driver_push_tokens").delete().in("id", staleIds);
      if (deleteError) console.warn("[send-push] failed to delete stale tokens", deleteError);
    }

    return jsonResponse({ success: true, sent, deleted: staleIds.length, failed });
  } catch (err) {
    console.error("[send-push] Error", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
