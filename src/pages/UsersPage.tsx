import React from 'react';
import { 
  Users, 
  Shield, 
  History, 
  Mail, 
  Search, 
  UserPlus, 
  ShieldCheck, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight,
  Warehouse,
  Construction,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const users = [
  {
    id: 1,
    name: 'Jean Dossou',
    email: 'j.dossou@batirpro.bj',
    initials: 'JD',
    function: 'Directeur Logistique',
    role: 'Administrateur',
    roleColor: 'bg-secondary-fixed text-on-secondary-fixed',
    site: 'Siège Social - Cotonou',
    status: 'Actif',
    statusColor: 'bg-emerald-500',
    lastSeen: 'Il y a 14 min'
  },
  {
    id: 2,
    name: 'Marie Gnonlonfoun',
    email: 'm.gnonlonfoun@batirpro.bj',
    initials: 'MG',
    function: 'Gestionnaire Stocks',
    role: 'Magasinier',
    roleColor: 'bg-primary-fixed text-on-primary-fixed',
    site: 'Dépôt Parakou',
    status: 'Actif',
    statusColor: 'bg-emerald-500',
    lastSeen: 'Hier, 16:45'
  },
  {
    id: 3,
    name: 'Robert Adjovi',
    email: 'r.adjovi@batirpro.bj',
    initials: 'RA',
    function: 'Conducteur Travaux',
    role: 'Chef de chantier',
    roleColor: 'bg-secondary-container text-on-secondary-container',
    site: 'Chantier Porto-Novo',
    status: 'Actif',
    statusColor: 'bg-emerald-500',
    lastSeen: 'Le 12/05/2024'
  },
  {
    id: 4,
    name: 'Sophie Sènan',
    email: 's.senan@batirpro.bj',
    initials: 'SS',
    function: 'Magasinier Junior',
    role: 'Magasinier',
    roleColor: 'bg-primary-fixed text-on-primary-fixed',
    site: 'Dépôt Bohicon',
    status: 'Hors ligne',
    statusColor: 'bg-slate-300',
    lastSeen: 'Le 05/05/2024'
  }
];

const roles = [
  {
    title: 'Administrateur',
    icon: Shield,
    description: 'Contrôle total du système. Gestion des utilisateurs, configuration des sites et accès à l\'ensemble des rapports financiers.',
    permissions: [
      'Édition des paramètres globaux',
      'Gestion des rôles & permissions',
      'Export de données sensibles'
    ]
  },
  {
    title: 'Magasinier',
    icon: Warehouse,
    description: 'Gestion opérationnelle des stocks. Réception des livraisons, mouvements de stock et inventaires physiques.',
    permissions: [
      'Saisie des entrées/sorties',
      'Transferts entre dépôts',
      'Alerte de rupture de stock'
    ]
  },
  {
    title: 'Chef de chantier',
    icon: Construction,
    description: 'Consultation et demande de matériel pour un site spécifique. Suivi de consommation chantier.',
    permissions: [
      'Demandes de réapprovisionnement',
      'Consultation stock local',
      'Validation réceptions chantier'
    ]
  }
];

export default function UsersPage() {
  return (
    <div className="space-y-10 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-headline font-bold text-primary tracking-tight leading-tight mb-2">Gestion des Utilisateurs</h2>
          <p className="text-on-surface-variant max-w-xl leading-relaxed">Gérez les accès de vos collaborateurs, définissez leurs rôles et contrôlez les sites de construction auxquels ils sont rattachés.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 text-primary font-bold text-sm hover:bg-slate-50 transition-all">
            <ShieldCheck className="w-5 h-5" />
            Modifier les droits
          </button>
          <Link to="/users/new" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg hover:bg-primary-container transition-all active:scale-95">
            <UserPlus className="w-5 h-5" />
            Inviter un utilisateur
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary-fixed"></div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Utilisateurs</p>
          <p className="text-3xl font-bold font-headline text-primary">124</p>
          <Users className="absolute top-4 right-4 text-slate-100 w-10 h-10 group-hover:text-primary-fixed transition-colors duration-500" />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-secondary-fixed"></div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Rôles Actifs</p>
          <p className="text-3xl font-bold font-headline text-primary">8</p>
          <Shield className="absolute top-4 right-4 text-slate-100 w-10 h-10 group-hover:text-secondary-fixed transition-colors duration-500" />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-tertiary-fixed"></div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Dernières 24h</p>
          <p className="text-3xl font-bold font-headline text-primary">12 <span className="text-xs font-normal text-slate-400">connexions</span></p>
          <History className="absolute top-4 right-4 text-slate-100 w-10 h-10 group-hover:text-tertiary-fixed transition-colors duration-500" />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-error-container"></div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Invitations en attente</p>
          <p className="text-3xl font-bold font-headline text-primary">3</p>
          <Mail className="absolute top-4 right-4 text-slate-100 w-10 h-10 group-hover:text-error-container transition-colors duration-500" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtrer par Profil :</span>
        <div className="flex flex-wrap gap-2">
          <button className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold">Tous</button>
          <button className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors">Administrateur</button>
          <button className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors">Magasinier</button>
          <button className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors">Chef de chantier</button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Utilisateur</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fonction</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rôle</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Site rattaché</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Statut</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dernière connexion</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="group hover:bg-slate-50 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary font-bold">{user.initials}</div>
                      <div>
                        <p className="text-sm font-bold text-primary">{user.name}</p>
                        <p className="text-[11px] text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{user.function}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider", user.roleColor)}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{user.site}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", user.statusColor)}></span>
                      <span className={cn("text-xs font-bold", user.status === 'Actif' ? "text-emerald-700" : "text-slate-400 italic")}>
                        {user.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{user.lastSeen}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-primary transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">Affichage de 1 à 4 sur 124 utilisateurs</p>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg border border-slate-200 hover:bg-white transition-colors disabled:opacity-30" disabled>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-lg border border-slate-200 hover:bg-white transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Role Structure Section */}
      <div className="mt-16 pt-12 border-t border-slate-200">
        <h3 className="text-2xl font-bold font-headline text-primary mb-8">Structure des Rôles</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {roles.map((role, i) => (
            <div key={i} className="bg-slate-50 p-8 rounded-2xl hover:bg-slate-100 transition-colors duration-400 border border-transparent hover:border-slate-200 group">
              <role.icon className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-lg font-bold font-headline text-primary mb-2">{role.title}</h4>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">{role.description}</p>
              <ul className="space-y-3">
                {role.permissions.map((perm, j) => (
                  <li key={j} className="flex items-center gap-2 text-xs text-primary font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {perm}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-10 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-100 mt-10">
        <p>© 2024 Bâtir Pro SaaS - Système de Gestion d'Inventaire Industriel</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-primary transition-colors">Confidentialité</a>
          <a href="#" className="hover:text-primary transition-colors">Conditions d'utilisation</a>
          <a href="#" className="hover:text-primary transition-colors">Documentation API</a>
        </div>
      </footer>
    </div>
  );
}
