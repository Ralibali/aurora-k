import { LayoutDashboard, ClipboardList, Users, Clock, LogOut, Building2, Receipt, BarChart3, Settings, Truck, Moon, Sun, Smartphone, MapPin, CalendarDays, Package, Car, ShoppingCart, FileText, CalendarOff, ClipboardCheck, Bell, Inbox, UsersRound, SmilePlus, Leaf, Code, Route } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';

const mainNav = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Uppdrag', url: '/admin/assignments', icon: ClipboardList },
  { title: 'Kalender', url: '/admin/calendar', icon: CalendarDays },
  { title: 'Beställningar', url: '/admin/orders', icon: ShoppingCart },
  { title: 'Kunder', url: '/admin/customers', icon: Building2 },
  { title: 'Chaufförer', url: '/admin/drivers', icon: Users },
  { title: 'Fordon', url: '/admin/vehicles', icon: Car },
  { title: 'Live-karta', url: '/admin/live-map', icon: MapPin },
];

const resourceNav = [
  { title: 'Artiklar', url: '/admin/articles', icon: Package },
  { title: 'Mallar', url: '/admin/order-templates', icon: FileText },
  { title: 'Externa resurser', url: '/admin/external-resources', icon: UsersRound },
  { title: 'Rutter', url: '/admin/routes', icon: Route },
];

const operationsNav = [
  { title: 'Frånvaro', url: '/admin/absences', icon: CalendarOff },
  { title: 'Attestering', url: '/admin/approvals', icon: ClipboardCheck },
  { title: 'Notiser', url: '/admin/notifications', icon: Bell },
  { title: 'Förfrågningar', url: '/admin/booking-requests', icon: Inbox },
  { title: 'Kundnöjdhet', url: '/admin/satisfaction', icon: SmilePlus },
  { title: 'Miljödata', url: '/admin/environment', icon: Leaf },
];

const financeNav = [
  { title: 'Fakturering', url: '/admin/invoices', icon: Receipt },
  { title: 'Tidrapporter', url: '/admin/reports', icon: Clock },
  { title: 'Statistik', url: '/admin/statistics', icon: BarChart3 },
];

const systemNav = [
  { title: 'Inställningar', url: '/admin/settings', icon: Settings },
  { title: 'Förarapp', url: '/admin/driver-settings', icon: Smartphone },
];

function NavGroup({ label, items, collapsed }: { label: string; items: typeof mainNav; collapsed: boolean }) {
  return (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold px-3 mb-1">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === '/admin'}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span className="text-sm">{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-ring/20 flex items-center justify-center shrink-0">
            <Truck className="h-4 w-4 text-sidebar-ring" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">Aurora Medias</p>
              <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">Transport AB</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <Separator className="bg-sidebar-border mx-3" />
      <SidebarContent className="pt-2">
        <NavGroup label="Översikt" items={mainNav} collapsed={collapsed} />
        <NavGroup label="Register" items={resourceNav} collapsed={collapsed} />
        <NavGroup label="Ekonomi" items={financeNav} collapsed={collapsed} />
        <NavGroup label="System" items={systemNav} collapsed={collapsed} />
      </SidebarContent>
      <SidebarFooter className="p-3">
        <Separator className="bg-sidebar-border mb-2" />
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-all duration-150 w-full rounded-lg hover:bg-sidebar-accent text-sm"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && <span>{theme === 'dark' ? 'Ljust läge' : 'Mörkt läge'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-all duration-150 w-full rounded-lg hover:bg-sidebar-accent text-sm"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logga ut</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
