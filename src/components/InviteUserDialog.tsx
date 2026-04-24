import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Badge,
  BarChart3,
  Check,
  CheckCircle2,
  Construction,
  Eye,
  LayoutGrid,
  Loader2,
  LogIn,
  Mail,
  MapPin,
  Send,
  Settings,
  Shield,
  Sparkles,
  UserPlus,
  Verified,
  Warehouse,
  X,
} from 'lucide-react';

import { apiServices } from '@/lib/api';
import { describeEmailDelivery } from '@/lib/email-delivery';
import { cn } from '@/lib/utils';
import type { DjangoUser, Site, UserProfile, UserProfileRole } from '@/types/api';
import type { UUID } from '@/types/common';

const ROLE_OPTIONS: { value: UserProfileRole; label: string }[] = [
  { value: 'administrateur', label: 'Administrateur' },
  { value: 'magasinier', label: 'Magasinier' },
  { value: 'chef_chantier', label: 'Chef de chantier' },
  { value: 'consultant', label: 'Consultant' },
];

/** Rôle (carte) : libellés alignés sur le gabarit « Direction » = consultant côté API. */
const ROLE_CARDS: {
  value: UserProfileRole;
  label: string;
  description: string;
  cardIcon: LucideIcon;
}[] = [
  {
    value: 'administrateur',
    label: 'Administrateur',
    description: 'Accès complet à la configuration, aux utilisateurs et aux données.',
    cardIcon: Shield,
  },
  {
    value: 'magasinier',
    label: 'Magasinier',
    description: 'Gestion des stocks, mouvements et inventaires.',
    cardIcon: Warehouse,
  },
  {
    value: 'chef_chantier',
    label: 'Chef de chantier',
    description: 'Consultation des affectations, suivi des besoins et alertes chantier.',
    cardIcon: Construction,
  },
  {
    value: 'consultant',
    label: 'Direction',
    description: 'Vue globale, indicateurs, rapports et analyse.',
    cardIcon: BarChart3,
  },
];

type PerimeterMode = 'all' | 'selected' | 'readonly';

type StepOperational = {
  recordMovement: boolean;
  validateMovement: boolean;
  accessSettings: boolean;
};

function defaultOperationalForRole(role: UserProfileRole): StepOperational {
  const admin = role === 'administrateur';
  const mag = role === 'magasinier';
  return {
    recordMovement: true,
    validateMovement: admin || mag,
    accessSettings: admin,
  };
}

function suggestRoleFromFunction(fn: string): UserProfileRole | null {
  const t = fn.toLowerCase();
  if (/magasin|stock|logist|inventaire|manutention/.test(t)) {
    return 'magasinier';
  }
  if (/admin|direction|directeur|dsi|rh|ressources humaines/.test(t)) {
    return 'administrateur';
  }
  if (/chantier|conducteur|travaux|génie/.test(t)) {
    return 'chef_chantier';
  }
  if (/analyste|analyse|financ|comptab|consult|rapport/.test(t)) {
    return 'consultant';
  }
  return null;
}

