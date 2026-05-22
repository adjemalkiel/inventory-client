import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  HardHat,
  LayoutDashboard,
  MapPin,
  Package,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiServices } from '@/lib/api';
import { isPaginatedResponse } from '@/types/common';
import { useCurrentUser } from '@/context/CurrentUserContext';
import type {
  ItemProjectAssignment,
  Project,
  ProjectBudgetCategory,
  ProjectBudgetLine,
  ProjectPhase,
  ProjectPhaseStatus,
  ProjectResource,
  ProjectStatus,
  ProjectSummary,
  StockMovement,
} from '@/types/api';

const STATUS_META: Record<
  ProjectStatus,
  { label: string; pill: string; icon: typeof Play; next: ProjectStatus[] }
> = {
  brouillon: {
    label: 'Brouillon',
    pill: 'bg-slate-100 text-slate-600',
    icon: Pencil,
    next: ['planification', 'annule'],
  },
  planification: {
    label: 'En planification',
    pill: 'bg-blue-100 text-blue-700',
    icon: ClipboardCheck,
    next: ['en_cours', 'brouillon', 'annule'],
  },
  en_cours: {
    label: 'En cours',
    pill: 'bg-emerald-100 text-emerald-700',
    icon: Play,
    next: ['suspendu', 'termine'],
  },
  suspendu: {
    label: 'Suspendu',
    pill: 'bg-orange-100 text-orange-700',
    icon: Pause,
    next: ['en_cours', 'annule'],
  },
  termine: {
    label: 'Terminé',
    pill: 'bg-violet-100 text-violet-700',
    icon: CheckCircle2,
    next: [],
  },
  annule: {
    label: 'Annulé',
    pill: 'bg-red-100 text-red-700',
    icon: XCircle,
    next: [],
  },
};

const PHASE_STATUS_META: Record<
  ProjectPhaseStatus,
  { label: string; pill: string }
> = {
  a_venir: { label: 'À venir', pill: 'bg-slate-100 text-slate-600' },
  en_cours: { label: 'En cours', pill: 'bg-emerald-100 text-emerald-700' },
  termine: { label: 'Terminé', pill: 'bg-violet-100 text-violet-700' },
  en_retard: { label: 'En retard', pill: 'bg-orange-100 text-orange-700' },
};

const BUDGET_CATEGORY_LABELS: Record<ProjectBudgetCategory, string> = {
  materiaux: 'Matériaux',
  main_oeuvre: "Main d'œuvre",
  sous_traitance: 'Sous-traitance',
  location: "Location d'équipements",
  frais_generaux: 'Frais généraux',
  logistique: 'Transport / Logistique',
  autre: 'Autre',
};

const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { id: 'phases', label: 'Phases', icon: ClipboardCheck },
  { id: 'budget', label: 'Budget', icon: BarChart3 },
  { id: 'stock', label: 'Stock & Mouvements', icon: ArrowLeftRight },
  { id: 'resources', label: 'Ressources', icon: Package },
  { id: 'team', label: 'Équipe', icon: Users },
] as const;

type TabId = (typeof TABS)[number]['id'];

