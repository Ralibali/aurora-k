export type InvoiceBasisAssignment = {
  status?: string;
  invoiced?: boolean;
  cost?: number | null;
  actual_start: string | null;
  actual_stop: string | null;
  require_photo?: boolean | null;
  consignment_photo_url?: string | null;
  require_signature?: boolean | null;
  signature_url?: string | null;
  customer: {
    pricing_type: string | null;
    price_per_delivery: number | null;
    price_per_hour: number | null;
  } | null;
};

// The assignment form calls cost “Kostnad / fakturabelopp”: a positive value is
// the agreed fixed invoice amount, before the customer's default tariff.
export function assignmentInvoicePricing(a: InvoiceBasisAssignment) {
  const issues: string[] = [];
  let hours: number | null = null;
  let unitPrice: number | null = null;
  let quantity = 1;
  let unit = 'st';
  let source: 'fixed' | 'per_delivery' | 'per_hour' | null = null;
  if (a.actual_start && a.actual_stop) {
    const duration = (Date.parse(a.actual_stop) - Date.parse(a.actual_start)) / 3600000;
    if (Number.isFinite(duration) && duration >= 0) hours = Math.round(duration * 100) / 100;
  }
  if (!a.customer) issues.push('Kund saknas');
  if (a.cost != null && (!Number.isFinite(a.cost) || a.cost < 0)) {
    issues.push('Fakturabelopp är ogiltigt');
  } else if (a.cost != null && a.cost > 0) {
    unitPrice = a.cost;
    source = 'fixed';
  } else if (a.customer?.pricing_type === 'per_delivery') {
    source = 'per_delivery';
    if (a.customer.price_per_delivery != null && Number.isFinite(a.customer.price_per_delivery) && a.customer.price_per_delivery >= 0) {
      unitPrice = a.customer.price_per_delivery;
    } else issues.push('Pris per leverans saknas');
  } else if (a.customer?.pricing_type === 'per_hour') {
    source = 'per_hour';
    unit = 'h';
    quantity = hours ?? 0;
    if (quantity <= 0) issues.push('Giltig start- och sluttid saknas');
    if (a.customer.price_per_hour != null && Number.isFinite(a.customer.price_per_hour) && a.customer.price_per_hour >= 0) {
      unitPrice = a.customer.price_per_hour;
    } else issues.push('Timpris saknas');
  } else if (a.customer) issues.push('Prismodell saknas');
  if (unitPrice === 0) issues.push('Nollpris behöver godkännas på fakturan');
  const amount = unitPrice !== null && quantity > 0 && !issues.some(issue => issue === 'Kund saknas')
    ? Math.round(quantity * unitPrice * 100) / 100
    : null;
  return { hours, amount, quantity, unit, unitPrice, source, issues };
}

export function invoiceReadiness(a: InvoiceBasisAssignment, openDeviations = 0, deviationsAvailable = true) {
  const pricing = assignmentInvoicePricing(a);
  const issues: string[] = [];
  if (a.status !== 'completed') issues.push('Uppdraget är inte slutfört');
  if (a.require_photo && !a.consignment_photo_url?.trim()) issues.push('Leveransfoto saknas');
  if (a.require_signature && !a.signature_url?.trim()) issues.push('Underskrift saknas');
  if (!deviationsAvailable) issues.push('Avvikelser behöver kontrolleras');
  else if (openDeviations > 0) issues.push(`${openDeviations} öppen${openDeviations === 1 ? '' : 'a'} avvikelse${openDeviations === 1 ? '' : 'r'}`);
  issues.push(...pricing.issues);
  return { hours: pricing.hours, amount: pricing.amount, issues, ready: !a.invoiced && issues.length === 0 };
}
export function csvCell(value:unknown):string {
 let text=String(value??'');
 if(/^[\s]*[=+\-@]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
