import React, { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Grid3X3,
  LayoutList,
  Plus,
  Search,
  MapPin,
  Calendar,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Construction,
  CheckCircle2,
  Pause,
  Pencil,
  Play,
  XCircle,
  Clock,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { apiServices } from '@/lib/api';
import { useCurrentUser } from '@/context/CurrentUserContext';
import { isPaginatedResponse } from '@/types/common';
import type {
  Project,
  ProjectPriority,
  ProjectStatus,
  ProjectType,
} from '@/types/api';

const PAGE_SIZE = 12;

const STATUS_META: Record<
  ProjectStatus,
  { label: string; pill: string; icon: typeof Construction }
> = {
  brouillon: {
    label: 'Brouillon',
    pill: 'bg-slate-100 text-slate-600',
    icon: Pencil,
  },
  planification: {
    label: 'En planification',
    pill: 'bg-blue-100 text-blue-700',
    icon: Clock,
  },
  en_cours: {
    label: 'En cours',
    pill: 'bg-emerald-100 text-emerald-700',
    icon: Play,
  },
  suspendu: {
    label: 'Suspendu',
    pill: 'bg-orange-100 text-orange-700',
    icon: Pause,
  },
  termine: {
    label: 'Terminé',
    pill: 'bg-violet-100 text-violet-700',
    icon: CheckCircle2,
  },
  annule: {
    label: 'Annulé',
    pill: 'bg-red-100 text-red-700',
    icon: XCircle,
  },
};

const TYPE_LABELS: Record<ProjectType, string> = {
  residentiel_collectif: 'Résidentiel collectif',
  tertiaire: 'Tertiaire / Bureaux',
  infrastructure_publique: 'Infrastructure publique',
};

const PRIORITY_LABELS: Record<ProjectPriority, string> = {
  haute: 'Haute',
  moyenne: 'Moyenne',
  basse: 'Basse',
};

function formatBudget(value: string | null, currency: string): string {
  if (!value) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n >= 1_000_000_000)
    return `${(n / 1_000_000_000).toFixed(1)} Md ${currency}`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M ${currency}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k ${currency}`;
  return `${n.toLocaleString('fr-FR')} ${currency}`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return '–';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '–';
}

export default function ProjectsPage() {
  const { user } = useCurrentUser();
  const canCreate =
    user?.role === 'administrateur' || user?.role === 'conducteur_travaux';

  const [projects, setProjects] = useState<Project[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'' | ProjectStatus>('');
  const [typeFilter, setTypeFilter] = useState<'' | ProjectType>('');
  const [priorityFilter, setPriorityFilter] = useState<'' | ProjectPriority>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    try {
      return (
        (localStorage.getItem('projects_view_mode') as 'grid' | 'table') ||
        'grid'
      );
    } catch {
      return 'grid';
    }
  });

  const handleViewModeChange = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    try {
      localStorage.setItem('projects_view_mode', mode);
    } catch {
      // localStorage may be unavailable
    }
  };

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    const params: Record<string, string | number> = {
      page,
      page_size: PAGE_SIZE,
      ordering: '-created_at',
    };
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.project_type = typeFilter;
    if (priorityFilter) params.priority = priorityFilter;
    const q = searchQuery.trim();
    if (q) params.search = q;
    apiServices.projects
      .rawList(params)
      .then((resp) => {
        if (cancelled) return;
        if (isPaginatedResponse(resp)) {
          setProjects(resp.results);
          setTotalCount(resp.count);
        } else {
          setProjects(resp);
          setTotalCount(resp.length);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("Impossible de charger les chantiers pour le moment.");
        setProjects([]);
        setTotalCount(0);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, typeFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter, priorityFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageTo = Math.min(page * PAGE_SIZE, totalCount);

  // KPIs dérivés
  const kpis = useMemo(() => {
    const activeCount = projects.filter((p) => p.status === 'en_cours').length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = projects.filter((p) => {
      if (p.status !== 'en_cours' || !p.end_date) return false;
      const d = new Date(p.end_date);
      return d < today;
    }).length;
    const totalBudget = projects.reduce(
      (sum, p) => sum + (Number(p.budget_amount) || 0),
      0,
    );
    return {
      activeOnPage: activeCount,
      overdueOnPage: overdue,
      totalBudgetOnPage: totalBudget,
      currency: projects[0]?.currency ?? 'XOF',
    };
  }, [projects]);

  const resetFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
    setPriorityFilter('');
    setSearchQuery('');
  };

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-on-primary-container uppercase tracking-widest">
            Opérations
          </span>
          <h2 className="font-headline text-3xl font-bold text-primary">
            Gestion des Chantiers
          </h2>
          <p className="text-on-surface-variant text-sm md:text-base max-w-2xl">
            Suivez l'avancement de vos projets, gérez les ressources et
            surveillez les alertes critiques sur chaque site.
          </p>
        </div>
        {canCreate ? (
          <Link
            to="/projects/new"
            className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-headline font-semibold text-sm shadow-xl hover:shadow-primary/20 transition-all duration-400 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Nouveau Chantier</span>
          </Link>
        ) : null}
      </div>

      {/* KPIs (calculés sur la page courante) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-surface-container-high shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/5 rounded-lg">
              <Construction className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Chantiers en cours
            </span>
          </div>
          <p className="text-3xl font-headline font-extrabold text-primary">
            {kpis.activeOnPage}
          </p>
          <p className="mt-2 text-[10px] text-slate-400 font-medium">
            Sur les {projects.length} affichés
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-surface-container-high shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              En retard
            </span>
          </div>
          <p className="text-3xl font-headline font-extrabold text-orange-600">
            {kpis.overdueOnPage}
          </p>
          <p className="mt-2 text-[10px] text-slate-400 font-medium">
            Date de fin dépassée
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-surface-container-high shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Budget cumulé (page)
            </span>
          </div>
          <p className="text-2xl font-headline font-extrabold text-green-600">
            {formatBudget(String(kpis.totalBudgetOnPage), kpis.currency)}
          </p>
          <p className="mt-2 text-[10px] text-slate-400 font-medium">
            Somme des budgets prévisionnels
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-surface-container-high shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total chantiers
            </span>
          </div>
          <p className="text-3xl font-headline font-extrabold text-blue-600">
            {totalCount}
          </p>
          <p className="mt-2 text-[10px] text-slate-400 font-medium">
            Tous statuts confondus
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white p-6 rounded-2xl border border-surface-container-high shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher nom, référence, ville, client…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ProjectStatus | '')
            }
            className="px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm"
          >
            <option value="">Tous statuts</option>
            {(Object.keys(STATUS_META) as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ProjectType | '')}
            className="px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm"
          >
            <option value="">Tous types</option>
            {(Object.keys(TYPE_LABELS) as ProjectType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as ProjectPriority | '')
            }
            className="px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm"
          >
            <option value="">Toutes priorités</option>
            {(Object.keys(PRIORITY_LABELS) as ProjectPriority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {isLoading
              ? 'Chargement…'
              : totalCount === 0
              ? 'Aucun chantier ne correspond aux critères.'
              : `Affichage ${pageFrom}–${pageTo} sur ${totalCount}`}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => handleViewModeChange('grid')}
                className={cn(
                  'px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all',
                  viewMode === 'grid'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-slate-400 hover:text-slate-600',
                )}
                title="Vue grille"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                Grille
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('table')}
                className={cn(
                  'px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all',
                  viewMode === 'table'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-slate-400 hover:text-slate-600',
                )}
                title="Vue tableau"
              >
                <LayoutList className="w-3.5 h-3.5" />
                Tableau
              </button>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* État d'erreur */}
      {loadError ? (
        <div className="rounded-xl border border-error/20 bg-error-container/20 px-4 py-3 text-sm text-error">
          {loadError}
        </div>
      ) : null}

      {/* Vue Grille */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {projects.map((project) => {
            const meta = STATUS_META[project.status] ?? STATUS_META.brouillon;
            const StatusIcon = meta.icon;
            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl border border-surface-container-high shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300"
              >
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-headline font-bold text-lg text-primary group-hover:text-primary-container transition-colors truncate">
                        {project.name}
                      </h3>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                        {project.reference}
                      </p>
                      {(project.address || project.city) && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="text-xs truncate">
                            {[project.address, project.city]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0',
                        meta.pill,
                      )}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {meta.label}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">Progression</span>
                      <span className="text-primary">
                        {project.progress_percent}%
                      </span>
                    </div>
                    <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                      <div
                        className="h-full architectural-gradient rounded-full"
                        style={{ width: `${project.progress_percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-surface-dim/10">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Début
                      </p>
                      <div className="flex items-center gap-2 text-sm text-primary font-medium">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {formatDate(project.start_date)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Budget
                      </p>
                      <div className="flex items-center gap-2 text-sm text-primary font-medium">
                        <BarChart3 className="w-4 h-4 text-slate-400" />
                        {formatBudget(project.budget_amount, project.currency)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-[10px] font-bold text-primary border-2 border-white shadow-sm shrink-0">
                        {initialsOf(project.manager_name)}
                      </div>
                      <div className="text-[10px] min-w-0">
                        <p className="font-bold text-primary">Responsable</p>
                        <p className="text-slate-500 truncate">
                          {project.manager_name ?? '—'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-[10px]">
                      <p className="font-bold text-slate-500">
                        {project.movements_count ?? 0} mouvement
                        {(project.movements_count ?? 0) > 1 ? 's' : ''}
                      </p>
                      <p className="text-slate-400">
                        {project.phases_count ?? 0} phase
                        {(project.phases_count ?? 0) > 1 ? 's' : ''}
                      </p>
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
            );
          })}

          {!isLoading && projects.length === 0 ? (
            <div className="lg:col-span-3 bg-surface-container-low/30 border-2 border-dashed border-surface-container-high rounded-2xl flex flex-col items-center justify-center p-12 gap-4 min-h-[280px]">
              <Construction className="w-12 h-12 text-slate-300" />
              <div className="text-center">
                <p className="font-headline font-bold text-primary">
                  Aucun chantier
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Aucun chantier ne correspond à vos critères. Modifiez les
                  filtres ou créez un nouveau chantier.
                </p>
              </div>
              {canCreate ? (
                <Link
                  to="/projects/new"
                  className="mt-2 inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold text-xs shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Créer un chantier
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Vue Tableau */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {projects.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-4 min-h-[200px]">
              <Construction className="w-12 h-12 text-slate-300" />
              <div className="text-center">
                <p className="font-headline font-bold text-primary">
                  Aucun chantier
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Aucun chantier ne correspond à vos critères.
                </p>
              </div>
              {canCreate ? (
                <Link
                  to="/projects/new"
                  className="mt-2 inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold text-xs shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Créer un chantier
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-low/50 text-[10px] uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Référence</th>
                    <th className="px-4 py-3 font-bold">Nom du chantier</th>
                    <th className="px-4 py-3 font-bold">Type</th>
                    <th className="px-4 py-3 font-bold">Statut</th>
                    <th className="px-4 py-3 font-bold">Chef de chantier</th>
                    <th className="px-4 py-3 font-bold">Dates</th>
                    <th className="px-4 py-3 font-bold">Avancement</th>
                    <th className="px-4 py-3 font-bold text-right">Budget</th>
                    <th className="px-4 py-3 font-bold text-center">Phases</th>
                    <th className="px-4 py-3 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projects.map((project) => {
                    const meta =
                      STATUS_META[project.status] ?? STATUS_META.brouillon;
                    const StatusIcon = meta.icon;
                    return (
                      <tr
                        key={project.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                          {project.reference}
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">
                          {project.name}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {TYPE_LABELS[project.project_type] ??
                            project.project_type}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                              meta.pill,
                            )}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {project.manager_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatDate(project.start_date)} →{' '}
                          {formatDate(project.end_date)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  width: `${project.progress_percent}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-bold text-primary w-8 text-right">
                              {project.progress_percent}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-semibold text-primary">
                          {formatBudget(project.budget_amount, project.currency)}
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                          {project.phases_count ?? 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            to={`/projects/${project.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Voir
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-surface-container-high shadow-sm">
          <p className="text-xs text-slate-500">
            Page {page} sur {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Précédent
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Suivant
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
