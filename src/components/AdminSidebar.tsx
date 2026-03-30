import { LayoutDashboard, ClipboardList, Users, Clock, LogOut, Building2, Receipt, BarChart3, Settings } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
  useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Uppdrag', url: '/admin/assignments', icon: ClipboardList },
  { title: 'Kunder', url: '/admin/customers', icon: Building2 },
  { title: 'Chaufförer', url: '/admin/drivers', icon: Users },
  { title: 'Fakturering', url: '/admin/invoices', icon: Receipt },
  { title: 'Tidrapporter', url: '/admin/reports', icon: Clock },
  { title: 'Statistik', url: '/admin/statistics', icon: BarChart3 },
  { title: 'Inställningar', url: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/60 text-[10px] uppercase tracking-wider mb-2">
              Aurora Medias Transport
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/admin'}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <button className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors w-full rounded-md hover:bg-sidebar-accent text-sm">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logga ut</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
