import React from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  TrendingUp, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  LogIn,
  LogOut,
  Settings,
  ArrowRightLeft,
  History,
  FileText,
  User,
  MapPin,
  Hammer,
  Package as PackageIcon,
  Palette,
  Bolt
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const movements = [
  { 
    date: '24 Mai 2024', 
    time: '14:32', 
    type: 'Entrée', 
    typeColor: 'bg-green-100 text-green-700', 
    typeIcon: LogIn,
    item: 'Perforateur Bosch GBH', 
    ref: 'REF: P8823', 
    qty: '+12', 
    qtyColor: 'text-primary',
    source: 'Fournisseur : BATIMAT', 
    dest: 'Entrepôt Cotonou', 
    user: 'Jean D.',
    userInitials: 'JD',
    itemIcon: Hammer
  },
  { 
    date: '24 Mai 2024', 
    time: '11:15', 
    type: 'Transfert', 
    typeColor: 'bg-blue-100 text-blue-700', 
    typeIcon: ArrowRightLeft,
    item: 'Peinture Blanche 20L', 
    ref: 'REF: PT-W20', 
    qty: '45', 
    qtyColor: 'text-primary',
    source: 'Entrepôt Cotonou', 
    dest: 'Chantier Porto-Novo', 
    user: 'Sophie S.',
    userInitials: 'SS',
    itemIcon: Palette
  },
  { 
    date: '23 Mai 2024', 
    time: '17:45', 
    type: 'Sortie', 
    typeColor: 'bg-red-100 text-red-700', 
    typeIcon: LogOut,
    item: 'Câble Élec 2.5mm² (100m)', 
    ref: 'REF: CB-25', 
    qty: '-8', 
    qtyColor: 'text-red-600',
    source: 'Entrepôt Cotonou', 
    dest: 'Chantier Parakou', 
    user: 'Marc D.',
    userInitials: 'MD',
    itemIcon: Bolt
  },
  { 
    date: '23 Mai 2024', 
    time: '09:12', 
    type: 'Ajustement', 
    typeColor: 'bg-amber-100 text-amber-700', 
    typeIcon: Settings,
    item: 'Sacs de Ciment 35kg', 
    ref: 'REF: CM-35', 
    qty: '-2', 
    qtyColor: 'text-amber-600',
    source: 'Stock Initial', 
    dest: 'Perte / Casse', 
    user: 'Jean D.',
    userInitials: 'JD',
    itemIcon: PackageIcon
  },
];

