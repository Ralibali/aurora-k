import { Link } from 'react-router-dom';
import { Plus, Briefcase, Building, Users, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const items = [
  { label: 'Nytt uppdrag', href: '/admin/assignments/new', icon: Briefcase, hint: 'Skapa körorder' },
  { label: 'Lägg till kund', href: '/admin/customers/new', icon: Building, hint: 'Nytt kundkort' },
  { label: 'Lägg till förare', href: '/admin/drivers', icon: Users, hint: 'Bjud in eller skapa' },
  { label: 'Skapa faktura', href: '/admin/invoices/new', icon: FileText, hint: 'Underlag från uppdrag' },
];

export function QuickCreateMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Skapa</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70 -mr-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Snabbåtgärder
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((it) => (
          <DropdownMenuItem key={it.href} asChild className="cursor-pointer py-2.5">
            <Link to={it.href} className="flex items-start gap-3">
              <div className="mt-0.5 h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <it.icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none">{it.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{it.hint}</p>
              </div>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}