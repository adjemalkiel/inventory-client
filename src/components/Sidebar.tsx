import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ArrowLeftRight, 
  Construction, 
  Warehouse, 
  Bell, 
  ClipboardCheck, 
  Bot, 
  Users, 
  Settings,
  HardHat,
  X
} from 'lucide-react';
import { useCurrentUser } from '@/context/CurrentUserContext';
import { userDisplayName, userInitials } from '@/lib/userDisplay';
import { apiServices } from '@/lib/api';
import { cn } from '@/lib/utils';
import { isPaginatedResponse } from '@/types/common';

const navItems = [
  { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard' },
  { icon: Package, label: 'Inventaire', path: '/inventory' },
  { icon: ArrowLeftRight, label: 'Mouvements', path: '/movements' },
  { icon: Construction, label: 'Chantiers', path: '/projects' },
  { icon: Warehouse, label: 'Lieux de stockage', path: '/storage' },
  { icon: Bell, label: 'Alertes', path: '/alerts' },
  { icon: ClipboardCheck, label: 'Inventaires physiques', path: '/audits' },
];

const systemItems: {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  /** Si défini, au moins un code requis (aligné sur `RequirePermission` / API). */
  anyOf?: string[];
}[] = [
  { icon: Bot, label: 'Assistant IA', path: '/ai-assistant' },
  { icon: Users, label: 'Utilisateurs', path: '/users', anyOf: ['users.view', 'users.manage'] },
  { icon: Settings, label: 'Paramètres', path: '/settings', anyOf: ['settings.manage'] },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { me, status, hasPermission } = useCurrentUser();
  const [pendingMoves, setPendingMoves] = useState<number | null>(null);

  const canSeePendingBadge = hasPermission('movement.validate');

  useEffect(() => {
    if (!canSeePendingBadge) {
      setPendingMoves(null);
      return;
    }
    const poll = () => {
      apiServices.stockMovements
        .rawList({ status: 'pending', page_size: 1 })
        .then((r) =>
          setPendingMoves(isPaginatedResponse(r) ? r.count : r.length ?? 0),
        )
        .catch(() => setPendingMoves(null));
    };
    poll();
    const id = window.setInterval(poll, 60_000);
    return () => window.clearInterval(id);
  }, [canSeePendingBadge]);

  const systemItemsVisible = useMemo(
    () =>
      systemItems.filter(
        (item) => !item.anyOf?.length || item.anyOf.some((c) => hasPermission(c)),
      ),
    [hasPermission],
  );
  const sideName = me ? userDisplayName(me.user) : null;
  const sideLine2 = me
    ? me.profile.job_title || me.profile.role_label || '—'
    : status === 'loading' || status === 'idle'
      ? 'Chargement…'
      : '—';
  const sideInitials = me ? userInitials(me.user) : '—';

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <aside className={cn(
        "h-screen w-64 fixed left-0 top-0 bg-primary flex flex-col py-8 shadow-xl z-50 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-6 mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center">
              <HardHat className="text-primary-fixed w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none font-headline">Bâtir Pro</h1>
              <p className="text-[10px] text-on-primary-container uppercase tracking-[0.2em] mt-1 font-sans">Gestion d'Inventaire</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => onClose()}
              className={({ isActive }) => {
                const isProjectDetail =
                  item.path === '/projects' &&
                  (window.location.pathname.startsWith('/projects/') ||
                    window.location.pathname === '/projects/new');
                return cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-headline text-sm group',
                  isActive || isProjectDetail
                    ? 'bg-white/10 text-white border-r-4 border-primary-container font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5',
                );
              }}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.path === '/movements' &&
              canSeePendingBadge &&
              pendingMoves != null &&
              pendingMoves > 0 ? (
                <span className="min-w-[1.25rem] rounded-full bg-red-500 px-1.5 text-center text-[10px] font-bold leading-5 text-white">
                  {pendingMoves > 99 ? '99+' : pendingMoves}
                </span>
              ) : null}
            </NavLink>
          ))}

          <div className="pt-6 pb-2 px-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Système</p>
          </div>

          {systemItemsVisible.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => onClose()}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-headline text-sm group",
                isActive 
                  ? "bg-white/10 text-white border-r-4 border-primary-container font-semibold" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-4 mt-auto pt-8 border-t border-white/5">
          <div className="p-4 bg-white/5 rounded-xl flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xs shrink-0">
              {sideInitials}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-semibold text-white truncate" title={sideName ?? undefined}>
                {sideName ?? (status === 'loading' ? '…' : 'Utilisateur')}
              </p>
              <p className="text-[10px] text-slate-500 truncate" title={sideLine2}>
                {sideLine2}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
