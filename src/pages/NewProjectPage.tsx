import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  Info,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowRight,
  ChevronDown,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiServices } from '@/lib/api';
import type {
  Agency,
  CreateInput,
  DjangoUser,
  Project,
  ProjectCriticality,
  ProjectPriority,
  ProjectStatus,
  ProjectTrackingMode,
  ProjectType,
} from '@/types/api';
import { isPaginatedResponse } from '@/types/common';
import { useCurrentUser } from '@/context/CurrentUserContext';

type FormData = {
  name: string;
  reference: string;
  project_type: ProjectType;
  client_name: string;
  description: string;
  address: string;
  city: string;
  agency: string;
  manager: string;
  works_supervisor: string;
  start_date: string;
  end_date: string;
  priority: ProjectPriority;
  criticality: ProjectCriticality;
  budget_amount: string;
  contract_value: string;
  currency: string;
  surface_m2: string;
  tracking_mode: ProjectTrackingMode;
  auto_alerts_enabled: boolean;
  movement_slips_enabled: boolean;
  ai_assistance_enabled: boolean;
  rfid_sync_enabled: boolean;
  saveAs: 'planification' | 'brouillon';
};

const STEPS = [
  { id: 1, label: 'Informations générales' },
  { id: 2, label: 'Équipe & Planning' },
  { id: 3, label: 'Budget' },
  { id: 4, label: 'Options' },
] as const;