function OpToggle({
  on,
  onToggle,
  disabled,
}: {
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        on ? 'bg-primary' : 'bg-surface-container-highest',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition duration-200',
          on ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

function resolveInviteSite(mode: PerimeterMode, siteId: '' | UUID): UUID | null {
  if (mode === 'selected' && siteId) {
    return siteId;
  }
  return null;
}

function sitePerimeterSubtitle(mode: PerimeterMode): string {
  if (mode === 'all') {
    return "Accès transversal à l'inventaire de tous les sites";
  }
  if (mode === 'readonly') {
    return 'Consultation des stocks et des mouvements (lecture seule)';
  }
  return "Accès complet à l'inventaire du site";
}

const SERVICE_OPTIONS = [
  { value: 'logistique_chantier', label: 'Logistique chantier' },
  { value: 'administration', label: 'Administration' },
] as const;

const STEPS = [
  { n: 1, label: 'Collaborateur' },
  { n: 2, label: 'Rôle & Accès' },
  { n: 3, label: 'Révision' },
] as const;

type StepIndex = 0 | 1 | 2;

function buildJobTitle(
  functionLabel: string,
  service: (typeof SERVICE_OPTIONS)[number]['value'] | '',
): string {
  const fn = functionLabel.trim();
  const sLabel = SERVICE_OPTIONS.find((o) => o.value === service)?.label;
  if (fn && sLabel) {
    return `${fn} — ${sLabel}`;
  }
  if (fn) {
    return fn;
  }
  if (sLabel) {
    return sLabel;
  }
  return '';
}

type PendingRow = { user: DjangoUser; profile: UserProfile; jobLine: string };

function buildPendingRows(
  users: DjangoUser[],
  profiles: UserProfile[],
  sites: Site[],
): PendingRow[] {
  const siteById = new Map(sites.map((s) => [s.id, s.name]));
  const out: PendingRow[] = [];
  for (const u of users) {
    const p = profiles.find((x) => x.user === u.id);
    if (!p?.invited_at || u.last_login) {
      continue;
    }
    const siteName = p.site ? siteById.get(p.site as UUID) : null;
    const jobLine = [p.job_title, siteName].filter(Boolean).join(' • ') || 'Collaborateur';
    out.push({ user: u, profile: p, jobLine });
  }
  return out;
}

function initialsFor(first: string, last: string, email: string): string {
  const a = first.trim();
  const b = last.trim();
  if (a && b) {
    return (a[0]! + b[0]!).toUpperCase();
  }
  if (a) {
    return a.slice(0, 2).toUpperCase();
  }
  return (email.split('@')[0] || 'U').slice(0, 2).toUpperCase();
}

export type InviteUserDialogProps = {
  /** Appelé lorsque l’utilisateur ferme (croix, Échap, backdrop, bouton Annuler, ou toast « Fermer »). */
  onClose: () => void;
  /**
   * Appelé après un envoi d’invitation réussi. Permet au parent de rafraîchir sa
   * liste des comptes sans dupliquer la logique de chargement dans le dialogue.
   */
  onInvited?: () => void;
};

/**
 * Dialogue d’invitation d’un utilisateur, monté/démonté par le parent.
 *
 * Historiquement hébergé sur `/users/new` (page plein écran rendue en tiroir).
 * Désormais rendu en overlay via `createPortal` pour que le clic « Inviter »
 * de `UsersPage` reste contextuel (pas de navigation, l’URL ne change pas).
 */
export default function InviteUserDialog({ onClose, onInvited }: InviteUserDialogProps) {
  const [step, setStep] = useState<StepIndex>(0);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [functionLabel, setFunctionLabel] = useState('');
  const [service, setService] = useState<'' | (typeof SERVICE_OPTIONS)[number]['value']>('');
  const [formData, setFormData] = useState({
    role: 'magasinier' as UserProfileRole,
    siteId: '' as '' | UUID,
  });
  const [perimeterMode, setPerimeterMode] = useState<PerimeterMode>('all');
  const [operational, setOperational] = useState<StepOperational>(() => defaultOperationalForRole('magasinier'));
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadSitesError, setLoadSitesError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    void apiServices.sites
      .list()
      .then(setSites)
      .catch(() => setLoadSitesError('Impossible de charger la liste des sites.'));
  }, []);

  const loadPending = useCallback(async () => {
    try {
      const [userList, profileList, siteList] = await Promise.all([
        apiServices.users.list(),
        apiServices.userProfiles.list(),
        apiServices.sites.list(),
      ]);
      setPending(buildPendingRows(userList, profileList, siteList));
    } catch {
      setPending([]);
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  useEffect(() => {
    setOperational(defaultOperationalForRole(formData.role));
  }, [formData.role]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleClose]);

  const siteLabelForReview = (() => {
    if (perimeterMode === 'all') {
      return 'Tous les sites';
    }
    if (perimeterMode === 'readonly') {
      return 'Lecture seule (tous sites)';
    }
    return formData.siteId ? (sites.find((s) => s.id === formData.siteId)?.name ?? '—') : '—';
  })();

  const canGoNextFromStep0 =
    firstName.trim().length > 0 && lastName.trim().length > 0 && email.trim().length > 0;

  const goNext = () => {
    setSubmitError(null);
    if (step === 0 && !canGoNextFromStep0) {
      setSubmitError('Renseignez le prénom, le nom et l’e-mail professionnel.');
      return;
    }
    if (step === 1 && perimeterMode === 'selected' && !formData.siteId) {
      setSubmitError("Choisissez un site pour le mode « Sites sélectionnés ».");
      return;
    }
    if (step < 2) {
      setStep((s) => (s + 1) as StepIndex);
    }
  };

  const goBack = () => {
    setSubmitError(null);
    if (step > 0) {
      setStep((s) => (s - 1) as StepIndex);
    }
  };

  /** Ne pas brancher l’envoi sur `onSubmit` du form : Enter / soumission implicite pouvait déclencher l’API sans clic sur le bouton. */
  const sendInvitation = async () => {
    if (step !== 2) {
      return;
    }
    setSubmitError(null);
    setLoading(true);
    try {
      const job_title = buildJobTitle(functionLabel, service);
      const res = await apiServices.users.invite({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: formData.role,
        site: resolveInviteSite(perimeterMode, formData.siteId),
        job_title,
        phone: phone.trim() || undefined,
      });
      const delivery = describeEmailDelivery(res.email_delivery);
      if (res.invitation_email_sent === false) {
        window.alert(
          "Compte créé, mais l’e-mail d’invitation n’a pas pu être envoyé.\n\n" +
            (delivery.label ||
              'Vérifiez la configuration SMTP (Paramètres → Intégrations → SMTP).'),
        );
      } else if (!delivery.ok) {
        // Backend a répondu "envoyé" mais via console/dummy : rien n'est parti.
        window.alert(`Compte créé.\n\n${delivery.label}`);
      }
      setShowSuccessToast(true);
      onInvited?.();
      void loadPending();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const d = err.response.data;
        if (typeof d === 'object' && d !== null && 'detail' in d) {
          setSubmitError(String((d as { detail: unknown }).detail));
        } else if (typeof d === 'object' && d !== null) {
          const parts: string[] = [];
          for (const [k, v] of Object.entries(d)) {
            if (Array.isArray(v)) {
              parts.push(`${k}: ${v.join(' ')}`);
            } else if (v && typeof v === 'object') {
              parts.push(`${k}: ${JSON.stringify(v)}`);
            } else {
              parts.push(`${k}: ${String(v)}`);
            }
          }
          setSubmitError(parts.join(' · ') || "Enregistrement impossible.");
        } else {
          setSubmitError(JSON.stringify(d));
        }
      } else {
        setSubmitError("Impossible d'envoyer l'invitation.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || '—';
  const roleLabel = ROLE_OPTIONS.find((r) => r.value === formData.role)?.label ?? formData.role;
  const roleCardLabel = ROLE_CARDS.find((r) => r.value === formData.role)?.label ?? roleLabel;
  const suggestedByFunction = suggestRoleFromFunction(functionLabel);
  const suggestedLabel =
    suggestedByFunction != null
      ? (ROLE_CARDS.find((r) => r.value === suggestedByFunction)?.label ??
        ROLE_OPTIONS.find((r) => r.value === suggestedByFunction)?.label)
      : null;
  const fnDisplay = functionLabel.trim() || '—';
  const functionSnippet =
    fnDisplay.length > 42 ? `${fnDisplay.slice(0, 40)}…` : fnDisplay;
  const serviceLabelDisplay = SERVICE_OPTIONS.find((o) => o.value === service)?.label;
  const roleFunctionHeadline = functionLabel.trim() || roleCardLabel;

  // Portal sur document.body pour éviter tout stacking context imposé par
  // les ancêtres de UsersPage (Layout/Sidebar/etc.).
  return createPortal(
    <div className="fixed inset-0 z-[2300] flex justify-end bg-primary/20 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 w-full h-full cursor-default"
        onClick={handleClose}
      />

      <div
        className={cn(
          'relative w-full max-w-[720px] h-full glass-panel architectural-shadow',
          'flex flex-col border-l border-outline-variant bg-surface',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <form
          className="flex flex-col h-full min-h-0"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div className="px-8 py-6 border-b border-outline-variant shrink-0">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/5 rounded-lg">
                  <UserPlus className="w-5 h-5 text-primary" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-xl font-headline font-extrabold text-primary">Inviter un utilisateur</h2>
                  <p className="text-xs text-on-surface-variant">
                    Ajoutez un collaborateur et définissez son périmètre d’accès.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
                aria-label="Fermer le panneau"
                disabled={loading}
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            <div className="flex items-stretch gap-0">
              {STEPS.map((s, i) => {
                const active = step === i;
                const done = i < step;
                const future = i > step;
                return (
                  <button
                    key={s.n}
                    type="button"
                    onClick={() => {
                      if (i <= step) {
                        setStep(i as StepIndex);
                      }
                    }}
                    className={cn(
                      'flex-1 border-b-4 pb-3 text-left transition-colors',
                      done && 'border-emerald-500',
                      active && 'border-primary',
                      future && 'border-surface-container-high',
                    )}
                    disabled={loading}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {done ? (
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </span>
                      ) : (
                        <span
                          className={cn(
                            'w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0',
                            active ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant',
                          )}
                        >
                          {s.n}
                        </span>
                      )}
                      <span
                        className={cn(
                          'text-xs font-bold uppercase tracking-tight truncate',
                          done && 'text-emerald-600',
                          active && 'text-primary',
                          future && 'text-on-surface-variant',
                        )}
                      >
                        {s.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {loadSitesError && (
            <p className="text-sm text-error bg-error/5 border-b border-error/20 px-8 py-2 shrink-0">
              {loadSitesError}
            </p>
          )}
          {submitError && (
            <p className="text-sm text-error bg-error/5 border-b border-error/20 px-8 py-2 shrink-0">
              {submitError}
            </p>
          )}

          <div className="flex-1 overflow-y-auto p-8 min-h-0">
            <div className={cn('max-w-xl mx-auto', step === 2 ? 'space-y-8' : 'space-y-10')}>
              {step === 0 && (
                <section className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Badge className="w-4 h-4 text-primary/40" strokeWidth={2} />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Informations du collaborateur</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase ml-1">Prénom</label>
                      <input
                        className="w-full bg-surface-container-high/30 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase ml-1">Nom</label>
                      <input
                        className="w-full bg-surface-container-high/30 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase ml-1">
                        Adresse e-mail professionnelle
                      </label>
                      <input
                        className="w-full bg-surface-container-high/30 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase ml-1">
                        Numéro de téléphone
                      </label>
                      <input
                        className="w-full bg-surface-container-high/30 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={loading}
                        placeholder="Optionnel"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase ml-1">Fonction</label>
                      <input
                        className="w-full bg-surface-container-high/30 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                        type="text"
                        value={functionLabel}
                        onChange={(e) => setFunctionLabel(e.target.value)}
                        disabled={loading}
                        placeholder="Ex. Magasinière principale"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <label className="text-[11px] font-bold text-on-surface-variant uppercase ml-1">Service</label>
                      <select
                        className="w-full bg-surface-container-high/30 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                        value={service}
                        onChange={(e) =>
                          setService(e.target.value as '' | (typeof SERVICE_OPTIONS)[number]['value'])
                        }
                        disabled={loading}
                      >
                        <option value="">—</option>
                        {SERVICE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>
              )}

              {step === 0 && (
                <section className="pt-8 border-t border-outline-variant">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[11px] font-bold text-on-surface-variant uppercase">Invitations en attente</h4>
                    {pending.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 bg-primary/5 text-primary rounded font-bold">
                        {pending.length} EN COURS
                      </span>
                    )}
                  </div>
                  {pending.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">Aucune invitation en attente de validation.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {pending.map((p) => (
                        <div
                          key={p.user.id}
                          className="flex items-center justify-between p-3 bg-surface-container-high/20 rounded-xl gap-2"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {initialsFor(p.user.first_name, p.user.last_name, p.user.email)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">
                                {`${p.user.first_name} ${p.user.last_name}`.trim() || p.user.email}
                              </p>
                              <p className="text-[10px] text-on-surface-variant truncate">
                                {p.jobLine} • En attente
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {step === 1 && (
                <div className="space-y-10">
                  <div className="bg-primary/5 border border-primary/10 p-5 rounded-2xl flex gap-4 items-start">
                    <div className="p-2 bg-primary text-white rounded-xl shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-sm font-bold text-primary">Suggestion IA</h4>
                      {suggestedLabel && suggestedByFunction != null ? (
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          Basé sur sa fonction (
                          <strong className="text-primary font-bold">{functionSnippet}</strong>
                          ), nous recommandons le rôle{' '}
                          <strong className="text-primary font-bold">{suggestedLabel}</strong>
                          {fullName !== '—' ? (
                            <>
                              {' '}
                              pour <strong className="text-primary font-bold">{fullName}</strong>.
                            </>
                          ) : (
                            ' pour ce collaborateur.'
                          )}
                          {suggestedByFunction === formData.role ? (
                            <span className="text-on-surface-variant"> (Aligné avec votre sélection actuelle.)</span>
                          ) : null}
                        </p>
                      ) : (
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          Saisissez une fonction plus précise sur l’étape précédente pour obtenir une suggestion de
                          rôle, ou choisissez un rôle ci-dessous.
                        </p>
                      )}
                    </div>
                  </div>

                  <section className="space-y-6">
                    <div className="flex flex-col">
                      <h3 className="text-lg font-headline font-extrabold text-primary">2. Rôle et permissions</h3>
                      <p className="text-xs text-on-surface-variant">
                        Définissez les responsabilités et le niveau d’accès du collaborateur.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-label="Rôle">
                      {ROLE_CARDS.map((r) => {
                        const selected = formData.role === r.value;
                        const Icon = r.cardIcon;
                        return (
                          <label
                            key={r.value}
                            className={cn(
                              'relative flex cursor-pointer rounded-2xl border p-4 transition-all',
                              selected
                                ? 'border-2 border-primary bg-primary/5 ring-1 ring-primary/10'
                                : 'border border-outline-variant hover:bg-surface-container-high/20',
                            )}
                          >
                            <input
                              className="sr-only"
                              name="invite-role"
                              type="radio"
                              checked={selected}
                              onChange={() => setFormData({ ...formData, role: r.value })}
                              disabled={loading}
                            />
                            <div className="flex w-full items-center gap-4 min-w-0">
                              <div
                                className={cn(
                                  'flex h-10 w-10 items-center justify-center rounded-xl shrink-0',
                                  selected ? 'bg-primary text-white' : 'bg-surface-container-high/50 text-on-surface-variant',
                                )}
                              >
                                <Icon className="w-5 h-5" strokeWidth={2} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-primary">{r.label}</p>
                                <p className="text-[11px] text-on-surface-variant leading-snug">{r.description}</p>
                              </div>
                              {selected ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : null}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </section>

                  <section className="pt-8 border-t border-outline-variant space-y-6">
                    <div>
                      <h4 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                        Périmètre d&apos;accès
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPerimeterMode('all');
                            setFormData((d) => ({ ...d, siteId: '' as '' | UUID }));
                          }}
                          className={cn(
                            'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all',
                            perimeterMode === 'all'
                              ? 'border-primary bg-primary/5'
                              : 'border border-outline-variant hover:bg-surface-container-high/30',
                          )}
                          disabled={loading}
                        >
                          <LayoutGrid
                            className={cn('w-6 h-6', perimeterMode === 'all' ? 'text-primary' : 'text-on-surface-variant')}
                            strokeWidth={1.5}
                          />
                          <span
                            className={cn(
                              'text-[11px] font-bold',
                              perimeterMode === 'all' ? 'text-primary' : 'text-on-surface-variant',
                            )}
                          >
                            Tous les sites
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPerimeterMode('selected')}
                          className={cn(
                            'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all',
                            perimeterMode === 'selected'
                              ? 'border-primary bg-primary/5'
                              : 'border border-outline-variant hover:bg-surface-container-high/30',
                          )}
                          disabled={loading}
                        >
                          <MapPin
                            className={cn(
                              'w-6 h-6',
                              perimeterMode === 'selected' ? 'text-primary' : 'text-on-surface-variant',
                            )}
                            strokeWidth={1.5}
                          />
                          <span
                            className={cn(
                              'text-[11px] font-bold text-center',
                              perimeterMode === 'selected' ? 'text-primary' : 'text-on-surface-variant',
                            )}
                          >
                            Sites sélectionnés
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPerimeterMode('readonly');
                            setFormData((d) => ({ ...d, siteId: '' as '' | UUID }));
                          }}
                          className={cn(
                            'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all',
                            perimeterMode === 'readonly'
                              ? 'border-primary bg-primary/5'
                              : 'border border-outline-variant hover:bg-surface-container-high/30',
                          )}
                          disabled={loading}
                        >
                          <Eye
                            className={cn('w-6 h-6', perimeterMode === 'readonly' ? 'text-primary' : 'text-on-surface-variant')}
                            strokeWidth={1.5}
                          />
                          <span
                            className={cn(
                              'text-[11px] font-bold',
                              perimeterMode === 'readonly' ? 'text-primary' : 'text-on-surface-variant',
                            )}
                          >
                            Lecture seule
                          </span>
                        </button>
                      </div>
                    </div>

                    {perimeterMode === 'selected' && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase ml-1">Site de rattachement</label>
                        <select
                          className="w-full bg-surface-container-high/30 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary transition-all"
                          value={formData.siteId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              siteId: (e.target.value || '') as '' | UUID,
                            })
                          }
                          disabled={loading}
                        >
                          <option value="">Sélectionner un site</option>
                          {sites.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="space-y-4">
                      <h4 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
                        Droits opérationnels
                      </h4>
                      <p className="text-[11px] text-on-surface-variant -mt-2">
                        Aperçu de configuration : les paramètres finaux s’appliquent après l’admission du compte.
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-surface-container-high/10 rounded-xl gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <LogIn className="w-5 h-5 text-primary/60 shrink-0" />
                            <span className="text-sm font-medium">Enregistrer un mouvement</span>
                          </div>
                          <OpToggle
                            on={operational.recordMovement}
                            onToggle={() =>
                              setOperational((o) => ({ ...o, recordMovement: !o.recordMovement }))
                            }
                            disabled={loading}
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-surface-container-high/10 rounded-xl gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Verified className="w-5 h-5 text-primary/60 shrink-0" />
                            <span className="text-sm font-medium">Valider un mouvement</span>
                          </div>
                          <OpToggle
                            on={operational.validateMovement}
                            onToggle={() =>
                              setOperational((o) => ({ ...o, validateMovement: !o.validateMovement }))
                            }
                            disabled={loading}
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-surface-container-high/10 rounded-xl gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Settings className="w-5 h-5 text-primary/60 shrink-0" />
                            <span className="text-sm font-medium">Accéder aux paramètres</span>
                          </div>
                          <OpToggle
                            on={operational.accessSettings}
                            onToggle={() =>
                              setOperational((o) => ({ ...o, accessSettings: !o.accessSettings }))
                            }
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10 flex gap-4 items-start">
                    <div className="p-2 bg-primary text-white rounded-xl shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-sm font-bold text-primary">Analyse de cohérence IA terminée</h4>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Toutes les informations sont cohérentes. Le rôle{' '}
                        <strong className="text-primary font-bold">{roleFunctionHeadline}</strong> est aligné avec le
                        périmètre <strong className="text-primary font-bold">{siteLabelForReview}</strong>
                        {serviceLabelDisplay ? (
                          <>
                            {' '}
                            et le service <strong className="text-primary font-bold">{serviceLabelDisplay}</strong>
                          </>
                        ) : null}
                        .
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <Verified className="w-3 h-3" strokeWidth={2} />
                          Prêt pour l&apos;envoi
                        </span>
                      </div>
                    </div>
                  </div>

                  <section className="space-y-6">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Eye className="w-4 h-4 text-primary/40 shrink-0" strokeWidth={2} />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Résumé de l’invitation</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSubmitError(null);
                          setStep(0);
                        }}
                        className="text-[10px] font-bold text-primary hover:underline uppercase shrink-0"
                        disabled={loading}
                      >
                        Modifier
                      </button>
                    </div>

                    <div className="bg-surface-container-high/20 rounded-2xl p-6 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6">
                        <div>
                          <p className="text-[10px] uppercase text-on-surface-variant font-bold mb-1">Collaborateur</p>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                              {initialsFor(firstName, lastName, email)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-primary truncate">{fullName}</p>
                              <p className="text-xs text-on-surface-variant truncate">{email || '—'}</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-on-surface-variant font-bold mb-1">Coordonnées</p>
                          <p className="text-sm font-medium">{phone.trim() || '—'}</p>
                        </div>
                        <div className="sm:col-span-2 border-t border-outline-variant pt-6">
                          <p className="text-[10px] uppercase text-on-surface-variant font-bold mb-1">Rôle &amp; fonction</p>
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-bold text-primary">{roleFunctionHeadline}</p>
                            <p className="text-xs text-on-surface-variant">
                              {serviceLabelDisplay
                                ? `Service : ${serviceLabelDisplay}`
                                : 'Service : non renseigné'}
                            </p>
                          </div>
                        </div>
                        <div className="sm:col-span-2 border-t border-outline-variant pt-6">
                          <p className="text-[10px] uppercase text-on-surface-variant font-bold mb-1">Site &amp; périmètre</p>
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-bold text-primary">{siteLabelForReview}</p>
                            <p className="text-xs text-on-surface-variant">{sitePerimeterSubtitle(perimeterMode)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="pt-6 border-t border-outline-variant flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
                          <span className="text-[10px] font-bold uppercase text-on-surface-variant">
                            Notification d&apos;invitation prête
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="p-5 border border-outline-variant rounded-2xl flex items-start sm:items-center gap-4 bg-surface-container-low">
                    <Mail className="w-5 h-5 text-on-surface-variant shrink-0 mt-0.5 sm:mt-0" strokeWidth={1.5} />
                    <p className="text-xs text-on-surface-variant flex-1 leading-relaxed">
                      {firstName.trim() || 'Le collaborateur'} recevra un e-mail contenant un lien sécurisé pour
                      activer son compte et définir son mot de passe.
                    </p>
                  </section>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-outline-variant bg-surface-container-low flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors order-1 sm:order-none"
              disabled={loading}
            >
              Annuler
            </button>
            <div className="flex flex-wrap items-center justify-end gap-3 order-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-primary border border-primary/20 hover:bg-primary/5 transition-colors"
                  disabled={loading}
                >
                  Précédent
                </button>
              )}
              {step < 2 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-white shadow-lg shadow-primary/20 flex items-center gap-2 hover:opacity-95 transition-opacity"
                >
                  <span>Suivant</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  className="px-8 py-2.5 rounded-xl text-sm font-bold bg-primary text-white shadow-lg shadow-primary/20 flex items-center justify-center gap-2 min-w-[180px] disabled:opacity-60"
                  onClick={() => void sendInvitation()}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  {loading ? (
                    'Envoi…'
                  ) : (
                    <>
                      <span>Envoyer l&apos;invitation</span>
                      <Send className="w-4 h-4" strokeWidth={2} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {showSuccessToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-primary text-white px-6 py-4 rounded-2xl shadow-2xl z-[2310] max-w-[min(100vw-2rem,28rem)]">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">Invitation envoyée avec succès</span>
          <button
            type="button"
            className="ml-2 text-xs font-bold uppercase opacity-80 hover:opacity-100 shrink-0"
            onClick={() => {
              setShowSuccessToast(false);
              handleClose();
            }}
          >
            Fermer
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
