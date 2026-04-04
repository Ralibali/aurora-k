import {
  LayoutDashboard, Briefcase, Calendar, Map, Navigation,
  Users, UserX, CheckSquare, Building, ShoppingCart, Inbox,
  Star, FileText, Package, Leaf, BarChart, TrendingUp,
  Bell, Globe, Code, Settings, LogOut, Truck, Car,
  ClipboardList, FileImage, Smartphone, Shield,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';

const navSections = [
  {
    label: 'Dispatch',
    items: [
      { title: 'Översikt', url: '/admin', icon: LayoutDashboard, end: true },
      { title: 'Uppdrag', url: '/admin/assignments', icon: Briefcase },
      { title: 'Kalender', url: '/admin/calendar', icon: Calendar },
      { title: 'Live-karta', url: '/admin/live-map', icon: Map },
      { title: 'Ruttoptimering', url: '/admin/routes', icon: Navigation },
      { title: 'Fordon', url: '/admin/vehicles', icon: Car },
    ],
  },
  {
    label: 'Personal',
    items: [
      { title: 'Chaufförer', url: '/admin/drivers', icon: Users },
      { title: 'Frånvaro', url: '/admin/absences', icon: UserX },
      { title: 'Godkännanden', url: '/admin/approvals', icon: CheckSquare },
    ],
  },
  {
    label: 'Kunder & Order',
    items: [
      { title: 'Kunder', url: '/admin/customers', icon: Building },
      { title: 'Ordrar', url: '/admin/orders', icon: ShoppingCart },
      { title: 'Ordermallar', url: '/admin/order-templates', icon: ClipboardList },
      { title: 'Bokningsförfrågningar', url: '/admin/booking-requests', icon: Inbox },
      { title: 'Kundnöjdhet', url: '/admin/satisfaction', icon: Star },
    ],
  },
  {
    label: 'Ekonomi',
    items: [
      { title: 'Fakturor', url: '/admin/invoices', icon: FileText },
      { title: 'Fakturamallar', url: '/admin/invoice-templates', icon: FileImage },
      { title: 'Artiklar', url: '/admin/articles', icon: Package },
      { title: 'Miljöuppföljning', url: '/admin/environment', icon: Leaf },
    ],
  },
  {
    label: 'Rapporter',
    items: [
      { title: 'Rapporter', url: '/admin/reports', icon: BarChart },
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
      { title: 'Inställningar', url: '/admin/settings', icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const fullName = user?.user_metadata?.full_name || 'Admin';
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-60 bg-[#0F172A] z-40">
      {/* Header */}
      <div className="h-16 flex items-center gap-3 px-5 shrink-0 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Truck className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-white tracking-tight">Aurora Transport</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-5 mt-4 mb-1">
              {section.label}
            </p>
            {section.items.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.end}
                className="flex items-center gap-3 text-slate-400 text-sm px-4 py-2 rounded-md mx-2 transition-colors duration-100 hover:bg-[#1E293B] hover:text-slate-200 border-l-2 border-transparent"
                activeClassName="!bg-[#1E3A8A] !text-white !border-l-2 !border-[#3B82F6]"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer - User */}
      <div className="shrink-0 border-t border-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white truncate">{fullName}</p>
            <p className="text-xs text-slate-400">Admin</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
            title="Logga ut"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
