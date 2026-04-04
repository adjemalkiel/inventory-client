import React from 'react';
import { 
  Plus, 
  Search, 
  Warehouse, 
  Construction, 
  Truck, 
  MapPin, 
  TrendingUp, 
  AlertTriangle,
  MoreHorizontal,
  ChevronRight,
  QrCode,
  Download,
  Filter,
  Map as MapIcon
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const storageLocations = [
  { 
    id: 'LOC-001',
    name: 'Dépôt Principal', 
    type: 'Base Logistique',
    typeColor: 'bg-secondary-container text-on-secondary-fixed-variant',
    location: 'Zone Industrielle de Sèmè-Podji',
    items: 1420,
    critical: 3,
    manager: 'Marc Dossou',
    managerInitials: 'MD',
    lastMvt: 'Il y a 14 min',
    icon: Warehouse
  },
  { 
    id: 'LOC-002',
    name: 'Résidence Horizon', 
    type: 'Chantier Actif',
    typeColor: 'bg-primary-fixed text-primary',
    location: 'Quartier Haie Vive, Cotonou',
    items: 342,
    critical: 12,
    manager: 'Sophie Adjovi',
    managerInitials: 'SA',
    lastMvt: 'Il y a 2h',
    icon: Construction
  },
  { 
    id: 'LOC-003',
    name: 'Camion 07', 
    type: 'Unité Mobile',
    typeColor: 'bg-surface-container-high text-slate-600',
    location: 'Immat: BJ-450-RB (Zone Littoral)',
    items: 85,
    critical: 0,
    manager: 'Paul Tobi',
    managerInitials: 'PT',
    lastMvt: 'Hier, 16:45',
    icon: Truck
  },
];

export default function StoragePage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="font-headline text-3xl font-bold text-primary tracking-tight">Lieux de stockage</h2>
          <p className="text-on-surface-variant text-sm md:text-base max-w-2xl">
            Supervisez l'ensemble de vos zones de stockage, dépôts mobiles et chantiers actifs pour une gestion de stock omnicanale.
          </p>
        </div>
        <Link to="/storage/new" className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-headline font-semibold text-sm shadow-xl hover:shadow-primary/20 transition-all duration-400 active:scale-95">
          <Plus className="w-5 h-5" />
          <span>Nouveau Lieu</span>
        </Link>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2 bg-gradient-to-br from-primary to-primary-container p-8 rounded-2xl relative overflow-hidden text-white shadow-xl">
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 mb-4">Valeur Totale Immobilisée</p>
            <h3 className="text-4xl font-extrabold font-headline leading-none">817 193 000 FCFA</h3>
            <div className="mt-6 flex items-center gap-4">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md">+12% ce mois</span>
              <span className="text-xs opacity-60">Basé sur 5 points de stockage</span>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-surface-container-high relative group hover:shadow-md transition-shadow">
          <div className="w-1 h-12 bg-error absolute left-0 top-8 rounded-r-full"></div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Ruptures Critiques</p>
          <h3 className="text-3xl font-extrabold font-headline text-primary">24</h3>
          <p className="mt-2 text-xs text-error font-medium flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> 
            Action requise immédiate
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-surface-container-high relative group hover:shadow-md transition-shadow">
          <div className="w-1 h-12 bg-primary-fixed-dim absolute left-0 top-8 rounded-r-full"></div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Transferts en cours</p>
          <h3 className="text-3xl font-extrabold font-headline text-primary">08</h3>
          <p className="mt-2 text-xs text-slate-500 font-medium">Vers Chantier Horizon</p>
        </div>
      </div>

      {/* Strategic Zones */}
      <section className="space-y-6">
        <h3 className="font-headline font-bold text-xl text-primary">Zones Stratégiques</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {storageLocations.map((loc) => (
            <div key={loc.id} className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-primary group hover:-translate-y-1 transition-all duration-400">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-surface-container p-3 rounded-lg">
                  <loc.icon className="w-6 h-6 text-primary" />
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  loc.typeColor
                )}>
                  {loc.type}
                </span>
              </div>
              <h4 className="text-lg font-bold text-primary mb-1">{loc.name}</h4>
              <p className="text-xs text-slate-500 mb-6">{loc.location}</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Articles en stock</span>
                  <span className="font-bold text-primary">{loc.items}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Quantités critiques</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full font-bold text-xs",
                    loc.critical > 0 ? "bg-error/10 text-error" : "text-slate-400"
                  )}>
                    {loc.critical.toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-[10px] font-bold text-primary border-2 border-white shadow-sm">
                    {loc.managerInitials}
                  </div>
                  <div className="text-[10px]">
                    <p className="font-bold text-primary">Responsable: {loc.manager}</p>
                    <p className="text-slate-400">Dernier mvt: {loc.lastMvt}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Directory Table */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-headline font-bold text-xl text-primary">Répertoire complet des sites</h3>
          <div className="flex gap-2">
            <button className="p-2 bg-surface-container rounded-lg text-slate-600 hover:bg-surface-container-high transition-colors">
              <Filter className="w-5 h-5" />
            </button>
            <button className="p-2 bg-surface-container rounded-lg text-slate-600 hover:bg-surface-container-high transition-colors">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-surface-container-high overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-container-high/50 border-b border-slate-100">
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lieu / Chantier</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Articles</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Responsable</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dernière activité</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { name: 'Entrepôt secondaire', sub: 'Zone Logistique Est', status: 'OPÉRATIONNEL', statusColor: 'bg-secondary-container text-on-secondary-fixed-variant', items: 892, manager: 'Julien Lefebvre', initials: 'JL', last: "Aujourd'hui, 09:30", icon: Warehouse },
                  { name: 'Atelier Central', sub: 'Maintenance & Outillage', status: 'ALERTE STOCK', statusColor: 'bg-error-container text-on-error-container', items: 156, manager: 'Eric Durand', initials: 'ED', last: 'Il y a 3 jours', icon: Warehouse },
                  { name: 'Chantier Éco-Quartier', sub: 'Phase Fondations', status: 'ACTIF', statusColor: 'bg-primary-fixed text-primary', items: 210, manager: 'Amélie Roche', initials: 'AR', last: 'Hier, 11:20', icon: Construction },
                ].map((site, i) => (
                  <tr key={i} className="hover:bg-surface-container-low transition-colors duration-200 group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-surface rounded-lg flex items-center justify-center text-primary">
                          <site.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{site.name}</p>
                          <p className="text-[10px] text-slate-400 italic">{site.sub}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold", site.statusColor)}>{site.status}</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="text-sm font-bold text-primary">{site.items}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold">{site.initials}</div>
                        <p className="text-xs text-slate-700">{site.manager}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs text-slate-500">{site.last}</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button className="text-slate-400 hover:text-primary transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-8 py-4 bg-surface-container-high/20 border-t border-slate-100 flex justify-between items-center text-[10px] font-medium text-slate-500">
              <span>Affichage de 1-3 sur 12 lieux répertoriés</span>
              <div className="flex gap-4">
                <button className="hover:text-primary transition-colors">Précédent</button>
                <button className="hover:text-primary transition-colors">Suivant</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Floating Buttons */}
      <div className="fixed bottom-10 right-10 flex flex-col gap-4 z-40">
        <button className="w-14 h-14 bg-white shadow-xl rounded-full flex items-center justify-center text-primary border border-slate-100 hover:scale-110 transition-transform">
          <MapIcon className="w-6 h-6" />
        </button>
        <button className="w-14 h-14 bg-primary shadow-xl rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform">
          <QrCode className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
