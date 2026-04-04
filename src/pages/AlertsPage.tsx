import React from 'react';
import { 
  Bell, 
  Search, 
  Filter, 
  History, 
  Bot, 
  ArrowRight, 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  Hammer, 
  ChevronRight,
  FileText,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

const alerts = [
  {
    id: 1,
    priority: 'Critique',
    priorityColor: 'border-error border-l-4',
    tagColor: 'bg-error/10 text-error',
    type: 'Rupture de Stock',
    title: 'Ciment Multibat Lafarge 35kg',
    details: 'Quantité : 0 sacs • Seuil min : 50 sacs • Chantier : Résidence Horizon',
    icon: Package,
    iconColor: 'bg-error/5 text-error'
  },
  {
    id: 2,
    priority: 'Élevée',
    priorityColor: 'border-orange-500 border-l-4',
    tagColor: 'bg-orange-50 text-orange-600',
    type: 'Stock faible',
    title: 'Gants de protection Nitrile (Taille L)',
    details: 'Quantité : 12 paires • Seuil min : 40 paires • Lieu : Dépôt Central',
    icon: TrendingUp,
    iconColor: 'bg-orange-50 text-orange-600'
  },
  {
    id: 3,
    priority: 'Normale',
    priorityColor: 'border-slate-300 border-l-4',
    tagColor: 'bg-slate-100 text-slate-500',
    type: 'Matériel non retourné',
    title: 'Perforateur Hilti TE 70-ATC',
    details: 'Prévu le : 14/05/2024 • Retard : 3 jours • Assigné à : M. Durand',
    icon: Hammer,
    iconColor: 'bg-slate-50 text-slate-500'
  },
  {
    id: 4,
    priority: 'Élevée',
    priorityColor: 'border-orange-500 border-l-4',
    tagColor: 'bg-orange-50 text-orange-600',
    type: "Écart d'inventaire",
    title: 'Câbles Electriques RO2V 3G2.5',
    details: '-45 mètres détectés lors de l\'audit hebdomadaire.',
    icon: AlertTriangle,
    iconColor: 'bg-orange-50 text-orange-600'
  }
];

export default function AlertsPage() {
  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-[10px] text-slate-500 mb-2 font-headline font-bold uppercase tracking-widest">
            <span>Gestion</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary">Alertes Actives</span>
          </nav>
          <h2 className="text-4xl font-headline font-bold text-primary tracking-tight">Centre de Surveillance</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="px-6 py-2.5 bg-white text-primary font-semibold text-sm rounded-xl shadow-sm flex items-center gap-2 border border-slate-100 hover:bg-slate-50 transition-all">
            <Filter className="w-4 h-4" />
            Filtrer par Priorité
          </button>
          <button className="px-6 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl shadow-lg flex items-center gap-2 hover:bg-primary-container transition-all active:scale-95">
            <History className="w-4 h-4" />
            Historique des résolutions
          </button>
        </div>
      </div>

      {/* AI Insights & KPI */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* IA Analysis Block */}
        <div className="lg:col-span-8 bg-primary-container rounded-2xl p-8 flex flex-col md:flex-row gap-8 items-center border border-white/5 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary rounded-full blur-[80px] opacity-20"></div>
          <div className="relative z-10 w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center shadow-2xl shrink-0">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-primary-fixed text-primary px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter">Assistant IA</span>
              <span className="text-slate-400 text-xs">Analyse en temps réel effectuée il y a 5 min</span>
            </div>
            <h3 className="text-white text-xl font-headline font-bold mb-3">Résumé des alertes prioritaires</h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              Le stock de <span className="text-white font-semibold">Ciment 35kg (Lafarge)</span> est à son seuil critique sur 3 chantiers simultanément. 
              Une rupture est prévue sous <span className="text-error font-bold">48 heures</span> si aucune commande n'est passée. 
              Notez également 2 perceuses Hilti non retournées au dépôt de Cotonou.
            </p>
          </div>
          <button className="relative z-10 shrink-0 bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-colors">
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        {/* KPI Card */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-8 shadow-sm relative border border-slate-100">
          <div className="w-1 h-12 bg-primary absolute left-0 top-8 rounded-r-full"></div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Alertes en attente</p>
          <h4 className="text-5xl font-headline font-extrabold text-primary mb-4 tracking-tighter">24</h4>
          <div className="flex items-center gap-2 text-xs font-medium text-error">
            <TrendingUp className="w-4 h-4" />
            <span>+12% par rapport à hier</span>
          </div>
        </div>
      </section>

      {/* Alerts List */}
      <div className="space-y-6">
        <h3 className="text-lg font-headline font-bold text-primary px-2">Liste priorisée des anomalies</h3>
        
        {alerts.map((alert) => (
          <div 
            key={alert.id} 
            className={cn(
              "bg-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:translate-x-1 transition-transform duration-300",
              alert.priorityColor
            )}
          >
            <div className="flex items-center gap-6">
              <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center shrink-0", alert.iconColor)}>
                <alert.icon className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full", alert.tagColor)}>
                    {alert.priority}
                  </span>
                  <span className="text-xs text-slate-400 font-medium tracking-wide">{alert.type}</span>
                </div>
                <h4 className="text-base font-bold text-primary font-headline">{alert.title}</h4>
                <p className="text-sm text-slate-500 mt-1" dangerouslySetInnerHTML={{ __html: alert.details }} />
              </div>
            </div>
            
            <div className="flex items-center gap-3 md:opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="px-4 py-2 text-xs font-bold text-primary hover:bg-slate-100 rounded-lg transition-colors">Ignorer</button>
              <button className="px-4 py-2 text-xs font-bold text-primary border border-slate-200 rounded-lg hover:border-primary transition-all">Voir l'article</button>
              <button className="px-5 py-2 text-xs font-bold text-white bg-primary rounded-lg shadow-sm hover:bg-primary-container transition-colors">Créer une action</button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Action bar */}
      <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-slate-500 italic">Toutes les alertes sont synchronisées avec le module SAP de l'entreprise.</p>
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-sm text-primary font-semibold hover:underline">
            <FileText className="w-4 h-4" />
            Exporter le rapport d'incidents (.PDF)
          </button>
          <span className="hidden md:block text-slate-300">|</span>
          <button className="flex items-center gap-2 text-sm text-primary font-semibold hover:underline">
            <MessageSquare className="w-4 h-4" />
            Contacter le responsable logistique
          </button>
        </div>
      </div>
    </div>
  );
}
