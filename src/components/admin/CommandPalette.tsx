import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Plus, Briefcase, Building, Users, FileText, LayoutDashboard,
  Calendar, Map, Navigation, ShoppingCart, Package, BarChart,
  Bell, Settings, Smartphone, Inbox, Star, Leaf, TrendingUp,
  Sparkles,
} from 'lucide-react';
import { useDemoMode } from '@/hooks/useDemoMode';

const quickActions = [
  { label: 'Nytt uppdrag', href: '/admin/assignments/new', icon: Briefcase, kbd: 'N' },
  { label: 'Lägg till kund', href: '/admin/customers/new', icon: Building },
  { label: 'Lägg till förare', href: '/admin/drivers', icon: Users },
  { label: 'Skapa faktura', href: '/admin/invoices/new', icon: FileText },
];

const navigationItems = [
  { label: 'Översikt', href: '/admin', icon: LayoutDashboard },
  { label: 'Uppdrag', href: '/admin/assignments', icon: Briefcase },
  { label: 'Kalender', href: '/admin/calendar', icon: Calendar },
  { label: 'Live-karta', href: '/admin/live-map', icon: Map },
  { label: 'Ruttoptimering', href: '/admin/routes', icon: Navigation },
  { label: 'Chaufförer', href: '/admin/drivers', icon: Users },
  { label: 'Kunder', href: '/admin/customers', icon: Building },
  { label: 'Ordrar', href: '/admin/orders', icon: ShoppingCart },
  { label: 'Bokningsförfrågningar', href: '/admin/booking-requests', icon: Inbox },
  { label: 'Fakturor', href: '/admin/invoices', icon: FileText },
  { label: 'Artiklar', href: '/admin/articles', icon: Package },
  { label: 'Tidrapporter', href: '/admin/reports', icon: BarChart },
  { label: 'Statistik', href: '/admin/statistics', icon: TrendingUp },
  { label: 'Miljöuppföljning', href: '/admin/environment', icon: Leaf },
  { label: 'Kundnöjdhet', href: '/admin/satisfaction', icon: Star },
  { label: 'Notifieringar', href: '/admin/notifications', icon: Bell },
  { label: 'Förarapp-inställningar', href: '/admin/driver-settings', icon: Smartphone },
  { label: 'Inställningar', href: '/admin/settings', icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { enabled: demoOn, disable: disableDemo } = useDemoMode();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Sök sidor, åtgärder…" />
      <CommandList>
        <CommandEmpty>Inga träffar.</CommandEmpty>

        <CommandGroup heading="Snabbåtgärder">
          {quickActions.map((a) => (
            <CommandItem key={a.href} onSelect={() => go(a.href)} className="gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <span>{a.label}</span>
            </CommandItem>
          ))}
          {demoOn && (
            <CommandItem onSelect={() => { disableDemo(); setOpen(false); }} className="gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Ta bort exempeldata</span>
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigera">
          {navigationItems.map((n) => (
            <CommandItem key={n.href} onSelect={() => go(n.href)} className="gap-2">
              <n.icon className="h-4 w-4 text-muted-foreground" />
              <span>{n.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}