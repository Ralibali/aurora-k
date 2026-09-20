export type TransportDocumentType = 'transport_order' | 'pod' | 'cmr' | 'unknown';
export type DocumentInboxStatus = 'new' | 'reviewed' | 'linked' | 'error';

export type DocumentFields = {
  title: string;
  orderReference: string;
  customerName: string;
  organizationNumber: string;
  pickupAddress: string;
  deliveryAddress: string;
  scheduledStart: string;
  contactName: string;
  contactPhone: string;
  serviceType: string;
  goods: string;
  weightKg: number | null;
  amount: number | null;
  currency: string;
};

export type InboundDocument = {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  storage_path: string | null;
  document_type: TransportDocumentType;
  status: DocumentInboxStatus;
  confidence: number;
  field_confidence: Record<string, number>;
  signature_detected: boolean;
  assignment_id: string | null;
  error_message: string | null;
  created_at: string;
  parsed_payload: { fields?: Partial<DocumentFields>; requiresReview?: boolean } | null;
};

export const documentTypeLabels: Record<TransportDocumentType, string> = {
  transport_order: 'Transportorder',
  pod: 'Leveransbevis',
  cmr: 'Fraktsedel/CMR',
  unknown: 'Okänd typ',
};

export const statusLabels: Record<DocumentInboxStatus, string> = {
  new: 'Ny',
  reviewed: 'Granskad',
  linked: 'Kopplad',
  error: 'Fel',
};

export const ACCEPTED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export function validateDocumentFile(file: File): string | null {
  const acceptedByName = /\.(pdf|jpe?g|png|webp)$/i.test(file.name);
  if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type.toLowerCase()) && !acceptedByName) {
    return 'Filtypen stöds inte. Ladda upp PDF, JPG, PNG eller WebP.';
  }
  if (file.size === 0) return 'Filen är tom.';
  if (file.size > MAX_DOCUMENT_BYTES) return 'Filen får vara högst 20 MB.';
  return null;
}

export function emptyDocumentFields(): DocumentFields {
  return {
    title: '', orderReference: '', customerName: '', organizationNumber: '',
    pickupAddress: '', deliveryAddress: '', scheduledStart: '', contactName: '',
    contactPhone: '', serviceType: '', goods: '', weightKg: null, amount: null, currency: '',
  };
}

/** Normaliserar ett svar från parse-order-document utan att hitta på värden. */
export function normalizeDocumentFields(value: Partial<DocumentFields> | null | undefined): DocumentFields {
  const source = value ?? {};
  const text = (key: keyof DocumentFields) => {
    const raw = source[key];
    return raw === null || raw === undefined ? '' : String(raw).trim();
  };
  const numeric = (key: 'weightKg' | 'amount') => {
    const raw: unknown = source[key];
    if (raw === null || raw === undefined || raw === '') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    title: text('title'),
    orderReference: text('orderReference'),
    customerName: text('customerName'),
    organizationNumber: text('organizationNumber'),
    pickupAddress: text('pickupAddress'),
    deliveryAddress: text('deliveryAddress'),
    scheduledStart: text('scheduledStart'),
    contactName: text('contactName'),
    contactPhone: text('contactPhone'),
    serviceType: text('serviceType'),
    goods: text('goods'),
    weightKg: numeric('weightKg'),
    amount: numeric('amount'),
    currency: text('currency'),
  };
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(ab|hb|kb|as|a\/s|oy|ltd|inc)\b/g, '')
    .replace(/[^a-z0-9åäöé ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeOrgNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length === 12 ? digits.slice(2) : digits;
}

export type CustomerCandidate = { id: string; name: string; org_number?: string | null };

export type CustomerMatch = { customerId: string; confidence: number; reason: string };

/** Försiktig kundmatchning: exakt org.nr eller exakt/unikt normaliserat namn. */
export function matchCustomer(fields: DocumentFields, customers: CustomerCandidate[]): CustomerMatch | null {
  const org = normalizeOrgNumber(fields.organizationNumber);
  if (org.length === 10) {
    const byOrg = customers.filter(customer => normalizeOrgNumber(customer.org_number ?? '') === org);
    if (byOrg.length === 1) return { customerId: byOrg[0].id, confidence: 98, reason: 'Matchad på organisationsnummer' };
  }

  const wanted = normalizeName(fields.customerName);
  if (!wanted || wanted.length < 3) return null;

  const exact = customers.filter(customer => normalizeName(customer.name) === wanted);
  if (exact.length === 1) return { customerId: exact[0].id, confidence: 90, reason: 'Matchad på kundnamn' };
  if (exact.length > 1) return null;

  const partial = customers.filter(customer => {
    const name = normalizeName(customer.name);
    return name.length >= 3 && (name.includes(wanted) || wanted.includes(name));
  });
  if (partial.length === 1) return { customerId: partial[0].id, confidence: 60, reason: 'Trolig men osäker kundmatchning' };
  return null;
}

export type AssignmentCandidate = {
  id: string;
  title: string | null;
  instructions?: string | null;
  customer_id: string | null;
  scheduled_start: string | null;
};

export type AssignmentMatch = { assignmentId: string; confidence: number; reason: string };

function sameDay(isoA: string, isoB: string) {
  if (!isoA || !isoB) return false;
  return isoA.slice(0, 10) === isoB.slice(0, 10);
}

/**
 * Matchar dokument mot befintligt uppdrag. Returnerar alltid bara ett förslag —
 * ingen automatisk uppdatering sker vid osäker match.
 */
export function matchAssignment(
  fields: DocumentFields,
  customerId: string,
  assignments: AssignmentCandidate[],
): AssignmentMatch | null {
  const reference = fields.orderReference.trim().toLowerCase();
  if (reference.length >= 3) {
    const byReference = assignments.filter(assignment =>
      `${assignment.title ?? ''} ${assignment.instructions ?? ''}`.toLowerCase().includes(reference));
    if (byReference.length === 1) {
      return { assignmentId: byReference[0].id, confidence: 92, reason: 'Matchad på referensnummer' };
    }
    if (byReference.length > 1 && customerId) {
      const narrowed = byReference.filter(assignment => assignment.customer_id === customerId);
      if (narrowed.length === 1) return { assignmentId: narrowed[0].id, confidence: 85, reason: 'Matchad på referens och kund' };
    }
  }

  if (customerId && fields.scheduledStart) {
    const byCustomerDate = assignments.filter(assignment =>
      assignment.customer_id === customerId && sameDay(assignment.scheduled_start ?? '', fields.scheduledStart));
    if (byCustomerDate.length === 1) {
      return { assignmentId: byCustomerDate[0].id, confidence: 65, reason: 'Trolig match på kund och datum' };
    }
  }

  return null;
}

export function requiresManualReview(confidence: number, documentType: TransportDocumentType) {
  return confidence < 70 || documentType === 'unknown';
}
