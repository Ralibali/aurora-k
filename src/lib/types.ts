export type UserRole = 'admin' | 'driver';
export type AssignmentStatus = 'pending' | 'active' | 'completed';
export type PricingType = 'per_delivery' | 'per_hour' | 'manual';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';
export type Priority = 'low' | 'normal' | 'urgent';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_available: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  org_number: string | null;
  invoice_address: string | null;
  visit_address: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  price_per_delivery: number | null;
  price_per_hour: number | null;
  pricing_type: PricingType;
  payment_terms_days: number;
  notes: string | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  title: string;
  customer_id: string;
  address: string;
  instructions: string | null;
  scheduled_start: string;
  scheduled_end: string | null;
  assigned_driver_id: string;
  status: AssignmentStatus;
  actual_start: string | null;
  actual_stop: string | null;
  consignment_photo_url: string | null;
  priority: Priority;
  admin_comment: string | null;
  driver_comment: string | null;
  invoiced: boolean;
  created_at: string;
  // Joined fields
  customer?: Customer;
  driver?: Profile;
}

export interface Invoice {
  id: string;
  invoice_number: number;
  customer_id: string;
  assignment_ids: string[];
  status: InvoiceStatus;
  invoice_date: string;
  due_date: string;
  total_ex_vat: number;
  vat_amount: number;
  total_inc_vat: number;
  reference: string | null;
  message: string | null;
  created_at: string;
  customer?: Customer;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  org_number: string | null;
  address: string | null;
  zip_city: string | null;
  email: string | null;
  phone: string | null;
  bankgiro: string | null;
  plusgiro: string | null;
  vat_number: string | null;
  logo_url: string | null;
}

export const statusLabels: Record<AssignmentStatus, string> = {
  pending: 'Ej startad',
  active: 'Pågår',
  completed: 'Klar',
};

export const priorityLabels: Record<Priority, string> = {
  low: 'Låg',
  normal: 'Normal',
  urgent: 'Brådskande',
};

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  draft: 'Utkast',
  sent: 'Skickad',
  paid: 'Betald',
  overdue: 'Förfallen',
};

export const pricingTypeLabels: Record<PricingType, string> = {
  per_delivery: 'Per leverans',
  per_hour: 'Per timme',
  manual: 'Manuellt',
};
