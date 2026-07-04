import { supabase } from '@/integrations/supabase/client';
import { PUBLIC_SITE_URL } from '@/lib/constants';

export type DriverInvite = { name: string; email: string };

export async function saveOnboardingCompany(companyId: string, name: string, orgNumber: string) {
  const { error } = await supabase.from('companies').update({
    name: name.trim(),
    org_nr: orgNumber.trim() || null,
  }).eq('id', companyId);
  if (error) throw error;
}

export async function sendOnboardingInvites(input: {
  companyId: string;
  companyName: string;
  adminName: string;
  invites: DriverInvite[];
}) {
  const sent: DriverInvite[] = [];
  const failed: Array<DriverInvite & { reason: string }> = [];

  for (const invite of input.invites.filter(item => item.email.trim())) {
    const email = invite.email.trim().toLowerCase();
    const { data, error: insertError } = await supabase.from('invitations').insert({
      company_id: input.companyId,
      email,
      name: invite.name.trim() || null,
    }).select('id, token').single();

    if (insertError || !data?.token) {
      failed.push({ ...invite, email, reason: insertError?.message || 'Inbjudan kunde inte skapas' });
      continue;
    }

    const joinUrl = `${PUBLIC_SITE_URL}/join?token=${data.token}`;
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        templateName: 'driver-invite',
        templateData: { adminName: input.adminName, companyName: input.companyName, joinUrl },
      },
    });

    if (emailError) {
      await supabase.from('invitations').delete().eq('id', data.id);
      failed.push({ ...invite, email, reason: emailError.message });
      continue;
    }

    sent.push({ ...invite, email });
  }

  return { sent, failed };
}

export async function createOnboardingAssignment(input: {
  companyId: string;
  customerName: string;
  title: string;
  scheduledStart: string;
  pickupAddress: string;
  deliveryAddress: string;
  driverId: string;
}) {
  if (!input.driverId) throw new Error('Välj en chaufför innan uppdraget skapas');

  const { data: customer, error: customerError } = await supabase.from('customers').insert({
    company_id: input.companyId,
    name: input.customerName.trim(),
  }).select('id').single();
  if (customerError || !customer) throw customerError || new Error('Kunden kunde inte skapas');

  const pickup = input.pickupAddress.trim();
  const delivery = input.deliveryAddress.trim();
  const { error: assignmentError } = await supabase.from('assignments').insert({
    company_id: input.companyId,
    customer_id: customer.id,
    assigned_driver_id: input.driverId,
    title: input.title.trim(),
    scheduled_start: new Date(input.scheduledStart).toISOString(),
    address: pickup || delivery || 'Ej angiven',
    pickup_address: pickup || null,
    delivery_address: delivery || null,
    status: 'pending',
  });
  if (assignmentError) {
    await supabase.from('customers').delete().eq('id', customer.id);
    throw assignmentError;
  }
}

export async function finishOnboarding(companyId: string) {
  const { error } = await supabase.from('companies').update({ onboarding_completed: true }).eq('id', companyId);
  if (error) throw error;
}
