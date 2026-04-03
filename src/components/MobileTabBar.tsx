import { LayoutDashboard, Briefcase, Map, Users, MoreHorizontal, Plus } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const tabs = [
  { label: 'Hem', icon: LayoutDashboard, to: '/admin', end: true },
  { label: 'Uppdrag', icon: Briefcase, to: '/admin/assignments' },
  { label: 'Karta', icon: Map, to: '/admin/live-map' },
  { label: 'Personal', icon: Users, to: '/admin/drivers' },
  { label: 'Mer', icon: MoreHorizontal, to: '/admin/settings' },
];

export function MobileTabBar() {
  const navigate = useNavigate();

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/admin/assignments/new')}
        className="md:hidden fixed bottom-20 right-4 z-50 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Nytt uppdrag"
      >
        <Plus className="h-6 w-6 text-white" />
      </button>

      {/* Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border h-16 flex items-center justify-around pb-safe">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground min-w-[56px] py-1"
            activeClassName="!text-primary"
          >
            <tab.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
