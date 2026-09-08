import { useState } from 'react';
import { LogOut, Truck, Shield, ChevronDown } from 'lucide-react';
import { primarySections, secondarySections } from '@/lib/admin-navigation';
import { toast } from 'sonner';
import { NavLink } from '@/components/NavLink';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

import { useUnreadPortalMessages } from '@/hooks/useUnreadPortalMessages';

export function AdminSidebar() {
  const { user, isPlatformAdmin, signOut } = useAuth();
  const { unreadCount } = useUnreadPortalMessages();
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(() => localStorage.getItem('sidebar-expanded') === 'true');

  const toggle = () => setShowMore(v => {
    localStorage.setItem('sidebar-expanded', String(!v));
    return !v;
  });

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch { toast.error('Utloggningen misslyckades. Försök igen.'); }
  };

  const fullName = user?.user_metadata?.full_name || 'Admin';
  const initials = fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Merge primary + secondary items per section label when expanded
  const sections = primarySections.map(ps => {
    if (!showMore) return ps;
    const extra = secondarySections.find(ss => ss.label === ps.label);
    return extra ? { ...ps, items: [...ps.items, ...extra.items] } : ps;
  });

  return (
    <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-60 bg-[#0B1220] z-40 border-r border-white/5">
      {/* Header */}
      <div className="h-16 flex items-center gap-3 px-5 shrink-0 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center shadow-lg shadow-primary/30 ring-1 ring-white/10">
          <Truck className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white tracking-tight leading-none">Aurora Transport</p>
          <p className="text-[10px] text-slate-500 mt-1">Administration</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
        {sections.map((section) => (
          <div key={section.label} className="mb-1">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em] px-5 mt-4 mb-1.5">
              {section.label}
            </p>
            {section.items.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                end={'end' in item && item.end === true}
                className="group relative flex items-center gap-3 text-slate-400 text-[13px] font-medium px-3 py-2 rounded-md mx-2 transition-all duration-150 hover:bg-white/5 hover:text-slate-100"
                activeClassName="!bg-primary/15 !text-white before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r-full before:bg-primary"
              >
                <item.icon className="h-4 w-4 shrink-0 transition-colors group-hover:text-slate-200" />
                <span className="flex-1 truncate">{item.title}</span>
                {item.url === '/admin/customers' && unreadCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Toggle more/less */}
        <div className="px-2 mt-4">
          <button
            onClick={toggle}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-colors w-full"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
            {showMore ? 'Visa mindre' : 'Fler funktioner'}
          </button>
        </div>
      </nav>

      {/* Platform Admin Link */}
      {isPlatformAdmin && (
        <div className="shrink-0 border-t border-white/5 px-2 py-2">
          <Link
            to="/platform"
            className="flex items-center gap-3 text-amber-400 text-sm px-4 py-2 rounded-md transition-colors hover:bg-amber-500/10"
          >
            <Shield className="h-4 w-4" />
            <span>Platform Admin</span>
          </Link>
        </div>
      )}

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
