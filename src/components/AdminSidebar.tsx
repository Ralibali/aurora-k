import {
  LayoutDashboard, Briefcase, Users, Truck, Clock, Settings, LogOut,
  Moon, Sun, Smartphone, MapPin, CalendarDays, Package, Car,
  ShoppingCart, FileText, CalendarOff, ClipboardCheck, Bell, Inbox,
  UsersRound, SmilePlus, Leaf, Code, Route, Receipt, BarChart3,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

const navSections = [
  {
    label: 'Översikt',
    items: [
      { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Operativt',
    items: [
      { title: 'Uppdrag', url: '/admin/assignments', icon: Briefcase },
      { title: 'Kalender', url: '/admin/calendar', icon: CalendarDays },
      { title: 'Beställningar', url: '/admin/orders', icon: ShoppingCart },
      { title: 'Live-karta', url: '/admin/live-map', icon: MapPin },
      { title: 'Rutter', url: '/admin/routes', icon: Route },
    ],
  },
  {
    label: 'Personal',
    items: [
      { title: 'Chaufförer', url: '/admin/drivers', icon: Users },
      { title: 'Fordon', url: '/admin/vehicles', icon: Car },
      { title: 'Frånvaro', url: '/admin/absences', icon: CalendarOff },
      { title: 'Externa resurser', url: '/admin/external-resources', icon: UsersRound },
    ],
  },
  {
    label: 'Kunder',
    items: [
      { title: 'Kunder', url: '/admin/customers', icon: Truck },
      { title: 'Förfrågningar', url: '/admin/booking-requests', icon: Inbox },
      { title: 'Kundnöjdhet', url: '/admin/satisfaction', icon: SmilePlus },
    ],
  },
  {
    label: 'Ekonomi',
    items: [
      { title: 'Fakturering', url: '/admin/invoices', icon: Receipt },
      { title: 'Fakturamallar', url: '/admin/invoice-templates', icon: FileText },
      { title: 'Tidrapporter', url: '/admin/reports', icon: Clock },
      { title: 'Statistik', url: '/admin/statistics', icon: BarChart3 },
    ],
  },
  {
    label: 'Register',
    items: [
      { title: 'Artiklar', url: '/admin/articles', icon: Package },
      { title: 'Mallar', url: '/admin/order-templates', icon: FileText },
    ],
  },
  {
    label: 'System',
    items: [
      { title: 'Inställningar', url: '/admin/settings', icon: Settings },
      { title: 'Förarapp', url: '/admin/driver-settings', icon: Smartphone },
      { title: 'Notiser', url: '/admin/notifications', icon: Bell },
      { title: 'Attestering', url: '/admin/approvals', icon: ClipboardCheck },
      { title: 'Miljödata', url: '/admin/environment', icon: Leaf },
      { title: 'API', url: '/admin/api', icon: Code },
    ],
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AD';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-sidebar-primary-foreground">{initials}</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">Aurora Medias</p>
              <p className="text-[10px] text-sidebar-muted uppercase tracking-wider">Transport AB</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="pt-1 px-2">
        {navSections.map((section) => (
          <SidebarGroup key={section.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-muted text-[10px] uppercase tracking-widest font-semibold px-3 mb-0.5">
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === '/admin'}
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-100 text-[13px] border-l-2 border-transparent"
                        activeClassName="!border-l-2 !border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-1">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center gap-3 px-3 py-2 text-sidebar-muted hover:text-sidebar-foreground transition-colors w-full rounded-md hover:bg-sidebar-accent text-[13px]"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && <span>{theme === 'dark' ? 'Ljust läge' : 'Mörkt läge'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 text-sidebar-muted hover:text-sidebar-foreground transition-colors w-full rounded-md hover:bg-sidebar-accent text-[13px]"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logga ut</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
