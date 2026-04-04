import React from 'react';
import { 
  Plus, 
  Search, 
  MapPin, 
  Users, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  MoreVertical,
  ChevronRight,
  Construction,
  CheckCircle2,
  Clock,
  BarChart3
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const projects = [
  { 
    id: 'PRJ-2024-001',
    name: 'Résidence Horizon', 
    location: 'Quartier Haie Vive, Cotonou',
    manager: 'Sophie Adjovi',
    managerInitials: 'SA',
    status: 'En cours',
    statusColor: 'bg-primary-fixed text-primary',
    progress: 65,
    startDate: '15 Jan. 2024',
    endDate: '20 Déc. 2024',
    budget: '787M FCFA',
    alerts: 2
  },
  { 
    id: 'PRJ-2024-002',
    name: 'Éco-Quartier "Les Rives"', 
    location: 'Quartier Ganhi, Cotonou',
    manager: 'Amélie Sènan',
    managerInitials: 'AS',
    status: 'Fondations',
    statusColor: 'bg-secondary-container text-on-secondary-fixed-variant',
    progress: 15,
    startDate: '01 Mar. 2024',
    endDate: '15 Juin 2025',
    budget: '2.9B FCFA',
    alerts: 0
  },
  { 
    id: 'PRJ-2023-045',
    name: 'Rénovation Hôtel de Ville', 
    location: 'Quartier Ouando, Porto-Novo',
    manager: 'Marc Dossou',
    managerInitials: 'MD',
    status: 'Finalisation',
    statusColor: 'bg-green-100 text-green-700',
    progress: 92,
    startDate: '10 Oct. 2023',
    endDate: '30 Avr. 2024',
    budget: '557M FCFA',
    alerts: 5
  },
];

export default function ProjectsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-on-primary-container uppercase tracking-widest">Opérations</span>
          <h2 className="font-headline text-3xl font-bold text-primary">Gestion des Chantiers</h2>
          <p className="text-on-surface-variant text-sm md:text-base max-w-2xl">
            Suivez l'avancement de vos projets, gérez les ressources et surveillez les alertes critiques sur chaque site.
          </p>
        </div>
        <Link to="/projects/new" className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-headline font-semibold text-sm shadow-xl hover:shadow-primary/20 transition-all duration-400 active:scale-95">
          <Plus className="w-5 h-5" />
          <span>Nouveau Chantier</span>
        </Link>
      </div>

      {/* Project KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-surface-container-high shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/5 rounded-lg">
              <Construction className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chantiers Actifs</span>
          </div>
          <p className="text-3xl font-headline font-extrabold text-primary">12</p>
          <div className="mt-2 flex items-center gap-1 text-[10px] text-green-500 font-bold">
            <TrendingUp className="w-3 h-3" />
            <span>+2 ce mois</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-surface-container-high shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alertes Critiques</span>
          </div>
          <p className="text-3xl font-headline font-extrabold text-orange-600">07</p>
          <p className="mt-2 text-[10px] text-slate-400 font-medium">Sur 4 chantiers différents</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-surface-container-high shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taux de Complétion</span>
          </div>
          <p className="text-3xl font-headline font-extrabold text-green-600">84%</p>
          <p className="mt-2 text-[10px] text-slate-400 font-medium">Moyenne globale des projets</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-surface-container-high shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Effectif Total</span>
          </div>
          <p className="text-3xl font-headline font-extrabold text-blue-600">156</p>
          <p className="mt-2 text-[10px] text-slate-400 font-medium">Ouvriers et techniciens actifs</p>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {projects.map((project) => (
          <div key={project.id} className="bg-white rounded-2xl border border-surface-container-high shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-headline font-bold text-lg text-primary group-hover:text-primary-container transition-colors">{project.name}</h3>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-xs">{project.location}</span>
                  </div>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  project.statusColor
                )}>
                  {project.status}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">Progression</span>
                  <span className="text-primary">{project.progress}%</span>
                </div>
                <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                  <div 
                    className="h-full architectural-gradient rounded-full" 
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-surface-dim/10">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Début</p>
                  <div className="flex items-center gap-2 text-sm text-primary font-medium">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {project.startDate}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Budget</p>
                  <div className="flex items-center gap-2 text-sm text-primary font-medium">
                    <BarChart3 className="w-4 h-4 text-slate-400" />
                    {project.budget}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-[10px] font-bold text-primary border-2 border-white shadow-sm">
                    {project.managerInitials}
                  </div>
                  <div className="text-[10px]">
                    <p className="font-bold text-primary">Responsable</p>
                    <p className="text-slate-500">{project.manager}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {project.alerts > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-error/10 text-error rounded-lg text-[10px] font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      {project.alerts}
                    </div>
                  )}
                  <button className="p-2 hover:bg-surface-container rounded-lg text-slate-400 hover:text-primary transition-all">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            
            <Link 
              to={`/projects/${project.id}`}
              className="w-full py-4 bg-surface-container-low/50 border-t border-surface-dim/10 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <span>Voir les détails du chantier</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ))}

        {/* Add New Project Card */}
        <Link 
          to="/projects/new"
          className="bg-surface-container-low/30 border-2 border-dashed border-surface-container-high rounded-2xl flex flex-col items-center justify-center p-8 gap-4 group hover:border-primary/30 hover:bg-primary/5 transition-all duration-400 min-h-[350px]"
        >
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:scale-110 transition-all shadow-sm">
            <Plus className="w-6 h-6" />
          </div>
          <div className="text-center">
            <p className="font-headline font-bold text-primary">Nouveau Projet</p>
            <p className="text-xs text-slate-400 mt-1">Ajouter un nouveau site de construction</p>
          </div>
        </Link>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-2xl border border-surface-container-high shadow-sm overflow-hidden">
        <div className="p-6 border-b border-surface-dim/10 flex items-center justify-between">
          <h3 className="font-headline font-bold text-lg text-primary">Activité Récente des Chantiers</h3>
          <button className="text-sm font-bold text-primary hover:underline">Voir tout</button>
        </div>
        <div className="divide-y divide-surface-dim/10">
          {[
            { project: 'Résidence Horizon', action: 'Livraison de 200 sacs de ciment', time: 'Il y a 45 min', icon: Clock },
            { project: 'Éco-Quartier "Les Rives"', action: 'Alerte : Retard sur la phase fondations', time: 'Il y a 2h', icon: AlertTriangle, color: 'text-orange-500' },
            { project: 'Rénovation Hôtel de Ville', action: 'Contrôle technique validé', time: 'Hier, 16:30', icon: CheckCircle2, color: 'text-green-500' },
          ].map((activity, i) => (
            <div key={i} className="p-6 flex items-center justify-between hover:bg-surface-container-low/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-lg bg-surface-container", activity.color)}>
                  <activity.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">{activity.project}</p>
                  <p className="text-xs text-slate-500">{activity.action}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
