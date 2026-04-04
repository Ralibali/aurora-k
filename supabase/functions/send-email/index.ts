import { corsHeaders } from "npm:@supabase/supabase-js@2.100.1/cors";
import { assignmentConfirmationEmail } from "../_shared/email-templates.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const TEMPLATE_MAP: Record<string, (data: any) => { subject: string; html: string }> = {
  'assignment-confirmation': assignmentConfirmationEmail,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const body = await req.json();
    const { to, templateName, templateData } = body;
    let { subject, html } = body;

    // If a template is specified, use it to generate subject + html
    if (templateName) {
      const templateFn = TEMPLATE_MAP[templateName];
      if (!templateFn) {
        return new Response(JSON.stringify({ error: `Unknown template: ${templateName}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = templateFn(templateData || {});
      subject = result.subject;
      html = result.html;
    }

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing to, subject, or html" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Aurora Transport <noreply@auroratransport.se>",
        to: [to],
        subject,
        html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("[send-email] Resend error:", result);
      return new Response(JSON.stringify({ error: "Email send failed", details: result }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[send-email] Sent to ${to}: ${subject}`);
    return new Response(JSON.stringify({ success: true, id: result.id }), {
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
