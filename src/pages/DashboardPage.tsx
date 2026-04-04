import React from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  ArrowLeftRight, 
  Building2, 
  MapPinOff, 
  Sparkles, 
  ChevronRight, 
  PlusCircle, 
  MinusCircle, 
  MoveUp, 
  ClipboardList,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const kpis = [
  { label: 'Articles suivis', value: '2 450', trend: '+4% depuis le mois dernier', icon: TrendingUp, color: 'bg-primary-fixed', trendColor: 'text-emerald-600' },
  { label: 'Stock critique', value: '12', trend: 'Action requise immédiate', icon: AlertTriangle, color: 'bg-error', trendColor: 'text-error' },
  { label: 'Mouvements jour', value: '45', trend: 'Flux logistique stable', icon: ArrowLeftRight, color: 'bg-secondary-fixed', trendColor: 'text-on-surface-variant' },
  { label: 'Chantiers actifs', value: '8', trend: '2 nouveaux cette semaine', icon: Building2, color: 'bg-primary', trendColor: 'text-on-surface-variant' },
  { label: 'Équipements égarés', value: '3', trend: 'Dernière trace: Dépôt Est', icon: MapPinOff, color: 'bg-orange-400', trendColor: 'text-orange-600' },
];

const movements = [
  { ref: '#MV-8401', article: 'Poutrelles Acier HEB 200', type: 'ENTRÉE', qty: '120 unités', time: "Aujourd'hui, 09:45", status: 'Confirmé' },
  { ref: '#MV-8402', article: 'Marteau-piqueur TE 3000', type: 'SORTIE', qty: '2 unités', time: "Aujourd'hui, 08:30", status: 'En cours' },
  { ref: '#MV-8403', article: 'Ciment CPJ 35 (Sacs)', type: 'TRANSFERT', qty: '45 sacs', time: 'Hier, 17:15', status: 'Confirmé' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline text-2xl md:text-3xl font-bold text-primary tracking-tight">Tableau de bord exécutive</h2>
          <p className="text-on-surface-variant mt-2 text-sm md:text-base">Vue d'ensemble de vos actifs et opérations en temps réel.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="hidden sm:flex bg-white px-4 py-2 rounded-xl items-center space-x-2 shadow-sm border border-surface-container-high">
            <Clock className="text-primary w-4 h-4" />
            <span className="text-sm font-medium text-primary">
              {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
            </span>
          </div>
          <button className="flex-1 md:flex-none bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-container transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-primary/10 active:scale-[0.98]">
            <ArrowLeftRight className="w-4 h-4" />
            <span>Exporter le rapport</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className={cn(
            "bg-white p-4 md:p-6 rounded-xl relative overflow-hidden group shadow-sm border border-surface-container-high",
            i === kpis.length - 1 && "col-span-2 sm:col-span-1"
          )}>
            <div className={cn("absolute left-0 top-0 bottom-0 w-1", kpi.color)}></div>
            <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em] mb-2 md:mb-4">{kpi.label}</p>
            <div className="flex items-baseline space-x-2">
              <span className="font-headline text-2xl md:text-3xl font-bold text-primary">{kpi.value}</span>
              <kpi.icon className={cn("w-3 h-3 md:w-4 md:h-4", kpi.trendColor)} />
            </div>
            <div className={cn("mt-2 md:mt-4 flex items-center text-[10px] md:text-[11px] font-medium", kpi.trendColor)}>
              {kpi.trend}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6 md:gap-8">
        <div className="col-span-12 lg:col-span-4 space-y-6 md:space-y-8">
          <div className="bg-primary text-white p-6 md:p-8 rounded-2xl relative overflow-hidden group shadow-2xl shadow-primary/20">
            <div className="absolute -right-4 -top-4 opacity-10">
              <Sparkles className="w-24 md:w-32 h-24 md:h-32" />
            </div>
            <div className="flex items-center space-x-3 mb-4 md:mb-6">
              <div className="w-8 h-8 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
                <Sparkles className="text-primary-fixed w-5 h-5" />
              </div>
              <h3 className="font-headline font-bold text-lg tracking-tight">Résumé intelligent IA</h3>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-5 backdrop-blur-sm">
              <p className="text-primary-fixed text-sm leading-relaxed">
                "Analyse : Le stock de <span className="font-bold text-white">Ciment CPJ 35</span> est critique au Dépôt Principal. 3 retours attendus aujourd'hui."
              </p>
            </div>
            <button className="mt-4 md:mt-6 text-xs font-semibold text-primary-fixed-dim hover:text-white transition-colors flex items-center space-x-1 group/btn">
              <span>Consulter l'analyse complète</span>
              <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="bg-surface-container-low p-6 md:p-8 rounded-2xl">
            <h3 className="font-headline font-bold text-primary text-lg mb-4 md:mb-6 flex items-center space-x-2">
              <Sparkles className="w-5 h-5" />
              <span>Actions rapides</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <Link to="/inventory/new-movement" className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
                    <PlusCircle className="text-primary w-5 h-5" />
                  </div>
                  <span className="text-sm font-semibold text-on-primary-fixed">Enregistrer une entrée</span>
                </div>
                <ChevronRight className="text-outline-variant w-4 h-4" />
              </Link>
              <Link to="/inventory/new-movement" className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
                    <MinusCircle className="text-primary w-5 h-5" />
                  </div>
                  <span className="text-sm font-semibold text-on-primary-fixed">Enregistrer une sortie</span>
                </div>
                <ChevronRight className="text-outline-variant w-4 h-4" />
              </Link>
              <Link to="/inventory/new-movement" className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
                    <MoveUp className="text-primary w-5 h-5" />
                  </div>
                  <span className="text-sm font-semibold text-on-primary-fixed">Transférer un article</span>
                </div>
                <ChevronRight className="text-outline-variant w-4 h-4" />
              </Link>
              <Link to="/audits" className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
                    <ClipboardList className="text-primary w-5 h-5" />
                  </div>
                  <span className="text-sm font-semibold text-on-primary-fixed">Lancer un inventaire</span>
                </div>
                <ChevronRight className="text-outline-variant w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-6 md:space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-surface-container-high overflow-hidden">
            <div className="flex justify-between items-center mb-6 md:mb-8">
              <div>
                <h3 className="font-headline font-bold text-primary text-lg leading-tight">Répartition des stocks</h3>
                <p className="text-on-surface-variant text-xs mt-1">Comparaison par lieu de stockage principal</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="flex items-center space-x-1.5 px-3 py-1 bg-surface-container rounded-full text-[10px] font-bold text-on-surface-variant">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  <span>VALEUR (FCFA)</span>
                </span>
              </div>
            </div>
            <div className="flex space-x-4 md:space-x-8 h-48 md:h-64 px-2 md:px-4">
              {[
                { label: 'Dépôt Parakou', val: '85%', color: 'bg-primary-container' },
                { label: 'Dépôt Cotonou', val: '60%', color: 'bg-primary' },
                { label: 'Chantier Porto-Novo', val: '45%', color: 'bg-primary-container' },
                { label: 'Chantier Ouidah', val: '30%', color: 'bg-primary' },
                { label: 'Transit Bohicon', val: '15%', color: 'bg-primary-container' },
              ].map((bar, i) => (
                <div key={i} className="flex-1 h-full flex flex-col group">
                  <div className="flex-1 w-full bg-surface-container-high rounded-t-lg relative flex items-end justify-center overflow-hidden">
                    <div className={cn("w-full transition-all duration-500 group-hover:opacity-80", bar.color)} style={{ height: bar.val }}></div>
                  </div>
                  <span className="text-[9px] md:text-[11px] font-bold text-on-surface mt-2 md:mt-4 uppercase text-center whitespace-nowrap">{bar.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-surface-container-high">
            <div className="px-6 md:px-8 py-4 md:py-6 flex justify-between items-center border-b border-surface-dim/20">
              <h3 className="font-headline font-bold text-primary text-lg">Mouvements récents</h3>
              <Link to="/movements" className="text-xs font-bold text-primary hover:underline underline-offset-4">Voir tout</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="bg-surface-container-high/50">
                    <th className="px-6 md:px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Référence</th>
                    <th className="px-6 md:px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Article</th>
                    <th className="px-6 md:px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Type</th>
                    <th className="px-6 md:px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Quantité</th>
                    <th className="px-6 md:px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-dim/10">
                  {movements.map((mv, i) => (
                    <tr key={i} className="hover:bg-surface-container-low transition-colors group cursor-default">
                      <td className="px-6 md:px-8 py-4 text-xs font-semibold text-primary">{mv.ref}</td>
                      <td className="px-6 md:px-8 py-4 text-xs font-medium text-on-surface">{mv.article}</td>
                      <td className="px-6 md:px-8 py-4">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-full",
                          mv.type === 'ENTRÉE' ? "text-emerald-600 bg-emerald-50" : 
                          mv.type === 'SORTIE' ? "text-amber-600 bg-amber-50" : 
                          "text-primary-container bg-primary-fixed"
                        )}>
                          {mv.type}
                        </span>
                      </td>
                      <td className="px-6 md:px-8 py-4 text-xs text-on-surface font-semibold">{mv.qty}</td>
                      <td className="px-6 md:px-8 py-4">
                        <div className="flex items-center text-emerald-600 space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase">{mv.status}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
