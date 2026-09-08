import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.1';
import { corsHeaders } from '../_shared/cors.ts';
import { driverWelcomeEmail, driverInviteEmail, newLeadNotificationEmail } from '../_shared/email-templates.ts';
import { escapeEmail, safeTemplateData, sendResendMail } from '../_shared/resend.ts';
import { deliverOutbox } from '../_shared/notification-outbox.ts';
import { sitePath } from '../_shared/site-url.ts';
import { invitationIsCurrent, literalEmailPattern, publicLeadTemplateData, validEmail } from './validation.ts';

const ADMIN_EMAIL = 'info@auroramedia.se';
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers:{...corsHeaders,'Content-Type':'application/json'}});
const digest = async (value: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');

Deno.serve(async req => {
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST') return json({error:'Method not allowed'},405);
  try {
    const text=await req.text();
    if(text.length>50_000) return json({error:'Request too large'},413);
    let body: Record<string, unknown>;
    try { body=JSON.parse(text); } catch { return json({error:'Invalid JSON'},400); }
    if(!body || typeof body!=='object' || Array.isArray(body)) return json({error:'Invalid request'},400);
    const data = body.templateData && typeof body.templateData === 'object' && !Array.isArray(body.templateData) ? body.templateData as Record<string, unknown> : {};
    const template=body.templateName;
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,service,{auth:{persistSession:false}});
    const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'').trim();
    const trusted=!!service && token===service;
    let companyId: string | null=null;
    let platform=false;
    let callerName='Transportledningen';
    const isPublic=template==='new-lead-notification' || template==='contact-message';
    if(!trusted && !isPublic) {
      const {data:{user},error}=await admin.auth.getUser(token ?? '');
      if(error||!user) return json({error:'Unauthorized'},401);
      const [{data:role},{data:isPlatform},{data:profile}]=await Promise.all([
        admin.from('user_roles').select('company_id').eq('user_id',user.id).eq('role','admin').maybeSingle(),
        admin.rpc('is_platform_admin',{_user_id:user.id}),
        admin.from('profiles').select('full_name').eq('id',user.id).maybeSingle(),
      ]);
      platform=!!isPlatform; companyId=role?.company_id ?? null; callerName=profile?.full_name || callerName;
      if(!companyId&&!platform) return json({error:'Admin access required'},403);
    }
    if (companyId && !platform && !trusted) {
      const { data: company, error: companyError } = await admin.from('companies').select('org_nr').eq('id', companyId).single();
      if (companyError) throw companyError;
      if (['556000-0001', '556000-0002'].includes(company.org_nr)) return json({error:'Mejl skickas inte från demoföretag.'},403);
    }
    let to=body.to, subject=body.subject, html=body.html;
    let eventKey='';
    if(isPublic) {
      if(!validEmail(data.email) || typeof data.name!=='string' && typeof data.companyName!=='string' && typeof data.firstName!=='string') return json({error:'Kontrollera namn och e-postadress.'},400);
      const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      for(const [key,limit] of [[`public-ip/${await digest(ip)}`,20],[`public-email/${await digest(data.email.toLowerCase())}`,4]] as const) {
        const {data:allowed,error}=await admin.rpc('consume_mail_rate_limit',{p_key:key,p_limit:limit,p_window_seconds:3600});
        if(error) throw error;
        if(!allowed) return json({error:'För många försök. Försök igen senare.'},429);
      }
      to=ADMIN_EMAIL;
      if(template==='contact-message') {
        if(typeof data.message!=='string' || !data.message.trim() || data.message.length>4000) return json({error:'Skriv ett meddelande på högst 4000 tecken.'},400);
        subject='Nytt kontaktmeddelande – Aurora Transport';
        html=`<h1>Nytt kontaktmeddelande</h1><p>${escapeEmail(data.name)} &lt;${escapeEmail(data.email)}&gt;</p><p style="white-space:pre-wrap">${escapeEmail(data.message)}</p>`;
      } else {
        const result=newLeadNotificationEmail(safeTemplateData(publicLeadTemplateData(data)));
        subject=result.subject; html=result.html;
      }
    } else if(template==='driver-invite') {
      let inviteToken='';
      try {inviteToken=new URL(String(data.joinUrl)).searchParams.get('token') || '';} catch {return json({error:'Ogiltig inbjudan'},400);}
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inviteToken)) return json({error:'Ogiltig inbjudan'},400);
      const {data:invite,error}=await admin.from('invitations').select('id,email,company_id,expires_at,created_at,accepted_at,company:companies(name)').eq('token',inviteToken).maybeSingle();
      if(error) throw error;
      if(!invite || !invitationIsCurrent(invite) || (!trusted&&!platform&&invite.company_id!==companyId)) return json({error:'Inbjudan saknas eller har gått ut'},403);
      to=invite.email;
      const company=Array.isArray(invite.company)?invite.company[0]:invite.company;
      ({subject,html}=driverInviteEmail(safeTemplateData({adminName:callerName,companyName:company?.name || 'Ditt företag',joinUrl:sitePath(`/join?token=${encodeURIComponent(inviteToken)}`)})));
      eventKey=`invite/${invite.id}/${new Date().toISOString().slice(0,10)}`;
    } else if(template==='driver-welcome') {
      if(!validEmail(to)) return json({error:'Invalid recipient'},400);
      let query=admin.from('profiles').select('id,full_name,email,company_id,company:companies(name)').ilike('email',literalEmailPattern(to));
      if(!trusted&&!platform) query=query.eq('company_id',companyId).eq('role','driver');
      const {data:profile,error}=await query.maybeSingle();
      if(error) throw error;
      if(!profile) return json({error:'Mottagaren tillhör inte företaget'},403);
      to=profile.email;
      const company=Array.isArray(profile.company)?profile.company[0]:profile.company;
      ({subject,html}=driverWelcomeEmail(safeTemplateData({driverName:profile.full_name,companyName:company?.name || 'Ditt företag',appUrl:sitePath('/login')})));
      eventKey=`welcome/${profile.id}`;
    } else if(template==='support-reply' && (trusted||platform)) {
      const {data:ticket,error}=await admin.from('support_tickets').select('id,created_by,subject,admin_reply,replied_at').eq('id',data.ticketId).maybeSingle();
      if(error) throw error;
      if(!ticket?.admin_reply) return json({error:'Spara svaret innan mejlet skickas.'},400);
      const {data:profile}=await admin.from('profiles').select('email').eq('id',ticket.created_by).single();
      to=profile?.email; subject=`Svar: ${ticket.subject}`;
      html=`<h1>${escapeEmail(ticket.subject)}</h1><p style="white-space:pre-wrap">${escapeEmail(ticket.admin_reply)}</p><p><a href="${sitePath('/admin/support')}">Öppna supportärendet</a></p>`;
      eventKey=`support/${ticket.id}/${ticket.replied_at}`;
    } else if(template==='assignment-confirmation' && companyId) {
      // Older clients may still request this. The database event determines all
      // recipients and content, and keeps bulk/manual creation consistent.
      const delivered = await deliverOutbox(admin,companyId);
      return delivered.failed ? json({error:'Uppdraget är sparat. Mejlaviseringen väntar på ett nytt försök.',...delivered},502) : json({success:true,...delivered});
    } else if(!trusted || template) {
      return json({error:'Unsupported email request'},403);
    }
    if(!validEmail(to)||typeof subject!=='string'||!subject||typeof html!=='string'||!html) return json({error:'Invalid email'},400);
    eventKey ||= `mail/${await digest(JSON.stringify({to,subject,html}))}`;
    const result=await sendResendMail({to,subject,html,...(isPublic&&validEmail(data.email)?{reply_to:data.email}:{})},eventKey);
    return json({success:true,id:result.id});
  } catch(error) {
    console.error('[send-email]',error instanceof Error?error.message:'Request failed');
    return json({error:'Mejlet kunde inte skickas. Försök igen.'},502);
  }
});
