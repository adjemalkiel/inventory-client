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
  Download,
  HardHat,
  LayoutDashboard,
  MapPin,
  Minus,
  Package,
  Pause,
  Pencil,
  Play,
  Plus,
  Save,
  Trash2,
  TrendingUp,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiServices } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { isPaginatedResponse } from '@/types/common';
import { useCurrentUser } from '@/context/CurrentUserContext';
import type {
  ItemProjectAssignment,
  Project,
  ProjectBudgetCategory,
  ProjectBudgetLine,
  ProjectCostBreakdown,
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
  { id: 'couts', label: 'Coûts', icon: TrendingUp },
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
  const [costBreakdown, setCostBreakdown] = useState<ProjectCostBreakdown | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [budgetLines, setBudgetLines] = useState<ProjectBudgetLine[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [assignments, setAssignments] = useState<ItemProjectAssignment[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Step 8 — Inline edit state
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);

  const handleStartEdit = (section: string, initial: Record<string, string>) => {
    if (editingSection) setEditingSection(null);
    setTimeout(() => {
      setEditingSection(section);
      setEditValues(initial);
    }, 0);
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditValues({});
  };

  const handleSaveSection = async (section: string) => {
    if (!project) return;
    setEditSaving(true);
    setActionError(null);
    try {
      const patchData: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(editValues)) {
        if (v !== '') patchData[k] = v;
      }
      if (Object.keys(patchData).length === 0) {
        setEditingSection(null);
        return;
      }
      const updated = await apiServices.projects.patch(project.id, patchData);
      setProject(updated);
      setEditingSection(null);
      setEditValues({});
    } catch {
      setActionError("Impossible d'enregistrer les modifications.");
    }
    setEditSaving(false);
  };

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const [proj, sum, cb, ph, bl, mvs, res, asg] = await Promise.all([
        apiServices.projects.get(id),
        apiServices.projects.summary(id).catch(() => null),
        apiServices.projects.costBreakdown(id).catch(() => null),
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
      setCostBreakdown(cb);
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

          {actionError ? (
            <div className="rounded-xl border border-error/20 bg-error-container/20 px-4 py-2 text-xs text-error">
              {actionError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Section 1 — Informations générales */}
              <SectionCard
                title="Informations générales"
                editing={editingSection === 'general'}
                onEdit={() =>
                  handleStartEdit('general', {
                    name: project.name,
                    reference: project.reference,
                    project_type: project.project_type,
                    client_name: project.client_name || '',
                    address: project.address || '',
                    description: project.description || '',
                  })
                }
                onSave={() => handleSaveSection('general')}
                onCancel={handleCancelEdit}
                saving={editSaving}
                canEdit={canEdit}
              >
                {editingSection === 'general' ? (
                  <InlineEditForm>
                    <InlineField label="Nom">
                      <input
                        value={editValues.name || ''}
                        onChange={(e) =>
                          setEditValues({ ...editValues, name: e.target.value })
                        }
                      />
                    </InlineField>
                    <InlineField label="Référence">
                      <input
                        value={editValues.reference || ''}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            reference: e.target.value,
                          })
                        }
                      />
                    </InlineField>
                    <InlineField label="Type">
                      <select
                        value={editValues.project_type || ''}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            project_type: e.target.value,
                          })
                        }
                      >
                        <option value="residentiel_collectif">
                          Résidentiel Collectif
                        </option>
                        <option value="tertiaire">Tertiaire / Bureaux</option>
                        <option value="infrastructure_publique">
                          Infrastructure publique
                        </option>
                      </select>
                    </InlineField>
                    <InlineField label="Client">
                      <input
                        value={editValues.client_name || ''}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            client_name: e.target.value,
                          })
                        }
                      />
                    </InlineField>
                    <InlineField label="Adresse">
                      <input
                        value={editValues.address || ''}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            address: e.target.value,
                          })
                        }
                      />
                    </InlineField>
                    <InlineField label="Description" fullWidth>
                      <textarea
                        value={editValues.description || ''}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                      />
                    </InlineField>
                  </InlineEditForm>
                ) : (
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                    <Info label="Nom" value={project.name} />
                    <Info label="Référence" value={project.reference} />
                    <Info
                      label="Type"
                      value={
                        project.project_type === 'residentiel_collectif'
                          ? 'Résidentiel Collectif'
                          : project.project_type === 'tertiaire'
                            ? 'Tertiaire / Bureaux'
                            : project.project_type === 'infrastructure_publique'
                              ? 'Infrastructure publique'
                              : project.project_type
                      }
                    />
                    <Info
                      label="Client"
                      value={project.client_name || '—'}
                    />
                    <Info
                      label="Adresse"
                      value={project.address || '—'}
                    />
                    {project.description ? (
                      <div className="md:col-span-2 mt-2 pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">
                          Description
                        </p>
                        <p className="text-sm text-slate-600 whitespace-pre-line">
                          {project.description}
                        </p>
                      </div>
                    ) : null}
                  </dl>
                )}
              </SectionCard>

              {/* Section 2 — Planning & Équipe */}
              <SectionCard
                title="Planning & Équipe"
                editing={editingSection === 'planning'}
                onEdit={() =>
                  handleStartEdit('planning', {
                    start_date: project.start_date || '',
                    end_date: project.end_date || '',
                    manager_name: project.manager_name || '',
                    works_supervisor_name:
                      project.works_supervisor_name || '',
                    priority: project.priority || '',
                    criticality: project.criticality || '',
                  })
                }
                onSave={() => handleSaveSection('planning')}
                onCancel={handleCancelEdit}
                saving={editSaving}
                canEdit={canEdit}
              >
                {editingSection === 'planning' ? (
                  <InlineEditForm>
                    <InlineField label="Date début">
                      <input
                        type="date"
                        value={editValues.start_date || ''}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            start_date: e.target.value,
                          })
                        }
                      />
                    </InlineField>
                    <InlineField label="Date fin">
                      <input
                        type="date"
                        value={editValues.end_date || ''}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            end_date: e.target.value,
                          })
                        }
                      />
                    </InlineField>
                    <InlineField label="Priorité">
                      <select
                        value={editValues.priority || ''}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            priority: e.target.value,
                          })
                        }
                      >
                        <option value="">—</option>
                        <option value="haute">Haute</option>
                        <option value="moyenne">Moyenne</option>
                        <option value="basse">Basse</option>
                      </select>
                    </InlineField>
                    <InlineField label="Criticité">
                      <select
                        value={editValues.criticality || ''}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            criticality: e.target.value,
                          })
                        }
                      >
                        <option value="">—</option>
                        <option value="standard">Standard</option>
                        <option value="sensible">Sensible</option>
                        <option value="critique">Critique</option>
                      </select>
                    </InlineField>
                  </InlineEditForm>
                ) : (
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                    <Info
                      label="Période"
                      value={`${fmtDate(project.start_date)} → ${fmtDate(project.end_date)}`}
                    />
                    <Info
                      label="Chef de chantier"
                      value={project.manager_name ?? '—'}
                    />
                    <Info
                      label="Conducteur"
                      value={project.works_supervisor_name ?? '—'}
                    />
                    <Info label="Priorité" value={project.priority} />
                    <Info label="Criticité" value={project.criticality} />
                  </dl>
                )}
              </SectionCard>

              {/* Section 3 — Budget & Contrat */}
              <SectionCard
                title="Budget & Contrat"
                editing={editingSection === 'budget'}
                onEdit={() =>
                  handleStartEdit('budget', {
                    budget_amount: project.budget_amount || '',
                    contract_value: project.contract_value || '',
                    surface_m2: project.surface_m2 || '',
                    currency: project.currency || '',
                  })
                }
                onSave={() => handleSaveSection('budget')}
                onCancel={handleCancelEdit}
                saving={editSaving}
                canEdit={canEdit}
              >
                {editingSection === 'budget' ? (
                  <InlineEditForm>
                    <InlineField label="Budget global (FCFA)">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editValues.budget_amount || ''}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            budget_amount: e.target.value,
                          })
                        }
                      />
                    </InlineField>
                    <InlineField label="Valeur du marché (FCFA)">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editValues.contract_value || ''}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            contract_value: e.target.value,
                          })
                        }
                      />
                    </InlineField>
                    <InlineField label="Surface (m²)">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editValues.surface_m2 || ''}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            surface_m2: e.target.value,
                          })
                        }
                      />
                    </InlineField>
                    <InlineField label="Devise">
                      <input
                        value={editValues.currency || ''}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            currency: e.target.value,
                          })
                        }
                      />
                    </InlineField>
                  </InlineEditForm>
                ) : (
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                    <Info
                      label="Budget global"
                      value={fmtMoney(project.budget_amount, currency)}
                    />
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
                    <Info label="Devise" value={project.currency} />
                  </dl>
                )}
              </SectionCard>
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

      {/* Onglet Coûts */}
      {activeTab === 'couts' ? (
        <CoutsTab costBreakdown={costBreakdown} currency={currency} projectId={project.id} />
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
        <ResourcesTab
          projectId={project.id}
          resources={resources}
          canEdit={canEdit}
          onRefresh={refresh}
        />
      ) : null}

      {/* Onglet 6 — Équipe */}
      {activeTab === 'team' ? (
        <TeamTab project={project} canEdit={canEdit} onRefresh={refresh} />
      ) : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  subValue,
  valueClassName,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  subValue?: string;
  valueClassName?: string;
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
      <p
        className={cn(
          'text-2xl font-headline font-extrabold',
          valueClassName || 'text-primary',
        )}
      >
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

/* ── Inline Edit Helpers (Step 8) ── */

function SectionCard({
  title,
  editing,
  onEdit,
  onSave,
  onCancel,
  saving,
  canEdit,
  children,
}: {
  title: string;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  canEdit: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-headline font-bold text-primary">{title}</h3>
        {canEdit ? (
          editing ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                Enregistrer
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <X className="w-3.5 h-3.5" />
                Annuler
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:text-primary hover:border-primary transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Modifier
            </button>
          )
        ) : null}
      </div>
      {children}
    </div>
  );
}