export default function MovementsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-on-primary-container uppercase tracking-widest">Logistique et Flux</span>
          <h2 className="font-headline text-3xl font-bold text-primary">Mouvements de stock</h2>
        </div>
        <button 
          onClick={() => navigate('/inventory/new-movement')}
          className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-headline font-semibold text-sm shadow-xl hover:shadow-primary/20 transition-all duration-400 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Nouveau mouvement</span>
        </button>
      </div>

      {/* Dashboard KPIs / Filters Bar */}
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Filters Sidebar/Panel */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-surface-container-high space-y-6 shadow-sm">
            <div className="flex items-center gap-2 text-primary">
              <Filter className="w-4 h-4" />
              <span className="font-headline font-bold text-sm uppercase tracking-wide">Filtres Avancés</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Période</label>
                <div className="space-y-2">
                  <input className="w-full bg-surface-container-low border-none rounded-lg text-sm px-3 py-2 text-slate-700 focus:ring-1 focus:ring-primary-container" type="date" />
                  <input className="w-full bg-surface-container-low border-none rounded-lg text-sm px-3 py-2 text-slate-700 focus:ring-1 focus:ring-primary-container" type="date" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Utilisateur</label>
                <select className="w-full bg-surface-container-low border-none rounded-lg text-sm px-3 py-2 text-slate-700 focus:ring-1 focus:ring-primary-container appearance-none">
                  <option>Tous les utilisateurs</option>
                  <option>Jean Dupont</option>
                  <option>Marc Lefebvre</option>
                  <option>Sophie Martin</option>
                </select>
              </div>
              <div className="pt-4">
                <button className="w-full py-2 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary hover:text-white transition-all duration-400">
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats Micro-Bento */}
          <div className="bg-primary p-6 rounded-xl relative overflow-hidden group shadow-lg">
            <div className="relative z-10">
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Mouvements 24h</p>
              <p className="text-white text-3xl font-headline font-extrabold tracking-tight">142</p>
              <div className="mt-4 flex items-center gap-2 text-[10px] text-green-400 font-bold uppercase">
                <TrendingUp className="w-3 h-3" />
                +12% vs hier
              </div>
            </div>
            <History className="absolute -right-4 -bottom-4 text-8xl text-white/10 group-hover:scale-110 transition-transform duration-700" />
          </div>
        </div>

        {/* Content Area */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          {/* Tabs Navigation */}
          <div className="flex flex-wrap items-center gap-1 bg-surface-container rounded-xl p-1 w-fit">
            <button className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-400 bg-white text-primary shadow-sm">Tous</button>
            <button className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-400 text-slate-500 hover:text-primary">Entrée</button>
            <button className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-400 text-slate-500 hover:text-primary">Sortie</button>
            <button className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-400 text-slate-500 hover:text-primary">Transfert</button>
            <button className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-400 text-slate-500 hover:text-primary">Retour</button>
            <button className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-400 text-slate-500 hover:text-primary">Ajustement</button>
          </div>

          {/* Main Data Table Container */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-surface-container-high">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-surface-container-high/40">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Date & Heure</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Type</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Article</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Qté</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Source</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Destination</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Utilisateur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {movements.map((m, i) => (
                    <tr key={i} className="hover:bg-surface-container-low transition-colors duration-200 group">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-primary">{m.date}</span>
                          <span className="text-[11px] text-slate-400">{m.time}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1",
                          m.typeColor
                        )}>
                          <m.typeIcon className="w-3 h-3" />
                          {m.type}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center">
                            <m.itemIcon className="w-5 h-5 text-primary-container" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-primary">{m.item}</span>
                            <span className="text-[11px] text-slate-400">{m.ref}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn("text-sm font-bold", m.qtyColor)}>{m.qty}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm text-slate-600">{m.source}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm text-slate-600 font-medium">{m.dest}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">{m.userInitials}</div>
                          <span className="text-sm text-slate-600">{m.user}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-surface-container-low/30 border-t border-surface-dim/10 flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="text-xs text-slate-500 font-medium">Affichage de 1 à 10 sur 1 245 mouvements</span>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded bg-white text-slate-400 hover:text-primary transition-all shadow-sm border border-surface-container-high">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-white text-xs font-bold">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded bg-white text-slate-600 text-xs font-bold hover:bg-surface-container-high transition-all border border-surface-container-high">2</button>
                <button className="w-8 h-8 flex items-center justify-center rounded bg-white text-slate-600 text-xs font-bold hover:bg-surface-container-high transition-all border border-surface-container-high">3</button>
                <span className="px-1 text-slate-400">...</span>
                <button className="w-8 h-8 flex items-center justify-center rounded bg-white text-slate-600 text-xs font-bold hover:bg-surface-container-high transition-all border border-surface-container-high">42</button>
                <button className="w-8 h-8 flex items-center justify-center rounded bg-white text-slate-400 hover:text-primary transition-all shadow-sm border border-surface-container-high">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Graph / Secondary View */}
      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-12 md:col-span-8 bg-white p-8 rounded-2xl border border-surface-container-high relative shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
            <div>
              <h3 className="font-headline font-bold text-lg text-primary">Activité de la semaine</h3>
              <p className="text-xs text-slate-400">Volume des mouvements par type</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-tighter">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> Entrées</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Sorties</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Transferts</div>
            </div>
          </div>
          
          {/* Abstract Visualization Representation */}
          <div className="h-48 flex items-end gap-4 px-2">
            {[
              { day: 'LUN', h1: '60%', h2: '30%', h3: '45%' },
              { day: 'MAR', h1: '75%', h2: '50%', h3: '35%' },
              { day: 'MER', h1: '40%', h2: '90%', h3: '20%' },
              { day: 'JEU', h1: '85%', h2: '40%', h3: '60%' },
              { day: 'VEN', h1: '55%', h2: '65%', h3: '80%' },
            ].map((d, i) => (
              <div key={i} className="flex-1 h-full flex flex-col gap-1 items-center group">
                <div className="w-full flex items-end gap-1 flex-1">
                  <div className="bg-green-500 w-full rounded-t-sm group-hover:bg-green-600 transition-all" style={{ height: d.h1 }}></div>
                  <div className="bg-red-500 w-full rounded-t-sm group-hover:bg-red-600 transition-all" style={{ height: d.h2 }}></div>
                  <div className="bg-blue-500 w-full rounded-t-sm group-hover:bg-blue-600 transition-all" style={{ height: d.h3 }}></div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 mt-2">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 bg-primary-container p-8 rounded-2xl text-white flex flex-col justify-between overflow-hidden relative shadow-lg">
          <div className="relative z-10">
            <h3 className="font-headline font-bold text-lg mb-2">Export de données</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">Générez un rapport complet des mouvements de la période sélectionnée au format PDF ou Excel.</p>
            <button className="w-full py-3 bg-white text-primary font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95">
              <Download className="w-5 h-5" />
              <span>Exporter le rapport</span>
            </button>
          </div>
          <FileText className="absolute -bottom-10 -right-10 text-[160px] text-white/10 transform rotate-12 w-40 h-40" />
        </div>
      </section>
    </div>
  );
}
