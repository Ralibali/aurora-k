export type UserRole = 'admin' | 'driver';
export type AssignmentStatus = 'pending' | 'active' | 'completed';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
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
  created_at: string;
  // Joined fields
  customer?: Customer;
  driver?: Profile;
}

export const statusLabels: Record<AssignmentStatus, string> = {
  pending: 'Ej startad',
  active: 'Pågår',
  completed: 'Klar',
};
