import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu, CheckCircle2, AlertTriangle, Info, Clock, X, User, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TopNavProps {
  onMenuClick: () => void;
}

const notifications = [
  {
    id: 1,
    title: 'Stock critique : Ciment CPJ 35',
    description: 'Le stock est descendu en dessous du seuil d\'alerte (2 sacs restants).',
    time: 'Il y a 10 min',
    type: 'error',
    icon: AlertTriangle,
    color: 'text-error bg-error-container/10',
    unread: true
  },
  {
    id: 2,
    title: 'Nouveau mouvement enregistré',
    description: 'Transfert de 10 IPN 200 vers le chantier Horizon par Jean Dupont.',
    time: 'Il y a 45 min',
    type: 'success',
    icon: CheckCircle2,
    color: 'text-emerald-600 bg-emerald-50',
    unread: true
  },
  {
    id: 3,
    title: 'Rappel : Inventaire physique',
    description: 'L\'audit du dépôt Nord est prévu pour demain à 09:00.',
    time: 'Il y a 2h',
    type: 'info',
    icon: Info,
    color: 'text-primary bg-primary-fixed/20',
    unread: false
  }
];

export function TopNav({ onMenuClick }: TopNavProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsProfileOpen(false);
            }}
            className={cn(
              "relative p-2 text-on-surface hover:bg-surface-container-high rounded-full transition-all duration-300",
              isNotificationsOpen && "bg-surface-container-high"
            )}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full ring-2 ring-surface"></span>
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
                  <h3 className="font-headline font-bold text-primary">Notifications</h3>
                  <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">2 nouvelles</span>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={cn(
                        "p-4 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50 last:border-0 relative",
                        notification.unread && "bg-primary/5"
                      )}
                    >
                      {notification.unread && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                      )}
                      <div className="flex gap-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", notification.color)}>
                          <notification.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-primary leading-tight mb-1">{notification.title}</p>
                          <p className="text-xs text-slate-500 leading-relaxed mb-2">{notification.description}</p>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <Clock className="w-3 h-3" />
                            {notification.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="w-full py-3 text-xs font-bold text-primary hover:bg-slate-50 transition-colors border-t border-slate-100 uppercase tracking-widest">
                  Voir toutes les notifications
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
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-primary">Jean Dossou</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Directeur Travaux</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm md:text-base border-2 border-transparent group-hover:border-primary/20 transition-all">
              JD
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
                  <p className="text-sm font-bold text-primary truncate">jean.dossou@batirpro.bj</p>
                </div>

                <button 
                  onClick={() => {
                    navigate('/users');
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-primary/5 rounded-xl transition-colors group"
                >
                  <User className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                  <span>Mon Profil</span>
                </button>

                <button 
                  onClick={() => {
                    navigate('/settings');
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-primary/5 rounded-xl transition-colors group"
                >
                  <SettingsIcon className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                  <span>Paramètres</span>
                </button>

                <div className="h-[1px] bg-slate-50 my-1"></div>

                <button 
                  onClick={() => navigate('/login')}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-medium text-error hover:bg-error/5 rounded-xl transition-colors group"
                >
                  <LogOut className="w-4 h-4 text-error/60 group-hover:text-error transition-colors" />
                  <span>Déconnexion</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
