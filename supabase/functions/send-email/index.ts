import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2.100.1/cors";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

const FOOTER = `
<div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;line-height:1.6">
  <p style="margin:0">Aurora Media AB · Org.nr 559272-0220</p>
  <p style="margin:4px 0 0">Frågor? <a href="mailto:info@auroramedia.se" style="color:#6b7280">info@auroramedia.se</a></p>
</div>`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing to, subject, or html" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullHtml = `
<!DOCTYPE html>
<html lang="sv">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <div style="text-align:center;margin-bottom:32px">
    <div style="display:inline-block;width:40px;height:40px;background:#2563eb;border-radius:12px;line-height:40px;font-size:20px">🚛</div>
  </div>
  <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
    ${html}
  </div>
  ${FOOTER}
</div>
</body>
</html>`;

    const res = await fetch(BREVO_URL, {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Aurora Transport", email: "noreply@auroramedia.se" },
        to: [{ email: to }],
        subject,
        htmlContent: fullHtml,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("[send-email] Brevo error:", result);
      return new Response(JSON.stringify({ error: "Email send failed", details: result }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[send-email] Sent to ${to}: ${subject}`);
    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-email] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