export default function NewProjectPage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [users, setUsers] = useState<DjangoUser[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    reference: '',
    project_type: 'residentiel_collectif',
    client_name: '',
    description: '',
    address: '',
    city: '',
    agency: '',
    manager: '',
    works_supervisor: '',
    start_date: '',
    end_date: '',
    priority: 'haute',
    criticality: 'standard',
    budget_amount: '',
    contract_value: '',
    currency: 'XOF',
    surface_m2: '',
    tracking_mode: 'progress',
    auto_alerts_enabled: true,
    movement_slips_enabled: true,
    ai_assistance_enabled: true,
    rfid_sync_enabled: false,
    saveAs: 'planification',
  });

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      apiServices.agencies.list(),
      apiServices.users.rawList({ page_size: 200 }),
    ]).then(([ag, us]) => {
      if (cancelled) return;
      if (ag.status === 'fulfilled') {
        setAgencies(ag.value);
      }
      if (us.status === 'fulfilled') {
        const list = isPaginatedResponse(us.value)
          ? us.value.results
          : us.value;
        setUsers(list);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const userLabel = (u: DjangoUser): string => {
    const full = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
    return full || u.username || u.email || `#${u.id}`;
  };

  const usersSorted = useMemo(
    () =>
      [...users].sort((a, b) => userLabel(a).localeCompare(userLabel(b), 'fr')),
    [users],
  );

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!formData.name.trim()) return 'Le nom du chantier est requis.';
      if (!formData.reference.trim())
        return 'La référence du chantier est requise.';
    }
    if (s === 3) {
      if (formData.contract_value && Number(formData.contract_value) < 0)
        return 'La valeur du marché doit être positive.';
      if (formData.budget_amount && Number(formData.budget_amount) < 0)
        return 'Le budget doit être positif.';
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setSubmitError(err);
      return;
    }
    setSubmitError(null);
    setStep((s) => Math.min(STEPS.length, s + 1));
  };

  const goPrev = () => {
    setSubmitError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async (
    e: React.FormEvent,
    saveAs: ProjectStatus = 'planification',
  ) => {
    e.preventDefault();
    for (let s = 1; s <= 3; s++) {
      const err = validateStep(s);
      if (err) {
        setStep(s);
        setSubmitError(err);
        return;
      }
    }
    setIsSubmitting(true);
    setSubmitError(null);
    const payload: CreateInput<Project> = {
      name: formData.name.trim(),
      reference: formData.reference.trim(),
      project_type: formData.project_type,
      client_name: formData.client_name.trim(),
      status: saveAs,
      priority: formData.priority,
      description: formData.description.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      agency: formData.agency || null,
      manager: formData.manager ? Number(formData.manager) : null,
      works_supervisor: formData.works_supervisor
        ? Number(formData.works_supervisor)
        : null,
      budget_amount: formData.budget_amount || null,
      contract_value: formData.contract_value || null,
      currency: formData.currency || 'XOF',
      surface_m2: formData.surface_m2 || null,
      max_staff: null,
      criticality: formData.criticality,
      tracking_mode: formData.tracking_mode,
      auto_alerts_enabled: formData.auto_alerts_enabled,
      movement_slips_enabled: formData.movement_slips_enabled,
      rfid_sync_enabled: formData.rfid_sync_enabled,
      ai_assistance_enabled: formData.ai_assistance_enabled,
      is_draft: saveAs === 'brouillon',
      progress_percent: 0,
      notes: '',
    };
    try {
      const created = await apiServices.projects.create(payload);
      navigate(`/projects/${created.id}`);
    } catch (err) {
      console.error('Failed to save project:', err);
      setSubmitError(
        "Impossible de créer le chantier. Vérifiez la référence (unique) et les champs requis.",
      );
      setIsSubmitting(false);
    }
  };

  if (
    user &&
    user.role !== 'administrateur' &&
    user.role !== 'conducteur_travaux'
  ) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-orange-500 mx-auto" />
        <h2 className="font-headline text-2xl font-bold text-primary">
          Accès restreint
        </h2>
        <p className="text-sm text-slate-500">
          Seuls les administrateurs et conducteurs de travaux peuvent créer un
          chantier.
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="mt-4 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold"
        >
          Retour aux chantiers
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-primary tracking-tight font-headline">
            Nouveau Chantier
          </h1>
          <p className="text-on-primary-container max-w-2xl text-sm md:text-base mt-2">
            Créez un nouveau chantier en 4 étapes et définissez ses paramètres
            de suivi.
          </p>
        </div>
        <button
          onClick={() => navigate('/projects')}
          className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-all text-sm"
        >
          Annuler
        </button>
      </div>

      {/* Stepper */}
      <div className="mb-10 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between">
          {STEPS.map((s, idx) => {
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all',
                      isDone
                        ? 'bg-primary text-white border-primary'
                        : isActive
                        ? 'bg-primary/10 text-primary border-primary'
                        : 'bg-slate-50 text-slate-400 border-slate-200',
                    )}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <div className="hidden md:block">
                    <p
                      className={cn(
                        'text-xs font-bold uppercase tracking-widest',
                        isActive || isDone ? 'text-primary' : 'text-slate-400',
                      )}
                    >
                      Étape {s.id}
                    </p>
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        isActive || isDone ? 'text-primary' : 'text-slate-500',
                      )}
                    >
                      {s.label}
                    </p>
                  </div>
                </div>
                {idx < STEPS.length - 1 ? (
                  <div
                    className={cn(
                      'flex-1 h-px mx-4',
                      step > s.id ? 'bg-primary' : 'bg-slate-200',
                    )}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {submitError ? (
        <div className="mb-6 rounded-xl border border-error/20 bg-error-container/20 px-4 py-3 text-sm text-error flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {submitError}
        </div>
      ) : null}

      <form
        onSubmit={(e) => handleSubmit(e, formData.saveAs)}
        className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-8"
      >
        {/* Étape 1 — Informations générales */}
        {step === 1 ? (
          <>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-6 bg-primary rounded-full"></span>
              <h2 className="text-xl font-bold text-primary font-headline">
                Informations générales
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Nom du chantier *
                </label>
                <input
                  className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary focus:ring-2 focus:ring-primary outline-none"
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Résidence Les Alizés"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Référence *
                </label>
                <input
                  className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary focus:ring-2 focus:ring-primary outline-none"
                  type="text"
                  value={formData.reference}
                  onChange={(e) => updateField('reference', e.target.value)}
                  placeholder="REF-2026-001"
                />
                <p className="text-[10px] mt-1 text-slate-400 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  La référence doit être unique.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Type de chantier *
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary focus:ring-2 focus:ring-primary outline-none appearance-none"
                    value={formData.project_type}
                    onChange={(e) =>
                      updateField('project_type', e.target.value as ProjectType)
                    }
                  >
                    <option value="residentiel_collectif">
                      Résidentiel Collectif
                    </option>
                    <option value="tertiaire">Tertiaire / Bureaux</option>
                    <option value="infrastructure_publique">
                      Infrastructure Publique
                    </option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Client / Maître d'ouvrage
                </label>
                <input
                  className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary focus:ring-2 focus:ring-primary outline-none"
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => updateField('client_name', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Ville
                </label>
                <input
                  className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary focus:ring-2 focus:ring-primary outline-none"
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="Cotonou"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Adresse du site
                </label>
                <input
                  className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary focus:ring-2 focus:ring-primary outline-none"
                  type="text"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Agence
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary focus:ring-2 focus:ring-primary outline-none appearance-none"
                    value={formData.agency}
                    onChange={(e) => updateField('agency', e.target.value)}
                  >
                    <option value="">— Aucune —</option>
                    {agencies.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary focus:ring-2 focus:ring-primary outline-none resize-none"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Détails techniques, contraintes spécifiques…"
                />
              </div>
            </div>
          </>
        ) : null}

        {/* Étape 2 — Équipe & Planning */}
        {step === 2 ? (
          <>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-6 bg-primary rounded-full"></span>
              <h2 className="text-xl font-bold text-primary font-headline">
                Équipe & Planning
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Chef de chantier
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary focus:ring-2 focus:ring-primary outline-none appearance-none"
                    value={formData.manager}
                    onChange={(e) => updateField('manager', e.target.value)}
                  >
                    <option value="">— Aucun —</option>
                    {usersSorted.map((u) => (
                      <option key={u.id} value={u.id}>
                        {userLabel(u)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Conducteur de travaux
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary focus:ring-2 focus:ring-primary outline-none appearance-none"
                    value={formData.works_supervisor}
                    onChange={(e) =>
                      updateField('works_supervisor', e.target.value)
                    }
                  >
                    <option value="">— Aucun —</option>
                    {usersSorted.map((u) => (
                      <option key={u.id} value={u.id}>
                        {userLabel(u)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Date de début
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary focus:ring-2 focus:ring-primary outline-none"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => updateField('start_date', e.target.value)}
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Date de fin prévisionnelle
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary focus:ring-2 focus:ring-primary outline-none"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => updateField('end_date', e.target.value)}
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Priorité *
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary focus:ring-2 focus:ring-primary outline-none appearance-none"
                    value={formData.priority}
                    onChange={(e) =>
                      updateField('priority', e.target.value as ProjectPriority)
                    }
                  >
                    <option value="haute">Haute</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="basse">Basse</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Criticité *
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary focus:ring-2 focus:ring-primary outline-none appearance-none"
                    value={formData.criticality}
                    onChange={(e) =>
                      updateField(
                        'criticality',
                        e.target.value as ProjectCriticality,
                      )
                    }
                  >
                    <option value="standard">Standard</option>
                    <option value="sensible">Sensible</option>
                    <option value="critique">Critique</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </>
        ) : null}

        {/* Étape 3 — Budget */}
        {step === 3 ? (
          <>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-6 bg-primary rounded-full"></span>
              <h2 className="text-xl font-bold text-primary font-headline">
                Cadrage budgétaire
              </h2>
            </div>
            <div className="rounded-xl bg-primary/5 px-4 py-3 text-xs text-primary flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Les lignes budgétaires détaillées (matériaux, MO, sous-traitance,
                etc.) pourront être ajoutées depuis la page du chantier, dans
                l'onglet « Budget ».
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Budget global prévisionnel
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary font-bold focus:ring-2 focus:ring-primary outline-none"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.budget_amount}
                    onChange={(e) =>
                      updateField('budget_amount', e.target.value)
                    }
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    {formData.currency}
                  </span>
                </div>
                {!formData.budget_amount ? (
                  <p className="text-[10px] mt-1 text-orange-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Aucun budget renseigné : impossible de suivre l'écart
                    budget/réalisé.
                  </p>
                ) : null}
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Valeur du marché / contrat
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary focus:ring-2 focus:ring-primary outline-none"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.contract_value}
                    onChange={(e) =>
                      updateField('contract_value', e.target.value)
                    }
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    {formData.currency}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Devise *
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary focus:ring-2 focus:ring-primary outline-none appearance-none"
                    value={formData.currency}
                    onChange={(e) => updateField('currency', e.target.value)}
                  >
                    <option value="XOF">XOF — Franc CFA (BCEAO)</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="USD">USD — Dollar US</option>
                    <option value="CNY">CNY — Yuan</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  Surface (m²)
                </label>
                <input
                  className="w-full bg-surface-container-highest/50 rounded-xl p-3.5 text-primary focus:ring-2 focus:ring-primary outline-none"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.surface_m2}
                  onChange={(e) => updateField('surface_m2', e.target.value)}
                />
              </div>
            </div>
          </>
        ) : null}

        {/* Étape 4 — Options */}
        {step === 4 ? (
          <>
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-6 bg-primary rounded-full"></span>
              <h2 className="text-xl font-bold text-primary font-headline">
                Paramètres de suivi
              </h2>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                Mode de suivi analytique
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateField('tracking_mode', 'progress')}
                  className={cn(
                    'p-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all',
                    formData.tracking_mode === 'progress'
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-surface-container-highest/50 text-slate-600 hover:bg-surface-container-highest',
                  )}
                >
                  <TrendingUp className="w-4 h-4" />
                  Avancement %
                </button>
                <button
                  type="button"
                  onClick={() => updateField('tracking_mode', 'hours')}
                  className={cn(
                    'p-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all',
                    formData.tracking_mode === 'hours'
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-surface-container-highest/50 text-slate-600 hover:bg-surface-container-highest',
                  )}
                >
                  <Clock className="w-4 h-4" />
                  Heures réelles
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                [
                  {
                    key: 'auto_alerts_enabled',
                    title: 'Alertes automatiques',
                    desc: 'Notifications pour retards et dépassements budget.',
                  },
                  {
                    key: 'movement_slips_enabled',
                    title: 'Bons de mouvement',
                    desc: 'Générer un bordereau pour chaque entrée/sortie.',
                  },
                  {
                    key: 'ai_assistance_enabled',
                    title: 'Assistance IA',
                    desc: 'Prédictions et suggestions basées sur l\'historique.',
                  },
                  {
                    key: 'rfid_sync_enabled',
                    title: 'Suivi RFID',
                    desc: 'Synchronisation des balises actives sur site.',
                  },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-surface-container-low/50 transition-all cursor-pointer"
                >
                  <input
                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary mt-0.5"
                    type="checkbox"
                    checked={formData[opt.key]}
                    onChange={(e) => updateField(opt.key, e.target.checked)}
                  />
                  <div>
                    <div className="font-bold text-primary text-sm">
                      {opt.title}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-6">
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                Enregistrement
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateField('saveAs', 'brouillon')}
                  className={cn(
                    'p-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border-2 transition-all',
                    formData.saveAs === 'brouillon'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-500',
                  )}
                >
                  Enregistrer en brouillon
                </button>
                <button
                  type="button"
                  onClick={() => updateField('saveAs', 'planification')}
                  className={cn(
                    'p-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border-2 transition-all',
                    formData.saveAs === 'planification'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-500',
                  )}
                >
                  Publier (En planification)
                </button>
              </div>
            </div>

            {/* Résumé */}
            <div className="bg-surface-container-low/50 p-5 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 mb-3 text-primary">
                <ClipboardCheck className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Résumé
                </span>
              </div>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Nom</dt>
                  <dd className="font-semibold text-primary text-right">
                    {formData.name || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Référence</dt>
                  <dd className="font-semibold text-primary text-right">
                    {formData.reference || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Budget</dt>
                  <dd className="font-semibold text-primary text-right">
                    {formData.budget_amount
                      ? `${Number(formData.budget_amount).toLocaleString(
                          'fr-FR',
                        )} ${formData.currency}`
                      : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Période</dt>
                  <dd className="font-semibold text-primary text-right">
                    {(formData.start_date || '—') +
                      ' → ' +
                      (formData.end_date || '—')}
                  </dd>
                </div>
              </dl>
            </div>
          </>
        ) : null}

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={goPrev}
            disabled={step === 1}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </button>
          {step < STEPS.length ? (
            <button
              type="button"
              onClick={goNext}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-md flex items-center gap-2"
            >
              Suivant
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                'Création…'
              ) : (
                <>
                  Créer le chantier
                  {formData.saveAs === 'brouillon' ? (
                    <span className="text-[10px] font-medium opacity-75">
                      (brouillon)
                    </span>
                  ) : null}
                  <Rocket className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