function fmtDate(value: string | null | undefined): string {
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

function fmtMoney(value: string | number | null | undefined, currency: string): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${currency}`;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const canEdit =
    user?.role === 'administrateur' || user?.role === 'conducteur_travaux';

  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [budgetLines, setBudgetLines] = useState<ProjectBudgetLine[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [assignments, setAssignments] = useState<ItemProjectAssignment[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const [proj, sum, ph, bl, mvs, res, asg] = await Promise.all([
        apiServices.projects.get(id),
        apiServices.projects.summary(id).catch(() => null),
        apiServices.projectPhases.rawList({
          project: id,
          ordering: 'order',
          page_size: 100,
        }),
        apiServices.projectBudgetLines.rawList({
          project: id,
          page_size: 200,
        }),
        apiServices.stockMovements.rawList({
          project: id,
          ordering: '-created_at',
          page_size: 10,
        }),
        apiServices.projectResources.rawList({ project: id, page_size: 50 }),
        apiServices.itemProjectAssignments.rawList({
          project: id,
          page_size: 100,
        }),
      ]);
      setProject(proj);
      setSummary(sum);
      setPhases(isPaginatedResponse(ph) ? ph.results : ph);
      setBudgetLines(isPaginatedResponse(bl) ? bl.results : bl);
      setMovements(isPaginatedResponse(mvs) ? mvs.results : mvs);
      setResources(isPaginatedResponse(res) ? res.results : res);
      setAssignments(isPaginatedResponse(asg) ? asg.results : asg);
      setLoadError(null);
    } catch (err) {
      console.error('Failed to load project detail:', err);
      setLoadError("Impossible de charger ce chantier.");
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const currency = project?.currency ?? 'XOF';

  const budgetByCategory = useMemo(() => {
    const groups = new Map<
      ProjectBudgetCategory,
      { budget: number; actual: number | null; lines: ProjectBudgetLine[] }
    >();
    for (const line of budgetLines) {
      const g = groups.get(line.category) ?? {
        budget: 0,
        actual: null,
        lines: [],
      };
      g.budget += Number(line.budget_amount) || 0;
      if (line.actual_amount !== null && line.actual_amount !== '') {
        g.actual = (g.actual ?? 0) + (Number(line.actual_amount) || 0);
      }
      g.lines.push(line);
      groups.set(line.category, g);
    }
    return groups;
  }, [budgetLines]);

  const totals = useMemo(() => {
    let budget = 0;
    let actual = 0;
    let hasActual = false;
    for (const g of budgetByCategory.values()) {
      budget += g.budget;
      if (g.actual !== null) {
        actual += g.actual;
        hasActual = true;
      }
    }
    return { budget, actual: hasActual ? actual : null };
  }, [budgetByCategory]);

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!project) return;
    if (
      !window.confirm(
        `Confirmer le changement de statut vers « ${STATUS_META[newStatus].label} » ?`,
      )
    ) {
      return;
    }
    setActionError(null);
    try {
      const updated = await apiServices.projects.patch(project.id, {
        status: newStatus,
      });
      setProject(updated);
      await refresh();
    } catch (err) {
      console.error('Failed to update status:', err);
      setActionError("Le changement de statut a échoué.");
    }
  };

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-error mx-auto" />
        <h2 className="font-headline text-2xl font-bold text-primary">
          Chargement impossible
        </h2>
        <p className="text-sm text-slate-500">{loadError}</p>
        <button
          onClick={() => navigate('/projects')}
          className="mt-4 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold"
        >
          Retour aux chantiers
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        Chargement…
      </div>
    );
  }

  const statusMeta = STATUS_META[project.status] ?? STATUS_META.brouillon;
  const StatusIcon = statusMeta.icon;

  return (
    <div className="space-y-8 pb-16">
      {/* En-tête */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <Link to="/projects" className="hover:text-primary">
            Chantiers
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-primary font-semibold">{project.reference}</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                  statusMeta.pill,
                )}
              >
                <StatusIcon className="w-3 h-3" />
                {statusMeta.label}
              </span>
              {project.city || project.address ? (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {[project.address, project.city].filter(Boolean).join(', ')}
                </span>
              ) : null}
            </div>
            <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-primary tracking-tight">
              {project.name}
            </h1>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-600">
              <div>
                <span className="text-xs text-slate-400 mr-1">Chef :</span>
                <span className="font-semibold text-primary">
                  {project.manager_name ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 mr-1">Conducteur :</span>
                <span className="font-semibold text-primary">
                  {project.works_supervisor_name ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 mr-1">Période :</span>
                <span className="font-semibold text-primary">
                  {fmtDate(project.start_date)} → {fmtDate(project.end_date)}
                </span>
              </div>
            </div>
          </div>
          {canEdit && statusMeta.next.length > 0 ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-semibold">
                Changer le statut :
              </span>
              {statusMeta.next.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider',
                    STATUS_META[s].pill,
                    'hover:opacity-80',
                  )}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {actionError ? (
          <div className="mt-4 rounded-xl border border-error/20 bg-error-container/20 px-4 py-2.5 text-xs text-error">
            {actionError}
          </div>
        ) : null}
        {/* Progression */}
        <div className="mt-6 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-slate-500 uppercase tracking-widest">
              Progression globale
            </span>
            <span className="text-primary">{project.progress_percent}%</span>
          </div>
          <div className="h-2 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full architectural-gradient rounded-full"
              style={{ width: `${project.progress_percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-slate-200 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = t.id === activeTab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-primary',
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Onglet 1 — Vue d'ensemble */}
      {activeTab === 'overview' ? (
        <section className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Budget total"
              value={fmtMoney(project.budget_amount, currency)}
              icon={CreditCard}
            />
            <KpiCard
              label="Coût matières (sorties)"
              value={
                summary ? fmtMoney(summary.cost_materials_consumed, currency) : '—'
              }
              icon={Package}
              subValue={
                summary?.budget_consumed_percent !== null &&
                summary?.budget_consumed_percent !== undefined
                  ? `${summary.budget_consumed_percent}% du budget`
                  : undefined
              }
            />
            <KpiCard
              label="Mouvements de stock"
              value={String(summary?.total_movements ?? 0)}
              icon={ArrowLeftRight}
            />
            <KpiCard
              label="Articles affectés"
              value={String(summary?.items_assigned ?? 0)}
              icon={ClipboardCheck}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-headline font-bold text-primary mb-4">
                Informations clés
              </h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <Info label="Référence" value={project.reference} />
                <Info label="Type" value={project.project_type} />
                <Info
                  label="Client / Maître d'ouvrage"
                  value={project.client_name || '—'}
                />
                <Info label="Agence" value={project.agency_name ?? '—'} />
                <Info
                  label="Priorité"
                  value={project.priority}
                />
                <Info label="Criticité" value={project.criticality} />
                <Info
                  label="Valeur du marché"
                  value={fmtMoney(project.contract_value, currency)}
                />
                <Info
                  label="Surface"
                  value={
                    project.surface_m2
                      ? `${Number(project.surface_m2).toLocaleString('fr-FR')} m²`
                      : '—'
                  }
                />
                <Info
                  label="Mode de suivi"
                  value={
                    project.tracking_mode === 'progress'
                      ? 'Avancement %'
                      : 'Heures réelles'
                  }
                />
                <Info
                  label="Devise"
                  value={project.currency}
                />
              </dl>
              {project.description ? (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">
                    Description
                  </p>
                  <p className="text-sm text-slate-600 whitespace-pre-line">
                    {project.description}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h3 className="font-headline font-bold text-primary mb-2">
                Coûts complémentaires
              </h3>
              <p className="text-xs text-slate-400">
                Données alimentées en Section 7 (Coûts &amp; Marges).
              </p>
              <Info
                label="Main d'œuvre"
                value={fmtMoney(summary?.cost_labour, currency)}
              />
              <Info
                label="Sous-traitance"
                value={fmtMoney(summary?.cost_subcontracting, currency)}
              />
              <Info
                label="Location"
                value={fmtMoney(summary?.cost_rental, currency)}
              />
              <Info
                label="Coût total estimé"
                value={fmtMoney(summary?.cost_total, currency)}
              />
              <Info
                label="Marge"
                value={
                  summary?.margin_percent !== null &&
                  summary?.margin_percent !== undefined
                    ? `${summary.margin_percent}%`
                    : '—'
                }
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* Onglet 2 — Phases */}
      {activeTab === 'phases' ? (
        <PhasesTab
          projectId={project.id}
          phases={phases}
          canEdit={canEdit}
          onRefresh={refresh}
        />
      ) : null}

      {/* Onglet 3 — Budget */}
      {activeTab === 'budget' ? (
        <BudgetTab
          projectId={project.id}
          phases={phases}
          budgetLines={budgetLines}
          totals={totals}
          currency={currency}
          canEdit={canEdit}
          onRefresh={refresh}
        />
      ) : null}

      {/* Onglet 4 — Stock & mouvements */}
      {activeTab === 'stock' ? (
        <StockTab
          projectId={project.id}
          movements={movements}
          assignments={assignments}
          currency={currency}
        />
      ) : null}

      {/* Onglet 5 — Ressources */}
      {activeTab === 'resources' ? (
        <ResourcesTab resources={resources} />
      ) : null}

      {/* Onglet 6 — Équipe */}
      {activeTab === 'team' ? (
        <TeamTab project={project} />
      ) : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  subValue,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  subValue?: string;
}) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-primary/5">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
          {label}
        </span>
      </div>
      <p className="text-2xl font-headline font-extrabold text-primary">
        {value}
      </p>
      {subValue ? (
        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
          {subValue}
        </p>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-primary text-right truncate">
        {value}
      </dd>
    </div>
  );
}

function PhasesTab({
  projectId,
  phases,
  canEdit,
  onRefresh,
}: {
  projectId: string;
  phases: ProjectPhase[];
  canEdit: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiServices.projectPhases.create({
        project: projectId,
        name: name.trim(),
        order: phases.length + 1,
        status: 'a_venir',
        start_date: null,
        end_date: null,
        progress_percent: 0,
        budget_amount: null,
        description: '',
      } as never);
      setName('');
      await onRefresh();
    } catch {
      setError("Impossible d'ajouter la phase.");
    }
    setSaving(false);
  };

  const handleDelete = async (phaseId: string) => {
    if (!window.confirm('Supprimer cette phase ?')) return;
    try {
      await apiServices.projectPhases.remove(phaseId);
      await onRefresh();
    } catch {
      setError('Suppression impossible.');
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-headline font-bold text-lg text-primary">
          Phases du chantier
        </h3>
      </div>

      {error ? (
        <div className="rounded-xl border border-error/20 bg-error-container/20 px-4 py-2 text-xs text-error">
          {error}
        </div>
      ) : null}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {phases.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 text-center">
            Aucune phase définie pour ce chantier.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {phases.map((phase) => {
              const meta =
                PHASE_STATUS_META[phase.status] ?? PHASE_STATUS_META.a_venir;
              return (
                <li
                  key={phase.id}
                  className="p-5 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-xs font-bold text-slate-400">
                        #{phase.order}
                      </span>
                      <span className="font-semibold text-primary truncate">
                        {phase.name}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                          meta.pill,
                        )}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>
                        {fmtDate(phase.start_date)} → {fmtDate(phase.end_date)}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${phase.progress_percent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Avancement : {phase.progress_percent}%
                    </p>
                  </div>
                  {canEdit ? (
                    <button
                      onClick={() => handleDelete(phase.id)}
                      className="p-2 text-slate-300 hover:text-error hover:bg-error/5 rounded-lg transition-all"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {canEdit ? (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de la nouvelle phase (ex. Fondations)"
            className="flex-1 bg-surface-container-highest/50 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      ) : null}
    </section>
  );
}

function BudgetTab({
  projectId,
  phases,
  budgetLines,
  totals,
  currency,
  canEdit,
  onRefresh,
}: {
  projectId: string;
  phases: ProjectPhase[];
  budgetLines: ProjectBudgetLine[];
  totals: { budget: number; actual: number | null };
  currency: string;
  canEdit: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [category, setCategory] = useState<ProjectBudgetCategory>('materiaux');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [phaseId, setPhaseId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<ProjectBudgetCategory, ProjectBudgetLine[]>();
    for (const line of budgetLines) {
      const list = m.get(line.category) ?? [];
      list.push(line);
      m.set(line.category, list);
    }
    return m;
  }, [budgetLines]);

  const handleAdd = async () => {
    if (!amount) return;
    setSaving(true);
    setError(null);
    try {
      await apiServices.projectBudgetLines.create({
        project: projectId,
        phase: phaseId || null,
        category,
        label: label.trim(),
        budget_amount: amount,
        actual_amount: null,
        notes: '',
      } as never);
      setLabel('');
      setAmount('');
      setPhaseId('');
      await onRefresh();
    } catch {
      setError("Impossible d'ajouter la ligne budgétaire.");
    }
    setSaving(false);
  };

  const handleDelete = async (lineId: string) => {
    if (!window.confirm('Supprimer cette ligne budgétaire ?')) return;
    try {
      await apiServices.projectBudgetLines.remove(lineId);
      await onRefresh();
    } catch {
      setError('Suppression impossible.');
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-primary/5 px-4 py-3 text-xs text-primary flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Les coûts réalisés sur les matériaux seront automatiquement alimentés
          par les mouvements de stock (Section 7). Les autres postes sont
          saisis manuellement.
        </span>
      </div>

      {error ? (
        <div className="rounded-xl border border-error/20 bg-error-container/20 px-4 py-2 text-xs text-error">
          {error}
        </div>
      ) : null}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low/50 text-[10px] uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-5 py-3 font-bold">Poste</th>
              <th className="px-5 py-3 font-bold">Libellé</th>
              <th className="px-5 py-3 font-bold text-right">Budget</th>
              <th className="px-5 py-3 font-bold text-right">Réalisé</th>
              <th className="px-5 py-3 font-bold text-right">Écart</th>
              {canEdit ? <th className="px-5 py-3" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {budgetLines.length === 0 ? (
              <tr>
                <td
                  colSpan={canEdit ? 6 : 5}
                  className="px-5 py-8 text-center text-slate-400"
                >
                  Aucune ligne budgétaire. Ajoutez-en une ci-dessous.
                </td>
              </tr>
            ) : (
              Array.from(grouped.entries()).flatMap(([cat, lines]) => [
                <tr
                  key={`hdr-${cat}`}
                  className="bg-surface-container-low/30"
                >
                  <td
                    colSpan={canEdit ? 6 : 5}
                    className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-primary"
                  >
                    {BUDGET_CATEGORY_LABELS[cat]}
                  </td>
                </tr>,
                ...lines.map((line) => {
                  const b = Number(line.budget_amount) || 0;
                  const a =
                    line.actual_amount === null || line.actual_amount === ''
                      ? null
                      : Number(line.actual_amount);
                  const ecart = a === null ? null : b - a;
                  return (
                    <tr key={line.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 text-slate-400 text-xs">
                        {BUDGET_CATEGORY_LABELS[line.category]}
                      </td>
                      <td className="px-5 py-3 text-primary">
                        {line.label || '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold">
                        {fmtMoney(line.budget_amount, currency)}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-500">
                        {a === null ? '—' : fmtMoney(line.actual_amount, currency)}
                      </td>
                      <td
                        className={cn(
                          'px-5 py-3 text-right font-semibold',
                          ecart === null
                            ? 'text-slate-400'
                            : ecart < 0
                            ? 'text-error'
                            : 'text-emerald-600',
                        )}
                      >
                        {ecart === null ? '—' : fmtMoney(ecart, currency)}
                      </td>
                      {canEdit ? (
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleDelete(line.id)}
                            className="p-1.5 text-slate-300 hover:text-error rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  );
                }),
              ])
            )}
          </tbody>
          {budgetLines.length > 0 ? (
            <tfoot className="bg-surface-container-low/50 font-bold text-primary">
              <tr>
                <td colSpan={2} className="px-5 py-3 text-sm uppercase tracking-widest">
                  Total
                </td>
                <td className="px-5 py-3 text-right">
                  {fmtMoney(totals.budget, currency)}
                </td>
                <td className="px-5 py-3 text-right">
                  {totals.actual === null
                    ? '—'
                    : fmtMoney(totals.actual, currency)}
                </td>
                <td className="px-5 py-3 text-right">
                  {totals.actual === null
                    ? '—'
                    : fmtMoney(totals.budget - totals.actual, currency)}
                </td>
                {canEdit ? <td /> : null}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {canEdit ? (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as ProjectBudgetCategory)
            }
            className="bg-surface-container-highest/50 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            {(
              Object.keys(BUDGET_CATEGORY_LABELS) as ProjectBudgetCategory[]
            ).map((c) => (
              <option key={c} value={c}>
                {BUDGET_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Libellé (ex. Béton C25/30)"
            className="bg-surface-container-highest/50 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none md:col-span-2"
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min="0"
            step="0.01"
            placeholder={`Budget (${currency})`}
            className="bg-surface-container-highest/50 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
          />
          <div className="flex items-center gap-2">
            <select
              value={phaseId}
              onChange={(e) => setPhaseId(e.target.value)}
              className="flex-1 bg-surface-container-highest/50 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">Phase…</option>
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={saving || !amount}
              className="px-3 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StockTab({
  projectId,
  movements,
  assignments,
  currency,
}: {
  projectId: string;
  movements: StockMovement[];
  assignments: ItemProjectAssignment[];
  currency: string;
}) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-headline font-bold text-lg text-primary">
          Articles affectés
        </h3>
        <Link
          to={`/inventory/new-movement?project=${projectId}`}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          Nouveau mouvement
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {assignments.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 text-center">
            Aucun article affecté à ce chantier.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {assignments.map((a) => (
              <li key={a.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-primary text-sm">
                    {a.project_name ?? a.project}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.notes || `Assigné le ${fmtDate(a.assigned_at)}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="font-headline font-bold text-primary mb-3 mt-4">
          Derniers mouvements
        </h4>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {movements.length === 0 ? (
            <p className="p-6 text-sm text-slate-400 text-center">
              Aucun mouvement enregistré pour ce chantier.
            </p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-surface-container-low/50 text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Réf.</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Article</th>
                  <th className="px-5 py-3 text-right">Quantité</th>
                  <th className="px-5 py-3 text-right">Coût</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-slate-50/50 cursor-pointer"
                    onClick={() => (window.location.href = `/movements/${m.id}`)}
                  >
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {fmtDate(m.created_at)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {m.reference_number || '—'}
                    </td>
                    <td className="px-5 py-3 text-xs">{m.movement_type}</td>
                    <td className="px-5 py-3 text-primary">
                      {m.item_name ?? m.item}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">
                      {m.quantity}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500">
                      {fmtMoney(m.total_cost, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}

function ResourcesTab({ resources }: { resources: ProjectResource[] }) {
  return (
    <section className="space-y-4">
      <h3 className="font-headline font-bold text-lg text-primary">
        Ressources affectées
      </h3>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {resources.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 text-center">
            Aucune ressource affectée.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {resources.map((r) => (
              <li key={r.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/5">
                    {r.resource_kind === 'subcontract' ? (
                      <HardHat className="w-4 h-4 text-primary" />
                    ) : (
                      <Package className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-primary text-sm">
                      {r.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.resource_kind === 'subcontract'
                        ? 'Sous-traitance'
                        : 'Matériel'}
                      {r.status_label ? ` · ${r.status_label}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs">
                  {r.availability_date ? (
                    <p className="font-semibold text-primary">
                      Dispo {fmtDate(r.availability_date)}
                    </p>
                  ) : null}
                  {r.headcount ? (
                    <p className="text-slate-500">{r.headcount} pers.</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function TeamTab({ project }: { project: Project }) {
  return (
    <section className="space-y-4">
      <h3 className="font-headline font-bold text-lg text-primary">
        Équipe du chantier
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">
            Chef de chantier
          </p>
          <p className="text-base font-semibold text-primary">
            {project.manager_name ?? '—'}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">
            Conducteur de travaux
          </p>
          <p className="text-base font-semibold text-primary">
            {project.works_supervisor_name ?? '—'}
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-400">
        Pour modifier l'équipe ou les utilisateurs ayant accès à ce chantier,
        rendez-vous dans la page Utilisateurs.
      </p>
    </section>
  );
}
