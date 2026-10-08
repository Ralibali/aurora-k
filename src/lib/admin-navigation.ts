import {
  LayoutDashboard, Briefcase, Calendar, Map, Navigation,
  Users, UserX, CheckSquare, Building, ShoppingCart, Inbox, ShieldCheck,
  Star, FileText, Package, Leaf, BarChart, TrendingUp,
  Bell, Globe, Code, Settings, Car, Satellite,
  ClipboardList, FileImage, Smartphone, Shield, Repeat,
} from 'lucide-react';

/* Primary items — always visible */
export const primarySections = [
  {
    label: 'Trafik',
    items: [
      { title: 'Översikt', url: '/admin', icon: LayoutDashboard, end: true },
      { title: 'Uppdrag', url: '/admin/assignments', icon: Briefcase },
      { title: 'Kalender', url: '/admin/calendar', icon: Calendar },
      { title: 'Karta', url: '/admin/live-map', icon: Map },
    ],
  },
  {
    label: 'Personal',
    items: [
      { title: 'Förare', url: '/admin/drivers', icon: Users },
    ],
  },
  {
    label: 'Kunder',
    items: [
      { title: 'Kunder', url: '/admin/customers', icon: Building },
      { title: 'Ordrar', url: '/admin/orders', icon: ShoppingCart },
    ],
  },
  {
    label: 'Ekonomi',
    items: [
      { title: 'Fakturaunderlag', url: '/admin/invoice-basis', icon: FileText },
      { title: 'Fakturor', url: '/admin/invoices', icon: FileText },
      { title: 'OB & traktamente', url: '/admin/compensation', icon: Briefcase },
    ],
  },
  {
    label: 'Rapporter',
    items: [
      { title: 'Tidrapporter', url: '/admin/reports', icon: BarChart },
    ],
  },
  {
    label: 'System',
    items: [
      { title: 'Inställningar', url: '/admin/settings', icon: Settings },
    ],
  },
];

/* Secondary items — hidden behind "More" toggle */
export const secondarySections = [
  {
    label: 'Trafik',
    items: [
      { title: 'Ruttoptimering', url: '/admin/routes', icon: Navigation },
      { title: 'Fordon', url: '/admin/vehicles', icon: Car },
      { title: 'Telematik & körjournal', url: '/admin/telematics', icon: Satellite },
      { title: 'Återkommande uppdrag', url: '/admin/recurring-series', icon: Repeat },
    ],
  },
  {
    label: 'Personal',
    items: [
      { title: 'Frånvaro', url: '/admin/absences', icon: UserX },
      { title: 'Efterlevnad', url: '/admin/compliance', icon: ShieldCheck },
      { title: 'Godkännanden', url: '/admin/approvals', icon: CheckSquare },
    ],
  },
  {
    label: 'Kunder',
    items: [
      { title: 'Ordermallar', url: '/admin/order-templates', icon: ClipboardList },
      { title: 'Bokningsförfrågningar', url: '/admin/booking-requests', icon: Inbox },
      { title: 'Kundnöjdhet', url: '/admin/satisfaction', icon: Star },
    ],
  },
  {
    label: 'Ekonomi',
    items: [
      { title: 'Fakturamallar', url: '/admin/invoice-templates', icon: FileImage },
      { title: 'Artiklar', url: '/admin/articles', icon: Package },
      { title: 'Miljöuppföljning', url: '/admin/environment', icon: Leaf },
    ],
  },
  {
    label: 'Rapporter',
    items: [
      { title: 'Statistik', url: '/admin/statistics', icon: TrendingUp },
    ],
  },
  {
    label: 'System',
    items: [
      { title: 'Notiser', url: '/admin/notifications', icon: Bell },
      { title: 'Förarapp-inställningar', url: '/admin/driver-settings', icon: Smartphone },
      { title: 'Externa resurser', url: '/admin/external-resources', icon: Globe },
      { title: 'API', url: '/admin/api', icon: Code },
      { title: 'Händelselogg', url: '/admin/audit-log', icon: Shield },
    ],
  },
];

export const adminNavigation = primarySections.map(section => ({
  ...section,
  items: [...section.items, ...(secondarySections.find(extra => extra.label === section.label)?.items ?? [])],
}));
