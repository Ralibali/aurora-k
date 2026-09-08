import {
  LayoutDashboard, Briefcase, Calendar, Map, Navigation,
  Users, UserX, CheckSquare, Building, ShoppingCart, Inbox, ShieldCheck,
  Star, FileText, Package, Leaf, BarChart, TrendingUp,
  Bell, Globe, Code, Settings, Car,
  ClipboardList, FileImage, Smartphone, Shield, Repeat,
} from 'lucide-react';

/* Primary items — always visible */
export const primarySections = [
  {
    label: 'Dispatch',
    items: [
      { title: 'Översikt', url: '/admin', icon: LayoutDashboard, end: true },
      { title: 'Uppdrag', url: '/admin/assignments', icon: Briefcase },
      { title: 'Kalender', url: '/admin/calendar', icon: Calendar },
      { title: 'Live-karta', url: '/admin/live-map', icon: Map },
    ],
  },
  {
    label: 'Personal',
    items: [
      { title: 'Chaufförer', url: '/admin/drivers', icon: Users },
    ],
  },
  {
    label: 'Kunder & Order',
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
      { title: 'OB & Traktamente', url: '/admin/compensation', icon: Briefcase },
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
    label: 'Dispatch',
    items: [
      { title: 'Ruttoptimering', url: '/admin/routes', icon: Navigation },
      { title: 'Fordon', url: '/admin/vehicles', icon: Car },
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
    label: 'Kunder & Order',
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
      { title: 'Notifieringar', url: '/admin/notifications', icon: Bell },
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
