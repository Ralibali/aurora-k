export const validEmail = (value: unknown): value is string => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** An email is an exact identifier even if its local part contains SQL wildcards. */
export const literalEmailPattern = (email: string) => email.replace(/[\\%_]/g, '\\$&');

export function invitationIsCurrent(invite: { accepted_at?: string | null; expires_at?: string | null; created_at?: string | null } | null, now = Date.now()) {
  if (!invite || invite.accepted_at) return false;
  const expires = invite.expires_at ? Date.parse(invite.expires_at) : Date.parse(invite.created_at ?? '') + 7 * 86400000;
  return Number.isFinite(expires) && expires > now;
}

export function publicLeadTemplateData(data: Record<string, unknown>) {
  const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
  return {
    companyName: text(data.companyName) || text(data.name) || 'Intresseanmälan',
    contactPerson: text(data.contactPerson) || text(data.name) || text(data.firstName) || 'Ej angivet',
    email: text(data.email), phone: text(data.phone), fleetSize: text(data.fleetSize), message: text(data.message),
  };
}