function InlineEditForm({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

function InlineField({
  label,
  children,
  fullWidth,
}: {
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ── Toast Helper ── */

function Toast({
  message,
  onDismiss,
  action,
  actionLabel,
}: {
  message: string;
  onDismiss: () => void;
  action?: () => void;
  actionLabel?: string;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-3 animate-slide-up">
      <span>{message}</span>
      {action ? (
        <button
          type="button"
          onClick={action}
          className="underline text-xs font-bold"
        >
          {actionLabel || 'OK'}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onDismiss}
        className="ml-1 text-white/60 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
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
  const { user } = useCurrentUser();
  const canEditPhase =
    canEdit || user?.role === 'chef_chantier';
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Modal state
  const [editingPhase, setEditingPhase] = useState<ProjectPhase | null>(null);
  const [modalValues, setModalValues] = useState<Record<string, string>>({});
  const [modalSaving, setModalSaving] = useState(false);

  const openModal = (phase: ProjectPhase) => {
    setEditingPhase(phase);
    setModalValues({
      name: phase.name,
      status: phase.status,
      start_date: phase.start_date || '',
      end_date: phase.end_date || '',
      progress_percent: String(phase.progress_percent),
      budget_amount: phase.budget_amount || '',
      description: phase.description || '',
    });
  };

  const closeModal = () => {
    setEditingPhase(null);
    setModalValues({});
  };

  const handleQuickProgress = async (phase: ProjectPhase, delta: number | 'max') => {
    setError(null);
    try {
      let newPct: number;
      let newStatus: string | undefined;
      if (delta === 'max') {
        newPct = 100;
        newStatus = 'termine';
      } else {
        newPct = Math.max(0, Math.min(100, phase.progress_percent + delta));
        if (newPct === 100) newStatus = 'termine';
      }
      await apiServices.projectPhases.patch(phase.id, {
        progress_percent: newPct,
        ...(newStatus ? { status: newStatus } : {}),
      });
      await onRefresh();
    } catch {
      setError("Impossible de mettre à jour l'avancement.");
    }
  };

  const handleSaveModal = async () => {
    if (!editingPhase) return;
    setModalSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(modalValues)) {
        if (v === '') payload[k] = null;
        else if (k === 'progress_percent') payload[k] = Number(v);
        else payload[k] = v;
      }
      await apiServices.projectPhases.patch(editingPhase.id, payload);
      closeModal();
      await onRefresh();
    } catch {
      setError("Impossible d'enregistrer la phase.");
    }
    setModalSaving(false);
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

  // Check if all phases complete for toast
  useEffect(() => {
    if (phases.length > 0 && phases.every((p) => p.status === 'termine')) {
      setToast(
        "Toutes les phases sont terminées. Passer le chantier à 'Terminé' ?",
      );
    }
  }, [phases]);

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
                <li key={phase.id} className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
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
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${phase.progress_percent}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Avancement : {phase.progress_percent}%
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {canEdit ? (
                        <button
                          onClick={() => handleDelete(phase.id)}
                          className="p-1.5 text-slate-300 hover:text-error hover:bg-error/5 rounded-lg transition-all"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : null}
                      <button
                        onClick={() => openModal(phase)}
                        className="p-1.5 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                        title="Détails"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Quick progress buttons */}
                  {canEditPhase ? (
                    <div className="flex items-center gap-1.5 ml-7">
                      <button
                        type="button"
                        onClick={() => handleQuickProgress(phase, -10)}
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        -10
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickProgress(phase, -5)}
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickProgress(phase, 5)}
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickProgress(phase, 10)}
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                      >
                        +10
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickProgress(phase, 'max')}
                        className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3 inline mr-0.5" />
                        100%
                      </button>
                    </div>
                  ) : null}

                  {phase.budget_amount ? (
                    <p className="mt-2 ml-7 text-xs text-slate-500">
                      Budget :{' '}
                      {parseFloat(phase.budget_amount).toLocaleString(
                        'fr-FR',
                      )}{' '}
                      FCFA
                    </p>
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

      {/* Edit Modal */}
      {editingPhase ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-primary">
                Modifier la phase
              </h3>
              <button
                onClick={closeModal}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <InlineEditForm>
              <InlineField label="Nom">
                <input
                  value={modalValues.name || ''}
                  onChange={(e) =>
                    setModalValues({ ...modalValues, name: e.target.value })
                  }
                  className="w-full"
                />
              </InlineField>
              <InlineField label="Statut">
                <select
                  value={modalValues.status || ''}
                  onChange={(e) => {
                    const newVals = { ...modalValues, status: e.target.value };
                    if (e.target.value === 'termine')
                      newVals.progress_percent = '100';
                    setModalValues(newVals);
                  }}
                >
                  <option value="a_venir">À venir</option>
                  <option value="en_cours">En cours</option>
                  <option value="termine">Terminé</option>
                  <option value="en_retard">En retard</option>
                </select>
              </InlineField>
              <div className="grid grid-cols-2 gap-3">
                <InlineField label="Date début">
                  <input
                    type="date"
                    value={modalValues.start_date || ''}
                    onChange={(e) =>
                      setModalValues({
                        ...modalValues,
                        start_date: e.target.value,
                      })
                    }
                  />
                </InlineField>
                <InlineField label="Date fin">
                  <input
                    type="date"
                    value={modalValues.end_date || ''}
                    onChange={(e) =>
                      setModalValues({
                        ...modalValues,
                        end_date: e.target.value,
                      })
                    }
                  />
                </InlineField>
              </div>
              <InlineField label="Avancement (%)">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={modalValues.progress_percent || '0'}
                    onChange={(e) => {
                      const pct = Number(e.target.value);
                      const newVals = {
                        ...modalValues,
                        progress_percent: String(pct),
                      };
                      if (pct === 100) newVals.status = 'termine';
                      setModalValues(newVals);
                    }}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={modalValues.progress_percent || ''}
                    onChange={(e) => {
                      const pct = Number(e.target.value);
                      const newVals = {
                        ...modalValues,
                        progress_percent: e.target.value,
                      };
                      if (pct === 100) newVals.status = 'termine';
                      setModalValues(newVals);
                    }}
                    className="w-16 text-center text-sm"
                  />
                  <span className="text-xs font-bold text-primary">%</span>
                </div>
              </InlineField>
              <InlineField label="Budget (FCFA)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={modalValues.budget_amount || ''}
                  onChange={(e) =>
                    setModalValues({
                      ...modalValues,
                      budget_amount: e.target.value,
                    })
                  }
                />
              </InlineField>
              <InlineField label="Description" fullWidth>
                <textarea
                  value={modalValues.description || ''}
                  onChange={(e) =>
                    setModalValues({
                      ...modalValues,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                />
              </InlineField>
            </InlineEditForm>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={modalSaving}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:opacity-90 disabled:opacity-50"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <Toast message={toast} onDismiss={() => setToast(null)} />
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

/* ── Onglet Coûts (GAP-01) ── */

function CoutsTab({
  costBreakdown,
  currency,
  projectId,
}: {
  costBreakdown: ProjectCostBreakdown | null;
  currency: string;
  projectId: string;
}) {
  if (!costBreakdown) {
    return (
      <section className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center text-sm text-slate-400">
        Chargement des coûts…
      </section>
    );
  }

  const COST_ITEMS: Array<{ key: keyof ProjectCostBreakdown; label: string }> = [
    { key: 'cost_materials', label: 'Matériaux' },
    { key: 'cost_labour', label: "Main d'œuvre" },
    { key: 'cost_subcontracting', label: 'Sous-traitance' },
    { key: 'cost_rental', label: 'Location équipements' },
    { key: 'cost_overhead', label: 'Frais généraux / logistique' },
    { key: 'cost_losses', label: 'Pertes / casses' },
  ];

  const total = parseFloat(costBreakdown.cost_total || '0');
  const budget = parseFloat(costBreakdown.budget_total || '0');
  const margin = costBreakdown.margin !== null ? parseFloat(costBreakdown.margin) : null;
  const marginPct = costBreakdown.margin_percent;
  const progress = costBreakdown.budget_consumed_percent;

  return (
    <section className="space-y-6">
      {/* Export button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={async () => {
            const token = getAccessToken();
            const res = await fetch(`/api/v1/projects/${projectId}/cost-breakdown/export/`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              credentials: 'include',
            });
            if (!res.ok) return;
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cout-chantier-${new Date().toISOString().split('T')[0]}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exporter Excel
        </button>
      </div>

      {/* A — Cartes de synthèse */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Coût total"
          value={fmtMoney(costBreakdown.cost_total, currency)}
          icon={BarChart3}
          subValue={
            progress !== null && progress !== undefined
              ? `${progress}% budget`
              : undefined
          }
        />
        <KpiCard
          label="Budget"
          value={fmtMoney(costBreakdown.budget_total, currency)}
          icon={CreditCard}
        />
        <KpiCard
          label="Marge"
          value={
            costBreakdown.contract_value === null
              ? '—'
              : margin !== null
                ? `${fmtMoney(costBreakdown.margin, currency)}`
                : '—'
          }
          icon={TrendingUp}
          subValue={
            costBreakdown.contract_value === null
              ? undefined
              : marginPct !== null && marginPct !== undefined
                ? `${marginPct}%`
                : undefined
          }
          valueClassName={
            costBreakdown.contract_value === null
              ? ''
              : marginPct !== null && marginPct !== undefined && marginPct >= 0
                ? 'text-emerald-600'
                : 'text-error'
          }
        />
        <KpiCard
          label="Avancement"
          value={
            progress !== null && progress !== undefined
              ? `${progress} %`
              : '—'
          }
          icon={ClipboardCheck}
        />
      </div>

      {/* B — Répartition par poste */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="font-headline font-bold text-primary mb-4">
          Répartition par poste
        </h3>
        {total > 0 ? (
          <div className="space-y-3">
            {COST_ITEMS.map(({ key, label }) => {
              const amount = parseFloat(
                (costBreakdown[key] as string) || '0',
              );
              const pct = total > 0 ? (amount / total) * 100 : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600 w-40 shrink-0 truncate">
                    {label}
                  </span>
                  <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-primary w-28 text-right tabular-nums shrink-0">
                    {amount.toLocaleString('fr-FR')} {currency}
                  </span>
                  <span className="text-[10px] text-slate-400 w-10 text-right shrink-0">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">
            Aucun coût enregistré.
          </p>
        )}
      </div>

      {/* C — Tableau Budget vs Réalisé */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-headline font-bold text-primary">
            Budget vs Réalisé
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low/50 text-[10px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-5 py-3 font-bold">Poste</th>
                <th className="px-5 py-3 font-bold text-right">Budget</th>
                <th className="px-5 py-3 font-bold text-right">Réalisé</th>
                <th className="px-5 py-3 font-bold text-right">Écart</th>
                <th className="px-5 py-3 font-bold text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {costBreakdown.by_category.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-slate-400"
                  >
                    Aucune ligne budgétaire.
                  </td>
                </tr>
              ) : (
                costBreakdown.by_category.map((row) => {
                  const b = parseFloat(row.budget || '0');
                  const a = parseFloat(row.actual || '0');
                  const ecart = a - b;
                  const hasEcart = row.variance !== null && row.variance !== '';
                  return (
                    <tr
                      key={row.category}
                      className={cn(
                        'hover:bg-slate-50/50',
                        row.over_budget
                          ? 'bg-red-50/60'
                          : '',
                      )}
                    >
                      <td className="px-5 py-3">
                        <span className="font-semibold text-primary">
                          {row.label}
                        </span>
                        {row.over_budget ? (
                          <span
                            className="ml-2 text-error text-xs"
                            title="Dépassement budget"
                          >
                            ⚠️
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold">
                        {fmtMoney(row.budget, currency)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {row.auto_actual ? (
                          <span className="inline-flex items-center gap-1">
                            {fmtMoney(row.actual, currency)}
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 uppercase">
                              auto
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            {fmtMoney(row.actual, currency)}
                          </span>
                        )}
                      </td>
                      <td
                        className={cn(
                          'px-5 py-3 text-right font-semibold',
                          !hasEcart
                            ? 'text-slate-400'
                            : ecart <= 0
                              ? 'text-emerald-600'
                              : 'text-error',
                        )}
                      >
                        {!hasEcart
                          ? '—'
                          : fmtMoney(row.variance, currency)}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-slate-500">
                        {row.variance_percent !== null &&
                        row.variance_percent !== undefined
                          ? `${row.variance_percent}%`
                          : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
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

function ResourcesTab({
  projectId,
  resources,
  canEdit,
  onRefresh,
}: {
  projectId: string;
  resources: ProjectResource[];
  canEdit: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingResource, setEditingResource] =
    useState<ProjectResource | null>(null);
  const [drawerValues, setDrawerValues] = useState<Record<string, string>>({});
  const [drawerSaving, setDrawerSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAdd = () => {
    setEditingResource(null);
    setDrawerValues({
      resource_kind: 'equipment',
      name: '',
      availability_date: '',
      headcount: '',
      unit_cost: '',
      cost_unit: 'jour',
      planned_duration: '',
      notes: '',
    });
    setDrawerOpen(true);
  };

  const openEdit = (r: ProjectResource) => {
    setEditingResource(r);
    setDrawerValues({
      resource_kind: r.resource_kind,
      name: r.name,
      availability_date: r.availability_date || '',
      headcount: r.headcount !== null ? String(r.headcount) : '',
      unit_cost: r.unit_cost || '',
      cost_unit: r.cost_unit || 'jour',
      planned_duration:
        r.planned_duration !== null ? String(r.planned_duration) : '',
      notes: r.notes || '',
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingResource(null);
    setDrawerValues({});
    setError(null);
  };

  const estimatedCost = (() => {
    const uc = parseFloat(drawerValues.unit_cost || '0');
    const dur = parseInt(drawerValues.planned_duration || '0', 10);
    if (!uc || isNaN(uc)) return 0;
    if (drawerValues.cost_unit === 'forfait' || !dur) return uc;
    return uc * dur;
  })();

  const handleSaveResource = async () => {
    if (!drawerValues.name.trim()) return;
    setDrawerSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        project: projectId,
        resource_kind: drawerValues.resource_kind,
        name: drawerValues.name.trim(),
        availability_date: drawerValues.availability_date || null,
        headcount:
          drawerValues.headcount !== ''
            ? parseInt(drawerValues.headcount, 10)
            : null,
        unit_cost: drawerValues.unit_cost || null,
        cost_unit: drawerValues.cost_unit || '',
        planned_duration:
          drawerValues.planned_duration !== ''
            ? parseInt(drawerValues.planned_duration, 10)
            : null,
        notes: drawerValues.notes || '',
      };
      if (editingResource) {
        await apiServices.projectResources.patch(
          editingResource.id,
          payload,
        );
      } else {
        await apiServices.projectResources.create(payload as never);
      }
      closeDrawer();
      await onRefresh();
    } catch {
      setError("Impossible d'enregistrer la ressource.");
    }
    setDrawerSaving(false);
  };

  const handleDelete = async (resId: string) => {
    if (!window.confirm('Supprimer cette ressource ?')) return;
    try {
      await apiServices.projectResources.remove(resId);
      await onRefresh();
    } catch {
      setError('Suppression impossible.');
    }
  };

  const grouped = useMemo(() => {
    const m = new Map<string, ProjectResource[]>();
    const order = ['equipment', 'subcontract', 'main_oeuvre'];
    for (const r of resources) {
      const list = m.get(r.resource_kind) ?? [];
      list.push(r);
      m.set(r.resource_kind, list);
    }
    return order.filter((k) => m.has(k)).map((k) => ({ key: k, items: m.get(k)! }));
  }, [resources]);

  const KIND_LABELS: Record<string, string> = {
    equipment: 'Matériel / Équipement',
    subcontract: 'Sous-traitance',
    main_oeuvre: "Main d'œuvre",
  };

  const KIND_ICONS: Record<string, typeof Package> = {
    equipment: Package,
    subcontract: HardHat,
    main_oeuvre: Users,
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-headline font-bold text-lg text-primary">
          Ressources affectées
        </h3>
        {canEdit ? (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-error/20 bg-error-container/20 px-4 py-2 text-xs text-error">
          {error}
        </div>
      ) : null}

      {resources.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center text-sm text-slate-400">
          Aucune ressource affectée.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ key, items }) => {
            const KindIcon = KIND_ICONS[key] ?? Package;
            return (
              <div key={key}>
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
                  {KIND_LABELS[key]} ({items.length})
                </p>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <ul className="divide-y divide-slate-100">
                    {items.map((r) => (
                      <li
                        key={r.id}
                        className="p-4 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-primary/5 shrink-0">
                            <KindIcon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-primary text-sm truncate">
                              {r.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {r.availability_date
                                ? `Dispo: ${fmtDate(r.availability_date)}`
                                : '—'}
                              {r.headcount ? ` · ${r.headcount} pers.` : ''}
                            </p>
                            {r.estimated_cost ? (
                              <p className="text-xs text-slate-500">
                                Coût estimé :{' '}
                                {parseFloat(r.estimated_cost).toLocaleString(
                                  'fr-FR',
                                )}{' '}
                                FCFA
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {canEdit ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openEdit(r)}
                              className="p-1.5 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="p-1.5 text-slate-300 hover:text-error hover:bg-error/5 rounded-lg transition-all"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer */}
      {drawerOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex justify-end"
          onClick={closeDrawer}
        >
          <div
            className="bg-white w-full max-w-md h-full shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-primary">
                  {editingResource
                    ? 'Modifier une ressource'
                    : 'Ajouter une ressource'}
                </h3>
                <button
                  onClick={closeDrawer}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <InlineEditForm>
                <InlineField label="Type de ressource">
                  <div className="flex gap-1">
                    {(['equipment', 'subcontract', 'main_oeuvre'] as const).map(
                      (k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() =>
                            setDrawerValues({
                              ...drawerValues,
                              resource_kind: k,
                            })
                          }
                          className={cn(
                            'flex-1 px-2 py-1.5 rounded-md text-[10px] font-bold transition-colors',
                            drawerValues.resource_kind === k
                              ? 'bg-primary text-white'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                          )}
                        >
                          {KIND_LABELS[k]}
                        </button>
                      ),
                    )}
                  </div>
                </InlineField>

                <InlineField label="Nom *">
                  <input
                    value={drawerValues.name || ''}
                    onChange={(e) =>
                      setDrawerValues({ ...drawerValues, name: e.target.value })
                    }
                    placeholder="Ex: Bétonnière B50"
                  />
                </InlineField>

                <InlineField label="Date de disponibilité">
                  <input
                    type="date"
                    value={drawerValues.availability_date || ''}
                    onChange={(e) =>
                      setDrawerValues({
                        ...drawerValues,
                        availability_date: e.target.value,
                      })
                    }
                  />
                </InlineField>

                <InlineField label="Nombre (unités ou personnes)">
                  <input
                    type="number"
                    min="0"
                    value={drawerValues.headcount || ''}
                    onChange={(e) =>
                      setDrawerValues({
                        ...drawerValues,
                        headcount: e.target.value,
                      })
                    }
                  />
                </InlineField>

                <div className="grid grid-cols-2 gap-3">
                  <InlineField label="Coût unitaire (FCFA)">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={drawerValues.unit_cost || ''}
                      onChange={(e) =>
                        setDrawerValues({
                          ...drawerValues,
                          unit_cost: e.target.value,
                        })
                      }
                    />
                  </InlineField>
                  <InlineField label="Par">
                    <select
                      value={drawerValues.cost_unit || 'jour'}
                      onChange={(e) =>
                        setDrawerValues({
                          ...drawerValues,
                          cost_unit: e.target.value,
                        })
                      }
                    >
                      <option value="jour">Jour</option>
                      <option value="heure">Heure</option>
                      <option value="forfait">Forfait</option>
                    </select>
                  </InlineField>
                </div>

                <InlineField label="Durée planifiée (jours)">
                  <input
                    type="number"
                    min="0"
                    value={drawerValues.planned_duration || ''}
                    onChange={(e) =>
                      setDrawerValues({
                        ...drawerValues,
                        planned_duration: e.target.value,
                      })
                    }
                  />
                </InlineField>

                <div className="flex items-center gap-2 py-2 px-4 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500">
                    Coût estimé total
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {estimatedCost.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <InlineField label="Notes" fullWidth>
                  <textarea
                    value={drawerValues.notes || ''}
                    onChange={(e) =>
                      setDrawerValues({
                        ...drawerValues,
                        notes: e.target.value,
                      })
                    }
                    rows={3}
                  />
                </InlineField>
              </InlineEditForm>

              {error ? (
                <div className="text-xs text-error">{error}</div>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveResource}
                  disabled={drawerSaving || !drawerValues.name.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:opacity-90 disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TeamTab({
  project,
  canEdit,
  onRefresh,
}: {
  project: Project;
  canEdit: boolean;
  onRefresh: () => Promise<void>;
}) {
  const isAdmin = useCurrentUser().user?.role === 'administrateur';
  const [editing, setEditing] = useState(false);
  const [users, setUsers] = useState<Array<{ id: number; full_name: string }>>(
    [],
  );
  const [managerId, setManagerId] = useState(project.manager || '');
  const [supervisorId, setSupervisorId] = useState(
    project.works_supervisor || '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing && users.length === 0) {
      apiServices.userProfiles
        .list({ ordering: 'user__last_name', page_size: 200 })
        .then((data) => {
          const list = Array.isArray(data) ? data : (data as { results: unknown[] }).results;
          setUsers(
            (list as Array<{
              id: number;
              full_name: string;
            }>).map((u) => ({ id: u.id, full_name: u.full_name })),
          );
        })
        .catch(() => setError('Impossible de charger les utilisateurs.'));
    }
  }, [editing, users.length]);

  useEffect(() => {
    setManagerId(project.manager || '');
    setSupervisorId(project.works_supervisor || '');
  }, [project.manager, project.works_supervisor]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiServices.projects.patch(project.id, {
        manager: managerId || null,
        works_supervisor: supervisorId || null,
      });
      setEditing(false);
      await onRefresh();
      // Update project reference
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = updated;
    } catch {
      setError("Impossible d'enregistrer l'équipe.");
    }
    setSaving(false);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-headline font-bold text-lg text-primary">
          Équipe du chantier
        </h3>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:text-primary hover:border-primary transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Modifier l'équipe
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-error/20 bg-error-container/20 px-4 py-2 text-xs text-error">
          {error}
        </div>
      ) : null}

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

      {editing ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setEditing(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-primary">
                Modifier l'équipe
              </h3>
              <button
                onClick={() => setEditing(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <InlineEditForm>
              <InlineField label="Chef de chantier">
                <select
                  value={managerId || ''}
                  onChange={(e) => setManagerId(e.target.value)}
                >
                  <option value="">—</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              </InlineField>
              <InlineField label="Conducteur de travaux">
                <select
                  value={supervisorId || ''}
                  onChange={(e) => setSupervisorId(e.target.value)}
                >
                  <option value="">—</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              </InlineField>
            </InlineEditForm>
            <p className="text-xs text-slate-400">
              ⚠️ Les accès (scope) se gèrent depuis la page Utilisateurs.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:opacity-90 disabled:opacity-50"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
