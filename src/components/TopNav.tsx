import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Bell, Menu, CheckCircle2, AlertTriangle, Info, Clock, X, User, Settings as SettingsIcon, LogOut, Package, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/context/CurrentUserContext';
import { userDisplayName, userInitials } from '@/lib/userDisplay';
import { apiServices } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Alert } from '@/types/api';

interface TopNavProps {
  onMenuClick: () => void;
}

const SEVERITY_COLORS: Record<string, { icon: React.ElementType; color: string; barColor: string }> = {
  critical: { icon: AlertTriangle, color: 'text-error bg-error-container/10', barColor: 'bg-error' },
  warning: { icon: AlertTriangle, color: 'text-orange-600 bg-orange-50', barColor: 'bg-orange-500' },
  info: { icon: Package, color: 'text-primary bg-primary-fixed/20', barColor: 'bg-primary' },
};

function timeAgoText(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const sec = Math.floor((now - then) / 1000);
  if (sec < 60) return "A l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `Il y a ${d}j`;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const { me, status, logout: logoutUser, hasPermission } = useCurrentUser();
  const canOpenSettings = hasPermission('settings.manage');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [dropdownAlerts, setDropdownAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const nameLine = me ? userDisplayName(me.user) : null;
  const subtitle = me
    ? me.profile.job_title || me.profile.role_label || '\u2014'
    : status === 'loading' || status === 'idle'
      ? 'Chargement\u2026'
      : '\u2014';
  const emailLine = me?.user.email ?? '';
  const avatarLetters = me ? userInitials(me.user) : '\u2014';

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { count } = await apiServices.alerts.unreadCount();
      setUnreadCount(count);
    } catch {
      /* silencieux */
    }
  }, []);

  useEffect(() => {
    void fetchUnreadCount();
    const interval = setInterval(() => void fetchUnreadCount(), 60_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const openDropdown = async () => {
    setIsNotificationsOpen(true);
    setIsProfileOpen(false);
    setLoadingAlerts(true);
    try {
      const res = await apiServices.alerts.list({
        status: 'unread',
        ordering: '-created_at',
        page_size: '5',
      });
      const data = res as unknown as { results: Alert[] };
      setDropdownAlerts(data.results ?? []);
    } catch {
      setDropdownAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleAlertClick = async (alert: Alert) => {
    try {
      await apiServices.alerts.markRead(alert.id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setDropdownAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    } catch {
      /* silencieux */
    }
    navigate('/alerts');
  };

  const handleMarkAllRead = async () => {
    try {
      await apiServices.alerts.markAllRead();
      setUnreadCount(0);
      setDropdownAlerts([]);
    } catch {
      /* silencieux */
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const badgeDisplay = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <header className="lg:ml-64 bg-surface sticky top-0 flex justify-between items-center px-4 md:px-10 py-4 z-40 transition-all duration-300">
      <div className="flex items-center gap-4 w-full max-w-md">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <div className="flex-1 flex items-center bg-surface-container rounded-xl px-4 py-2 group focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/5 transition-all duration-400">
          <Search className="text-on-surface-variant w-5 h-5 mr-3 shrink-0" />
          <input 
            className="bg-transparent border-none focus:ring-0 text-sm font-sans w-full placeholder:text-on-surface-variant/60" 
            placeholder="Rechercher..." 
            type="text"
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-3 md:space-x-6 ml-4">
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => {
              if (!isNotificationsOpen) {
                void openDropdown();
              } else {
                setIsNotificationsOpen(false);
              }
            }}
            className={cn(
              "relative p-2 text-on-surface hover:bg-surface-container-high rounded-full transition-all duration-300",
              isNotificationsOpen && "bg-surface-container-high"
            )}
          >
            <Bell className="w-5 h-5" />
            {badgeDisplay && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 flex items-center justify-center bg-error text-white text-[10px] font-bold rounded-full ring-2 ring-surface">
                {badgeDisplay}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isNotificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-4 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50"
              >
                <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-headline font-bold text-primary">Alertes</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">
                        {unreadCount} non {unreadCount > 1 ? 'lues' : 'lue'}
                      </span>
                    )}
                    {unreadCount > 0 && (
                      <button
                        onClick={() => void handleMarkAllRead()}
                        className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                      >
                        Tout lire
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {loadingAlerts ? (
                    <div className="flex items-center justify-center py-8 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      <span className="text-sm">Chargement...</span>
                    </div>
                  ) : dropdownAlerts.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Aucune alerte non lue</p>
                    </div>
                  ) : (
                    dropdownAlerts.map((alert) => {
                      const cfg = SEVERITY_COLORS[alert.severity] ?? SEVERITY_COLORS.info;
                      return (
                        <div 
                          key={alert.id}
                          onClick={() => void handleAlertClick(alert)}
                          className="p-4 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50 last:border-0 relative"
                        >
                          <div className={cn('absolute left-0 top-0 bottom-0 w-1', cfg.barColor)} />
                          <div className="flex gap-3 ml-1">
                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', cfg.color)}>
                              <cfg.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-primary leading-tight mb-1 truncate">
                                {alert.title}
                              </p>
                              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-2">
                                {alert.message}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <Clock className="w-3 h-3" />
                                {timeAgoText(alert.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <button
                  onClick={() => {
                    navigate('/alerts');
                    setIsNotificationsOpen(false);
                  }}
                  className="w-full py-3 text-xs font-bold text-primary hover:bg-slate-50 transition-colors border-t border-slate-100 uppercase tracking-widest"
                >
                  Voir toutes les alertes
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="hidden sm:block h-8 w-[1px] bg-outline-variant/30"></div>
        
        <div className="relative" ref={profileRef}>
          <div 
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center space-x-2 md:space-x-4 cursor-pointer hover:opacity-80 transition-opacity p-1 rounded-xl hover:bg-surface-container-low"
          >
            <div className="text-right hidden sm:block min-w-0 max-w-[200px]">
              <p className="text-sm font-semibold text-primary truncate" title={nameLine ?? undefined}>
                {nameLine ?? (status === 'loading' ? '\u2026' : 'Utilisateur')}
              </p>
              <p
                className="text-[10px] text-on-surface-variant uppercase tracking-wider truncate"
                title={subtitle}
              >
                {subtitle}
              </p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xs md:text-sm border-2 border-transparent group-hover:border-primary/20 transition-all shrink-0">
              {avatarLetters}
            </div>
          </div>

          <AnimatePresence>
            {isProfileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-4 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 p-2"
              >
                <div className="px-4 py-3 border-b border-slate-50 mb-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Compte</p>
                  <p className="text-sm font-bold text-primary truncate" title={emailLine}>
                    {emailLine || '\u2014'}
                  </p>
                </div>

                <button 
                  onClick={() => {
                    navigate('/profile');
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-primary/5 rounded-xl transition-colors group"
                >
                  <User className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                  <span>Mon Profil</span>
                </button>

                {canOpenSettings ? (
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/settings');
                      setIsProfileOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-primary/5 rounded-xl transition-colors group"
                  >
                    <SettingsIcon className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                    <span>Parametres</span>
                  </button>
                ) : null}

                <div className="h-[1px] bg-slate-50 my-1"></div>

                <button 
                  type="button"
                  onClick={() => {
                    void (async () => {
                      await logoutUser();
                      navigate('/login', { replace: true });
                    })();
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-medium text-error hover:bg-error/5 rounded-xl transition-colors group"
                >
                  <LogOut className="w-4 h-4 text-error/60 group-hover:text-error transition-colors" />
                  <span>Deconnexion</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
