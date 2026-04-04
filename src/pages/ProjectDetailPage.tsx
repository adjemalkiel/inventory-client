import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Construction, 
  Users, 
  Package, 
  Brain, 
  HelpCircle, 
  LogOut, 
  Search, 
  Bell, 
  Settings, 
  CheckCircle2, 
  PlusCircle, 
  ArrowLeftRight, 
  AlertTriangle, 
  HardHat, 
  CreditCard, 
  Wrench, 
  Zap, 
  Hammer, 
  BarChart3, 
  AlertCircle,
  Clock,
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock data for the specific project
  const project = {
    name: "Résidence Horizon",
    location: "Cotonou, Bénin",
    status: "En cours",
    manager: "Sophie Adjovi",
    budget: "787M FCFA",
    progress: 65,
    kpis: [
      { label: "Articles affectés", value: "42", icon: Package, color: "text-primary" },
      { label: "Mouvements (24h)", value: "12", icon: ArrowLeftRight, color: "text-primary" },
      { label: "Alertes ouvertes", value: "3", icon: AlertTriangle, color: "text-error" },
      { label: "Effectif total", value: "24", icon: HardHat, color: "text-primary" },
      { label: "Budget consommé", value: "511M", subValue: "FCFA (65%)", icon: CreditCard, color: "text-primary" },
    ],
    phases: [
      { name: "Préparation", progress: 100 },
      { name: "Fondations", progress: 100 },
      { name: "Gros œuvre", progress: 80 },
      { name: "Second œuvre", progress: 15, dim: true },
      { name: "Finitions", progress: 0, dim: true },
    ],
    inventory: [
      { name: "Perceuse Bosch 18V", id: "BSH-18-092", status: "Opérationnel", statusColor: "text-emerald-600", dotColor: "bg-emerald-500", team: "Équipe Gros Œuvre", icon: Wrench },
      { name: "Groupe électrogène 5 kVA", id: "GEN-SDMO-44", status: "Opérationnel", statusColor: "text-emerald-600", dotColor: "bg-emerald-500", team: "Logistique site", icon: Zap },
      { name: "Échafaudage roulant", id: "ECH-FAC-001", status: "Entretien requis", statusColor: "text-amber-600", dotColor: "bg-amber-500", team: "Second Œuvre", icon: Hammer },
    ],
    activity: [
      { time: "Il y a 14 min", text: "S. Adjovi a validé la réception du lot Béton B25.", type: "success" },
      { time: "Il y a 2h", text: "Sortie d'inventaire: 5x Casques de sécurité (M. Traoré).", type: "default" },
      { time: "Hier, 16:45", text: "Mise à jour de l'avancement : Phase Gros Œuvre (+5%).", type: "default" },
      { time: "Hier, 09:12", text: "Alerte de sécurité résolue : Zone B balisée.", type: "error" },
    ]
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-2xl text-[#091426] font-headline">Détails du Chantier</h2>
      </div>

      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <div className="lg:col-span-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold tracking-widest uppercase rounded-full">
              {project.status}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">• {project.location}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-primary tracking-tight mb-6 font-headline">
            {project.name}
          </h1>
          <div className="flex flex-wrap gap-8 md:gap-12 border-l-2 border-primary/10 pl-8">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-bold">Responsable</p>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">{project.manager}</span>
                <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500" />
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-bold">Budget Total</p>
              <p className="font-bold text-primary">{project.budget}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 font-bold">Progression Globale</p>
              <div className="flex items-center gap-3">
                <span className="font-bold text-primary">{project.progress}%</span>
                <div className="w-32 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${project.progress}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-4 flex flex-col gap-3 justify-end items-stretch lg:items-end">
          <Link 
            to="/movements/new"
            className="w-full architectural-gradient text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-5 h-5" />
            Enregistrer un mouvement
          </Link>
          <div className="grid grid-cols-2 gap-3 w-full">
            <button className="bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm font-semibold text-primary hover:bg-slate-50 transition-all">
              Modifier le chantier
            </button>
            <button className="bg-white border border-slate-200 px-4 py-3 rounded-xl text-sm font-semibold text-primary hover:bg-slate-50 transition-all">
              Ajouter une ressource
            </button>
          </div>
        </div>
      </section>

      {/* KPI Bento Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {project.kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-xl relative overflow-hidden shadow-sm border border-slate-100">
            {i === 0 && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-primary rounded-r-full"></div>}
            <p className={cn("text-[10px] uppercase tracking-widest font-bold mb-2", kpi.color === 'text-error' ? 'text-error' : 'text-slate-500')}>
              {kpi.label}
            </p>
            <p className={cn("text-4xl font-extrabold", kpi.color === 'text-error' ? 'text-error' : 'text-primary')}>
              {kpi.value}
            </p>
            {kpi.subValue && <p className="text-[10px] text-slate-400 font-medium">{kpi.subValue}</p>}
            <kpi.icon className={cn("absolute right-4 bottom-4 w-12 h-12 opacity-5", kpi.color === 'text-error' ? 'text-error' : 'text-primary')} />
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-10">
          {/* Progress by Phase */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-primary font-headline">Avancement par phase</h3>
              <button className="text-sm font-semibold text-primary/60 hover:text-primary transition-colors">Détail des jalons</button>
            </div>
            <div className="space-y-6">
              {project.phases.map((phase, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-2">
                    <span className={cn("text-sm font-semibold", phase.dim ? "text-slate-400" : "text-primary")}>
                      {phase.name}
                    </span>
                    <span className={cn("text-sm font-bold", phase.dim ? "text-slate-400" : "text-primary")}>
                      {phase.progress}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full", phase.dim ? "bg-primary/20" : "bg-primary")} 
                      style={{ width: `${phase.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Material Table */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100">
            <div className="p-8 pb-0 flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-primary font-headline">Inventaire matériel actif</h3>
              <span className="px-3 py-1 bg-surface-container-high rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {project.inventory.length} actifs
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-high/40 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-8 py-4 font-bold">Équipement</th>
                    <th className="px-8 py-4 font-bold">Identifiant</th>
                    <th className="px-8 py-4 font-bold">État</th>
                    <th className="px-8 py-4 font-bold">Assignation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.inventory.map((item, i) => (
                    <tr key={i} className="hover:bg-surface-container-low transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-surface-container-high rounded-lg group-hover:bg-white transition-colors">
                            <item.icon className="w-5 h-5 text-primary" />
                          </div>
                          <span className="font-semibold text-primary text-sm">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm text-slate-500 font-mono">{item.id}</td>
                      <td className="px-8 py-5">
                        <span className={cn("flex items-center gap-2 text-[11px] font-bold", item.statusColor)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", item.dotColor)}></span> 
                          {item.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-sm text-primary font-medium">{item.team}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-surface-container-low text-center">
              <button className="text-xs font-bold uppercase tracking-widest text-primary hover:tracking-[0.2em] transition-all">
                Consulter l'inventaire complet
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-10">
          {/* AI Analysis Box */}
          <div className="architectural-gradient p-8 rounded-xl text-white relative overflow-hidden group shadow-lg">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <Brain className="w-6 h-6 text-amber-400 fill-amber-400" />
                <h3 className="font-bold tracking-tight font-headline">Résumé prédictif IA</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-6 italic">
                "Risque de retard identifié pour la phase 'Gros œuvre'. Les projections indiquent une rupture potentielle d'approvisionnement en béton sous 4 jours si les commandes ne sont pas validées d'ici ce soir."
              </p>
              <button className="w-full py-3 bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg text-xs font-bold uppercase tracking-widest transition-all">
                Optimiser les flux
              </button>
            </div>
            <BarChart3 className="absolute -right-12 -bottom-12 w-48 h-48 opacity-5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
          </div>

          {/* Consumables Block */}
          <div className="bg-white p-8 rounded-xl border-l-4 border-error shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-primary font-headline">Alerte Consommables</h3>
              <AlertCircle className="w-6 h-6 text-error" />
            </div>
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-sm text-primary">Ciment CPJ 35</p>
                  <p className="text-[10px] text-slate-500">Lot: COT-4421</p>
                </div>
                <span className="px-2 py-1 bg-error-container text-on-error-container text-[10px] font-black rounded uppercase">
                  Rupture imminente
                </span>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-sm text-primary">Casque de sécurité blanc</p>
                  <p className="text-[10px] text-slate-500">Équipement EPI</p>
                </div>
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded uppercase">
                  Stock faible
                </span>
              </div>
            </div>
            <button className="mt-8 w-full border-2 border-primary/10 py-3 rounded-lg text-xs font-bold text-primary hover:bg-primary hover:text-white transition-all">
              Gérer les stocks
            </button>
          </div>

          {/* Recent Activity */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-primary px-2 font-headline">Activité récente</h3>
            <div className="space-y-8 relative before:content-[''] before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
              {project.activity.map((act, i) => (
                <div key={i} className="relative pl-12">
                  <div className={cn(
                    "absolute left-3.5 top-1.5 w-3 h-3 rounded-full border-4 border-white ring-2",
                    act.type === 'success' ? "bg-primary ring-primary/10" :
                    act.type === 'error' ? "bg-error ring-error/10" : "bg-slate-400 ring-slate-100"
                  )}></div>
                  <p className="text-xs text-slate-400 font-medium mb-1">{act.time}</p>
                  <p className={cn("text-sm", act.type === 'error' ? "font-semibold text-error" : act.type === 'success' ? "font-semibold text-primary" : "font-medium text-slate-600")}>
                    {act.text}
                  </p>
                </div>
              ))}
            </div>
            <button className="w-full py-2 text-xs font-bold text-primary/40 hover:text-primary transition-colors">
              Voir l'historique complet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
