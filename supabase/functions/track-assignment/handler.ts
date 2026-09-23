export function trackingExpired(assignment: { status: string; actual_stop: string | null }, now = Date.now()) {
  if (assignment.status === 'cancelled') return true;
  if (!assignment.actual_stop) return false;
  const stop = Date.parse(assignment.actual_stop);
  return !Number.isFinite(stop) || now >= stop + 24 * 60 * 60 * 1000;
}

export function trackingCustomerName(customer: { name?: string } | { name?: string }[] | null) {
  return Array.isArray(customer) ? customer[0]?.name : customer?.name;
}
