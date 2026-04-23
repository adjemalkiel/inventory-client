import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  BookOpen,
  ChevronRight,
  Construction,
  EllipsisVertical,
  Eye,
  History,
  KeyRound,
  Loader2,
  Package,
  PauseCircle,
  ScanLine,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { useCurrentUser } from '@/context/CurrentUserContext';
import { apiServices } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { DjangoUser, Site, UserProfile, UserProfileRole } from '@/types/api';
import type { UUID } from '@/types/common';

const ROLE_CHOICES: { value: UserProfileRole; label: string }[] = [
  { value: 'administrateur', label: 'Administrateur' },
  { value: 'magasinier', label: 'Magasinier' },
  { value: 'chef_chantier', label: 'Chef de chantier' },
  { value: 'consultant', label: 'Consultant' },
];

const ROLE_CARD_META: { value: UserProfileRole; label: string; description: string; icon: LucideIcon }[] = [
  {
    value: 'administrateur',
    label: 'Administrateur',
    description: 'Accès complet à toutes les configurations et données de l’entreprise.',
    icon: Shield,
  },
  {
    value: 'magasinier',
    label: 'Magasinier',
    description: 'Gestion des flux physiques, réceptions et inventaires tournants.',
    icon: Package,
  },
  {
    value: 'chef_chantier',
    label: 'Chef de chantier',
    description: 'Demandes de transferts et consultation des stocks chantiers.',
    icon: Construction,
  },
  {
    value: 'consultant',
    label: 'Consultant',
    description: 'Consultation des données et rapports selon les habilitations.',
    icon: BookOpen,
  },
];

type PerimeterMode = 'all' | 'selected' | 'readonly';

type OperationalRights = {
  recordMovement: boolean;
  validateInventory: boolean;
  startPhysicalInventory: boolean;
  accessSettings: boolean;
};

type ControlRights = {
  validation: boolean;
  qr: boolean;
  justification: boolean;
  alert: boolean;
};

function defaultOperationalForRole(role: UserProfileRole): OperationalRights {
  const admin = role === 'administrateur';
  const mag = role === 'magasinier';
  return {
    recordMovement: true,
    validateInventory: admin,
    startPhysicalInventory: admin || mag,
    accessSettings: admin,
  };
}

const defaultControlRights = (): ControlRights => ({
  validation: true,
  qr: true,
  justification: false,
  alert: true,
});

function formatAccessRef(u: DjangoUser): string {
  const id = String(u.id).padStart(4, '0');
  const tag = (u.username || u.email.split('@')[0] || 'U').slice(0, 2).toUpperCase();
  return `INV-${id}-${tag}`;
}

function OpSwitch({
  on,
  disabled,
  onToggle,
}: {
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-colors',
        on ? 'bg-primary' : 'bg-surface-container-highest',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={cn(
          'absolute h-3 w-3 rounded-full bg-white shadow-sm transition-all',
          on ? 'right-1' : 'left-1',
        )}
      />
    </button>
  );
}

function roleLabel(role: UserProfileRole | null | undefined): string {
  return ROLE_CHOICES.find((r) => r.value === role)?.label ?? '—';
}

function rolePillClass(role: UserProfileRole | null | undefined): string {
  switch (role) {
    case 'administrateur':
      return 'bg-secondary-fixed text-on-secondary-fixed';
    case 'magasinier':
      return 'bg-primary-fixed text-on-primary-fixed';
    case 'chef_chantier':
      return 'bg-secondary-container/40 text-on-secondary-container';
    case 'consultant':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-500';
  }
}

function displayName(u: DjangoUser): string {
  const n = `${u.first_name} ${u.last_name}`.trim();
  return n || u.username;
}

function initials(u: DjangoUser): string {
  const fromName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
  if (fromName) {
    const p = fromName.split(/\s+/);
    if (p.length >= 2) {
      return (p[0]![0]! + p[1]![0]! || '').toUpperCase();
    }
    return (fromName.slice(0, 2) || '??').toUpperCase();
  }
  return (u.email.split('@')[0] || 'U').slice(0, 2).toUpperCase();
}

function formatLastLogin(iso: string | null | undefined): string {
  if (!iso) {
    return 'Jamais';
  }
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

type ProfileDrawerTab = 'apercu' | 'acces' | 'activite' | 'securite';

function formatDateJoined(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatRelativeFr(pastIso: string): string {
  try {
    const past = new Date(pastIso).getTime();
    const diffSec = Math.round((Date.now() - past) / 1000);
    if (diffSec < 0) {
      return 'À venir';
    }
    if (diffSec < 60) {
      return "À l'instant";
    }
    const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
    const minutes = Math.floor(diffSec / 60);
    if (minutes < 60) {
      return rtf.format(-minutes, 'minute');
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return rtf.format(-hours, 'hour');
    }
    const days = Math.floor(hours / 24);
    if (days < 7) {
      return rtf.format(-days, 'day');
    }
    const weeks = Math.floor(days / 7);
    if (weeks < 5) {
      return rtf.format(-weeks, 'week');
    }
    const months = Math.floor(days / 30);
    if (months < 12) {
      return rtf.format(-months, 'month');
    }
    const years = Math.floor(days / 365);
    return rtf.format(-years, 'year');
  } catch {
    return pastIso;
  }
}

type Row = {
  user: DjangoUser;
  profile: UserProfile | null;
  siteName: string | null;
};

type ProfileActivityEvent = { at: string; title: string; detail: string; useDateOnly: boolean };

function buildProfileActivityEvents(row: Row): ProfileActivityEvent[] {
  const events: ProfileActivityEvent[] = [];
  if (row.user.last_login) {
    events.push({
      at: row.user.last_login,
      title: 'Dernière connexion',
      detail: 'Session enregistrée',
      useDateOnly: false,
    });
  } else {
    events.push({
      at: row.user.date_joined,
      title: 'Connexion',
      detail: 'Aucune session enregistrée',
      useDateOnly: false,
    });
  }
  if (row.profile?.activated_at) {
    events.push({
      at: row.profile.activated_at,
      title: 'Profil activé',
      detail: "Accès à l'application",
      useDateOnly: false,
    });
  }
  if (row.profile?.invited_at) {
    events.push({
      at: row.profile.invited_at,
      title: 'Invitation',
      detail: "E-mail d'invitation envoyé",
      useDateOnly: false,
    });
  }
  events.push({
    at: row.user.date_joined,
    title: 'Compte créé',
    detail: 'Création du compte',
    useDateOnly: true,
  });
  return [...events].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

function buildRows(users: DjangoUser[], profiles: UserProfile[], sites: Site[]): Row[] {
  const siteById = new Map(sites.map((s) => [s.id, s.name]));
  return users.map((user) => {
    const profile = profiles.find((p) => p.user === user.id) ?? null;
    const siteName = profile?.site ? siteById.get(profile.site as UUID) ?? null : null;
    return { user, profile, siteName };
  });
}

export default function UsersPage() {
  const { me, status: authStatus } = useCurrentUser();
  const selfId = me?.user.id;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [menuUserId, setMenuUserId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const [preview, setPreview] = useState<Row | null>(null);
  const [profileDrawerTab, setProfileDrawerTab] = useState<ProfileDrawerTab>('apercu');
  const [edit, setEdit] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState<{
    role: UserProfileRole;
    job_title: string;
    site: UUID | null;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [rowBusy, setRowBusy] = useState<number | null>(null);

  const [editPerimeterMode, setEditPerimeterMode] = useState<PerimeterMode>('all');
  const [operationalRights, setOperationalRights] = useState<OperationalRights>(() =>
    defaultOperationalForRole('magasinier'),
  );
  const [controlRights, setControlRights] = useState<ControlRights>(() => defaultControlRights());
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [accessEditSnapshot, setAccessEditSnapshot] = useState<{
    role: UserProfileRole;
    site: UUID | null;
    perimeter: PerimeterMode;
  } | null>(null);
  const [showInventoryRiskModal, setShowInventoryRiskModal] = useState(false);
  const [inventoryRiskNote, setInventoryRiskNote] = useState('');

  const load = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const [userList, profileList, siteList] = await Promise.all([
        apiServices.users.list(),
        apiServices.userProfiles.list(),
        apiServices.sites.list(),
      ]);
      setRows(buildRows(userList, profileList, siteList));
    } catch (e) {
      setLoadError(
        axios.isAxiosError(e) && e.response?.data?.detail
          ? String(e.response.data.detail)
          : "Impossible de charger les utilisateurs.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'ready' || authStatus === 'unauthenticated') {
      void load();
    }
  }, [authStatus, load]);

  useEffect(() => {
    if (preview) {
      setProfileDrawerTab('apercu');
    }
  }, [preview]);

  useEffect(() => {
    if (!preview) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreview(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [preview]);

  const closeUserMenu = useCallback(() => {
    setMenuUserId(null);
    setMenuPosition(null);
  }, []);

  useLayoutEffect(() => {
    if (menuUserId == null) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('[data-user-actions-root]')) {
        return;
      }
      closeUserMenu();
    };
    const id = requestAnimationFrame(() => {
      document.addEventListener('mousedown', onDoc, true);
    });
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('mousedown', onDoc, true);
    };
  }, [menuUserId, closeUserMenu]);

  useEffect(() => {
    if (menuUserId == null) {
      return;
    }
    const onScrollOrResize = () => closeUserMenu();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [menuUserId, closeUserMenu]);

  const total = rows.length;
  const activeCount = useMemo(() => rows.filter((r) => r.user.is_active).length, [rows]);

  const openEdit = (row: Row) => {
    closeUserMenu();
    setPreview(null);
    const role = (row.profile?.role as UserProfileRole) ?? 'magasinier';
    const site = (row.profile?.site as UUID | null) ?? null;
    const perimeter: PerimeterMode = site ? 'selected' : 'all';
    setEdit(row);
    setEditForm({
      role,
      job_title: row.profile?.job_title ?? '',
      site,
    });
    setEditPerimeterMode(perimeter);
    setOperationalRights(defaultOperationalForRole(role));
    setControlRights(defaultControlRights());
    setNotifyByEmail(true);
    setAccessEditSnapshot({ role, site, perimeter });
    setShowInventoryRiskModal(false);
    setInventoryRiskNote('');
  };

  const closeEdit = () => {
    if (saving) {
      return;
    }
    setEdit(null);
    setEditForm(null);
    setAccessEditSnapshot(null);
    setShowInventoryRiskModal(false);
    setInventoryRiskNote('');
  };

  const saveEdit = async () => {
    if (!edit || !editForm) {
      return;
    }
    const siteToSave: UUID | null =
      editPerimeterMode === 'all' ? null : editForm.site;
    if (editPerimeterMode !== 'all' && !siteToSave) {
      window.alert('Sélectionnez au moins un site, ou choisissez « Tous les sites ».');
      return;
    }
    setSaving(true);
    try {
      const accessPayload: Parameters<typeof apiServices.userProfiles.patch>[1] = {
        role: editForm.role,
        job_title: editForm.job_title,
        site: siteToSave,
        ...(notifyByEmail ? { notify_user: true as const } : {}),
      };
      let savedProfile: Awaited<ReturnType<typeof apiServices.userProfiles.patch>> | null = null;
      if (edit.profile) {
        savedProfile = await apiServices.userProfiles.patch(edit.profile.id, accessPayload);
      } else {
        savedProfile = await apiServices.userProfiles.create({
          user: edit.user.id,
          ...accessPayload,
        });
      }
      if (notifyByEmail && savedProfile?.notify_email_sent === false) {
        window.alert(
          "L’enregistrement a réussi, mais l’e-mail de notification n’a pas pu être envoyé. " +
            "Vérifiez la configuration SMTP (Paramètres) ou les logs du serveur : " +
            "sans SMTP, Django envoie souvent les messages dans la console du serveur uniquement.",
        );
      }
      closeEdit();
      await load();
    } catch (e) {
      window.alert(
        axios.isAxiosError(e) && e.response?.data
          ? JSON.stringify(e.response.data)
          : 'Enregistrement impossible.',
      );
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (row: Row, is_active: boolean) => {
    if (row.user.id === selfId) {
      window.alert("Vous ne pouvez pas modifier l’accès de votre propre compte ici.");
      return;
    }
    closeUserMenu();
    setPreview(null);
    setRowBusy(row.user.id);
    try {
      await apiServices.users.patch(row.user.id, { is_active });
      await load();
    } catch (e) {
      window.alert(
        axios.isAxiosError(e) && e.response?.data?.detail
          ? String(e.response.data.detail)
          : "Action impossible.",
      );
    } finally {
      setRowBusy(null);
    }
  };

  const confirmSuspend = (row: Row) => {
    if (
      !window.confirm(
        `Suspendre le compte ${row.user.email} ? La personne ne pourra plus se connecter jusqu’à réactivation.`,
      )
    ) {
      return;
    }
    void setActive(row, false);
  };

  const confirmDeactivate = (row: Row) => {
    if (
      !window.confirm(
        `Désactiver l’accès pour ${row.user.email} ? Le compte sera inactif (réactivable par un administrateur).`,
      )
    ) {
      return;
    }
    void setActive(row, false);
  };

  const [siteOptions, setSiteOptions] = useState<Site[]>([]);
  useEffect(() => {
    void apiServices.sites
      .list()
      .then(setSiteOptions)
      .catch(() => setSiteOptions([]));
  }, []);

  const menuRow = menuUserId != null ? rows.find((r) => r.user.id === menuUserId) : null;
  const userActionsMenuW = 192;
  const userActionsMenuGap = 4;

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-headline font-bold text-primary tracking-tight leading-tight mb-2">
            Gestion des Utilisateurs
          </h2>
          <p className="text-on-surface-variant max-w-xl leading-relaxed">
            Gérez les accès, les rôles, les sites et l’état des comptes. Utilisez le menu
            d’actions sur chaque ligne.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/users/new"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg hover:bg-primary-container transition-all active:scale-95"
          >
            <UserPlus className="w-5 h-5" />
            Inviter un utilisateur
          </Link>
        </div>
      </div>

      {loadError && (
        <p className="text-sm text-error bg-error/5 border border-error/20 rounded-xl px-4 py-3">{loadError}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary-fixed" />
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total</p>
          <p className="text-3xl font-bold font-headline text-primary">{loading ? '…' : total}</p>
          <Users className="absolute top-4 right-4 text-slate-100 w-10 h-10" />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Comptes actifs</p>
          <p className="text-3xl font-bold font-headline text-primary">{loading ? '…' : activeCount}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-tertiary-fixed" />
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Désactivés</p>
          <p className="text-3xl font-bold font-headline text-primary">
            {loading ? '…' : total - activeCount}
          </p>
          <History className="absolute top-4 right-4 text-slate-100 w-10 h-10" />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-error-container" />
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Rôles (profils)</p>
          <p className="text-3xl font-bold font-headline text-primary">
            {loading ? '…' : rows.filter((r) => r.profile).length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
        <div className="overflow-x-auto">
          {loading && (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              Chargement…
            </div>
          )}
          {!loading && (
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Utilisateur</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fonction</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rôle</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Site rattaché</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Statut</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dernière connexion</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.user.id} className="group hover:bg-slate-50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary font-bold text-sm">
                          {initials(row.user)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{displayName(row.user)}</p>
                          <p className="text-[11px] text-slate-500">{row.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">
                        {row.profile?.job_title?.trim() || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider',
                          rolePillClass(row.profile?.role),
                        )}
                      >
                        {row.profile ? roleLabel(row.profile.role) : 'Non défini'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{row.siteName ?? '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            row.user.is_active ? 'bg-emerald-500' : 'bg-slate-300',
                          )}
                        />
                        <span
                          className={cn(
                            'text-xs font-bold',
                            row.user.is_active ? 'text-emerald-700' : 'text-slate-500 italic',
                          )}
                        >
                          {row.user.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{formatLastLogin(row.user.last_login)}</span>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <div className="relative inline-flex" data-user-actions-root>
                        <button
                          type="button"
                          className="action-trigger text-slate-400 hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/5 disabled:opacity-50"
                          aria-label="Actions utilisateur"
                          aria-expanded={menuUserId === row.user.id}
                          aria-haspopup="menu"
                          disabled={rowBusy === row.user.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (menuUserId === row.user.id) {
                              closeUserMenu();
                              return;
                            }
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                            const left = Math.min(
                              window.innerWidth - userActionsMenuW - 8,
                              Math.max(8, rect.right - userActionsMenuW),
                            );
                            setMenuPosition({ top: rect.bottom + userActionsMenuGap, left });
                            setMenuUserId(row.user.id);
                          }}
                        >
                          {rowBusy === row.user.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <EllipsisVertical className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && !loadError && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 text-sm">
                      Aucun utilisateur. Invitez un collaborateur pour commencer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            {total ? `${total} utilisateur(s)` : 'Aucun résultat'}
          </p>
        </div>
      </div>

      {menuUserId != null &&
        menuPosition &&
        menuRow &&
        createPortal(
          <div
            data-user-actions-root
            className="fixed z-[2000] w-48 rounded-xl border border-slate-200/80 bg-white py-2 text-left shadow-xl"
            style={{ top: menuPosition.top, left: menuPosition.left }}
            role="menu"
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              role="menuitem"
              onClick={() => {
                closeUserMenu();
                setPreview(menuRow);
              }}
            >
              <Eye className="h-[18px] w-[18px] shrink-0 text-slate-500" />
              Voir le profil
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              role="menuitem"
              onClick={() => openEdit(menuRow)}
            >
              <UserCog className="h-[18px] w-[18px] shrink-0 text-slate-500" />
              Modifier les accès
            </button>
            {menuRow.user.is_active ? (
              <>
                <hr className="my-1 border-slate-200" />
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors"
                  role="menuitem"
                  onClick={() => {
                    if (menuRow.user.id === selfId) {
                      window.alert("Vous ne pouvez pas modifier l’accès de votre propre compte ici.");
                      return;
                    }
                    closeUserMenu();
                    confirmSuspend(menuRow);
                  }}
                >
                  <PauseCircle className="h-[18px] w-[18px] shrink-0" />
                  Suspendre le compte
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2 text-xs font-medium text-error hover:bg-error/10 transition-colors"
                  role="menuitem"
                  onClick={() => {
                    if (menuRow.user.id === selfId) {
                      window.alert("Vous ne pouvez pas modifier l’accès de votre propre compte ici.");
                      return;
                    }
                    closeUserMenu();
                    confirmDeactivate(menuRow);
                  }}
                >
                  <Ban className="h-[18px] w-[18px] shrink-0" />
                  Désactiver
                </button>
              </>
            ) : (
              <>
                <hr className="my-1 border-slate-200" />
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-50 transition-colors"
                  role="menuitem"
                  onClick={() => void setActive(menuRow, true)}
                >
                  <UserCheck className="h-[18px] w-[18px] shrink-0" />
                  Réactiver l’accès
                </button>
              </>
            )}
          </div>,
          document.body,
        )}

      {/* Profil — panneau latéral */}
      {preview && (
        <>
          <div
            className="fixed inset-0 z-[2100] bg-primary/40 backdrop-blur-sm"
            onClick={() => setPreview(null)}
            aria-hidden
          />
          <aside
            role="dialog"
            aria-modal
            aria-labelledby="user-profile-drawer-title"
            className="fixed right-0 top-0 z-[2110] flex h-full w-full max-w-[400px] flex-col overflow-hidden bg-primary font-headline text-white shadow-2xl antialiased"
          >
            <div className="flex flex-col gap-6 px-8 pb-6 pt-10">
              <div className="flex items-center justify-between">
                <h2 id="user-profile-drawer-title" className="text-xl font-bold tracking-tight text-white">
                  Profil Utilisateur
                </h2>
                <button
                  type="button"
                  className="rounded-lg p-1 text-slate-400 transition-colors hover:text-white"
                  onClick={() => setPreview(null)}
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-white/10 bg-white/10 text-lg font-bold text-white shadow-lg">
                    {initials(preview.user)}
                  </div>
                  {preview.user.is_active ? (
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-primary bg-emerald-500" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-bold text-white">
                      {displayName(preview.user)}
                    </h3>
                    <span
                      className={cn(
                        'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        preview.user.is_active
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          : 'border-white/10 bg-white/5 text-slate-400',
                      )}
                    >
                      {preview.user.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <p className="truncate text-sm text-slate-400">
                    {preview.profile?.job_title?.trim() || '—'}
                  </p>
                </div>
              </div>
            </div>

            <nav className="flex shrink-0 border-b border-white/5 px-4">
              {(
                [
                  { id: 'apercu' as const, label: 'Aperçu', icon: User },
                  { id: 'acces' as const, label: 'Accès', icon: KeyRound },
                  { id: 'activite' as const, label: 'Activité', icon: History },
                  { id: 'securite' as const, label: 'Sécurité', icon: ShieldCheck },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isActive = profileDrawerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setProfileDrawerTab(tab.id)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 px-2 py-3.5 text-xs font-semibold transition-all duration-300',
                      isActive
                        ? 'border-b-2 border-white bg-white/10 text-white backdrop-blur-md'
                        : 'border-b-2 border-transparent text-slate-400 hover:text-white',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden min-[400px]:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            <div
              className={cn(
                'min-h-0 flex-1 overflow-y-auto bg-white p-8 text-on-surface',
                '[scrollbar-width:thin] [scrollbar-color:theme(colors.surface-container-highest)_transparent]',
              )}
            >
              {profileDrawerTab === 'apercu' && (
                <>
                  <section className="mb-10">
                    <h4 className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
                      <span className="h-px w-4 bg-outline-variant" />
                      Informations Générales
                    </h4>
                    <div className="space-y-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-slate-400">E-mail</span>
                        <span className="text-sm font-semibold text-on-primary-fixed">
                          {preview.user.email}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-slate-400">Téléphone</span>
                        <span className="text-sm font-semibold text-on-primary-fixed">
                          {preview.profile?.phone?.trim() || '—'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-slate-400">Rôle</span>
                          <span className="text-sm font-semibold text-on-primary-fixed">
                            {preview.profile ? roleLabel(preview.profile.role) : '—'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-medium text-slate-400">Site</span>
                          <span className="text-sm font-semibold text-on-primary-fixed">
                            {preview.siteName ?? '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>
                  <section className="mb-10">
                    <h4 className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
                      <span className="h-px w-4 bg-outline-variant" />
                      Périmètre d&apos;action
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {preview.profile ? (
                        <>
                          {preview.siteName ? (
                            <span className="rounded-full border border-outline-variant/30 bg-surface-container-low px-3 py-1 text-[11px] font-semibold text-on-secondary-fixed-variant">
                              {preview.siteName}
                            </span>
                          ) : (
                            <span className="text-xs text-on-surface-variant">Site non affecté</span>
                          )}
                          <span className="rounded-full border border-outline-variant/30 bg-surface-container-low px-3 py-1 text-[11px] font-semibold text-on-secondary-fixed-variant">
                            {roleLabel(preview.profile.role)}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-on-surface-variant">Profil non configuré</span>
                      )}
                    </div>
                  </section>
                  <section>
                    <h4 className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
                      <span className="h-px w-4 bg-outline-variant" />
                      Activité récente
                    </h4>
                    <div className="space-y-6">
                      {buildProfileActivityEvents(preview).map((ev, i) => (
                        <div
                          key={`${ev.title}-${ev.at}-${i}`}
                          className="relative border-l border-surface-container-highest pl-6"
                        >
                          <div
                            className={cn(
                              'absolute -left-[5px] top-0 h-[9px] w-[9px] rounded-full ring-4 ring-white',
                              i === 0 ? 'bg-primary' : 'bg-outline-variant',
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-on-primary-fixed">{ev.title}</span>
                            <span className="mb-1 text-[11px] text-on-surface-variant">{ev.detail}</span>
                            <span className="text-[10px] italic text-slate-400">
                              {ev.useDateOnly
                                ? formatDateJoined(ev.at)
                                : ev.title === 'Connexion' && !preview.user.last_login
                                  ? '—'
                                  : formatRelativeFr(ev.at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {profileDrawerTab === 'acces' && (
                <div className="space-y-6 text-sm">
                  <p className="text-on-surface-variant">
                    Droits d&apos;accès de l&apos;utilisateur et rattachement au site.
                  </p>
                  <div className="space-y-4 rounded-xl border border-outline-variant/40 bg-surface-container-low/80 p-4">
                    <div>
                      <span className="text-[11px] font-medium text-slate-400">Rôle</span>
                      <p className="font-semibold text-on-primary-fixed">
                        {preview.profile ? roleLabel(preview.profile.role) : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-slate-400">Site rattaché</span>
                      <p className="font-semibold text-on-primary-fixed">{preview.siteName ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-slate-400">Statut compte</span>
                      <p className="font-semibold text-on-primary-fixed">
                        {preview.user.is_active ? 'Compte actif' : 'Compte inactif'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-slate-400">Dernière connexion</span>
                      <p className="font-semibold text-on-primary-fixed">
                        {formatLastLogin(preview.user.last_login)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {profileDrawerTab === 'activite' && (
                <div>
                  <h4 className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
                    <span className="h-px w-4 bg-outline-variant" />
                    Activité
                  </h4>
                  <div className="space-y-6">
                    {buildProfileActivityEvents(preview).map((ev, i) => (
                      <div
                        key={`a-${ev.title}-${ev.at}-${i}`}
                        className="relative border-l border-surface-container-highest pl-6"
                      >
                        <div
                          className={cn(
                            'absolute -left-[5px] top-0 h-[9px] w-[9px] rounded-full ring-4 ring-white',
                            i === 0 ? 'bg-primary' : 'bg-outline-variant',
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-on-primary-fixed">{ev.title}</span>
                          <span className="mb-1 text-[11px] text-on-surface-variant">{ev.detail}</span>
                          <span className="text-[10px] italic text-slate-400">
                            {ev.useDateOnly
                              ? formatDateJoined(ev.at)
                              : ev.title === 'Connexion' && !preview.user.last_login
                                ? '—'
                                : formatRelativeFr(ev.at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profileDrawerTab === 'securite' && (
                <div className="space-y-6 text-sm">
                  <div className="space-y-4">
                    <div>
                      <span className="text-[11px] font-medium text-slate-400">Identifiant</span>
                      <p className="font-semibold text-on-primary-fixed">{preview.user.username}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-slate-400">E-mail de connexion</span>
                      <p className="font-semibold text-on-primary-fixed">{preview.user.email}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-slate-400">Dernière session</span>
                      <p className="font-semibold text-on-primary-fixed">
                        {formatLastLogin(preview.user.last_login)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-slate-400">Compte créé le</span>
                      <p className="font-semibold text-on-primary-fixed">
                        {formatDateJoined(preview.user.date_joined)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 border-t border-outline-variant/30 pt-4">
                      <span className="text-[11px] font-medium text-slate-400">Django / API</span>
                      <p className="text-on-surface-variant">
                        Statut staff : {preview.user.is_staff ? 'oui' : 'non'} · Superutilisateur :{' '}
                        {preview.user.is_superuser ? 'oui' : 'non'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-surface-container-highest bg-surface-container-low p-6">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-container py-4 text-sm font-bold tracking-tight text-white shadow-lg transition-all duration-300 active:scale-95"
                onClick={() => openEdit(preview)}
              >
                <UserCog className="h-5 w-5 shrink-0" />
                Modifier les droits
              </button>
              {preview.user.is_active ? (
                <button
                  type="button"
                  className="w-full py-3 text-xs font-semibold uppercase tracking-widest text-error transition-colors hover:rounded-lg hover:bg-error/5"
                  onClick={() => {
                    if (preview.user.id === selfId) {
                      window.alert("Vous ne pouvez pas modifier l’accès de votre propre compte ici.");
                      return;
                    }
                    confirmDeactivate(preview);
                  }}
                >
                  Désactiver le compte
                </button>
              ) : (
                <button
                  type="button"
                  className="w-full py-3 text-xs font-semibold uppercase tracking-widest text-emerald-800 transition-colors hover:rounded-lg hover:bg-emerald-50"
                  onClick={() => void setActive(preview, true)}
                >
                  Réactiver l&apos;accès
                </button>
              )}
            </div>
          </aside>
        </>
      )}

      {/* Modifier les accès — tiroir premium */}
      {edit && editForm && (
        <>
          <div
            className="fixed inset-0 z-[2200] bg-primary/20 backdrop-blur-[2px]"
            onClick={() => !saving && closeEdit()}
            aria-hidden
          />
          <aside
            className="fixed bottom-0 right-0 top-0 z-[2210] flex h-dvh max-h-dvh min-h-0 w-full max-w-[560px] flex-col overflow-hidden bg-white shadow-[0_20px_40px_rgba(9,20,38,0.12)]"
            role="dialog"
            aria-labelledby="access-edit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex flex-col gap-6 border-b border-surface-container bg-white p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="access-edit-title" className="text-2xl font-bold text-primary">
                    Modifier les accès
                  </h2>
                  <p className="text-sm text-secondary">Configuration des privilèges de sécurité</p>
                </div>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-surface-container-low"
                  onClick={() => !saving && closeEdit()}
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5 text-outline" />
                </button>
              </div>
              <div className="flex items-center gap-4 rounded-xl bg-surface-container-low p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-surface-container-highest/80 bg-primary-fixed/30 text-base font-bold text-primary">
                  {initials(edit.user)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-primary">{displayName(edit.user)}</h3>
                    <span
                      className={cn(
                        'rounded border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-tighter',
                        edit.user.is_active
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-slate-200 bg-slate-100 text-slate-600',
                      )}
                    >
                      {edit.user.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    {editForm.job_title.trim() || '—'}
                  </p>
                  <p className="mt-1 font-sans text-[10px] uppercase tracking-widest text-outline">
                    ID : {formatAccessRef(edit.user)}
                  </p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-10 overflow-y-auto overflow-x-hidden p-8 [scrollbar-color:theme(colors.surface-container-highest)_transparent] [scrollbar-width:thin]">
              {operationalRights.validateInventory && editForm.role !== 'administrateur' ? (
                <div className="flex items-start gap-3 border-l-4 border-orange-500 bg-orange-50 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                  <div className="text-sm text-orange-900">
                    <p className="font-bold">Attention : droits sensibles</p>
                    <p className="opacity-80">
                      La validation d’écarts d’inventaire sans contre-signature est restreinte aux profils
                      direction.
                    </p>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-outline">
                  Intitulé de fonction
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-surface-container bg-surface-container-lowest px-4 py-2.5 text-sm text-primary placeholder:text-on-surface-variant/60"
                  value={editForm.job_title}
                  onChange={(e) => setEditForm((f) => f && { ...f, job_title: e.target.value })}
                  placeholder="Ex. Magasinière principale"
                />
              </div>

              <section>
                <h4 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                  Rôle
                </h4>
                <div className="space-y-3">
                  {ROLE_CARD_META.map((meta) => {
                    const sel = editForm.role === meta.value;
                    const Icon = meta.icon;
                    return (
                      <label
                        key={meta.value}
                        className={cn(
                          'group relative flex cursor-pointer flex-col rounded-xl border p-4 transition-all',
                          sel
                            ? 'border-2 border-primary bg-primary-fixed/20'
                            : 'border-surface-container bg-surface-container-lowest hover:border-primary',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                                sel ? 'border-primary' : 'border-primary-fixed',
                              )}
                            >
                              {sel ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                            </div>
                            <span className="font-bold text-primary">{meta.label}</span>
                          </div>
                          <Icon className={cn('h-5 w-5 shrink-0', sel ? 'text-primary' : 'text-outline group-hover:text-primary')} />
                        </div>
                        <p className="ml-7 mt-1 text-xs text-secondary">{meta.description}</p>
                        <input
                          className="absolute opacity-0"
                          name="access-role"
                          type="radio"
                          checked={sel}
                          onChange={() => {
                            setEditForm((f) => f && { ...f, role: meta.value });
                            setOperationalRights(defaultOperationalForRole(meta.value));
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              </section>

              <section>
                <h4 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                  Périmètre d&apos;accès
                </h4>
                <div className="mb-4 flex gap-1 rounded-lg bg-surface-container-low p-1">
                  {(
                    [
                      { m: 'all' as const, label: 'Tous les sites' },
                      { m: 'selected' as const, label: 'Site(s)' },
                      { m: 'readonly' as const, label: 'Lecture seule' },
                    ] as const
                  ).map(({ m, label }) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setEditPerimeterMode(m);
                        if (m === 'all') {
                          setEditForm((f) => f && { ...f, site: null });
                        }
                        if (m === 'readonly') {
                          setOperationalRights({
                            recordMovement: false,
                            validateInventory: false,
                            startPhysicalInventory: false,
                            accessSettings: false,
                          });
                        }
                        if (m === 'selected' && editForm) {
                          setOperationalRights(defaultOperationalForRole(editForm.role));
                        }
                      }}
                      className={cn(
                        'flex-1 rounded-md py-2 text-xs font-bold transition-colors',
                        editPerimeterMode === m
                          ? 'bg-white text-primary shadow-sm'
                          : 'font-medium text-secondary hover:text-primary',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mb-3 pl-1 text-xs text-on-surface-variant">
                  Un seul site peut être rattaché dans l&apos;application. Choisissez &quot;Tous les
                  sites&quot; pour ne restreindre par aucun dépôt.
                </p>
                <div className="grid grid-cols-1 gap-3 pl-1 sm:grid-cols-2">
                  {siteOptions.map((s) => {
                    const checked = editForm.site === s.id;
                    return (
                      <label
                        key={s.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 py-2',
                          editPerimeterMode === 'all' && 'pointer-events-none opacity-40',
                          editPerimeterMode === 'readonly' && !checked && 'opacity-50',
                        )}
                      >
                        <input
                          type="radio"
                          name="access-site"
                          className="h-4 w-4 border-outline-variant text-primary focus:ring-primary"
                          disabled={editPerimeterMode === 'all' || editPerimeterMode === 'readonly'}
                          checked={checked}
                          onChange={() => setEditForm((f) => f && { ...f, site: s.id as UUID })}
                        />
                        <span className="text-sm font-medium text-on-surface">{s.name}</span>
                      </label>
                    );
                  })}
                  {!siteOptions.length ? (
                    <p className="text-sm text-on-surface-variant">Aucun site enregistré.</p>
                  ) : null}
                </div>
              </section>

              <section>
                <h4 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                  Droits opérationnels
                </h4>
                <p className="mb-4 text-xs text-on-surface-variant">
                  Préfiguration des habilitations (synchronisation serveur à venir).
                </p>
                <div className="space-y-6">
                  {(
                    [
                      {
                        k: 'recordMovement' as const,
                        title: 'Enregistrer un mouvement',
                        desc: 'Autoriser l’entrée et la sortie manuelle de matériel.',
                      },
                      {
                        k: 'validateInventory' as const,
                        title: 'Valider les écarts d’inventaire',
                        desc: 'Permettre la mise à jour forcée des stocks après comptage.',
                      },
                      {
                        k: 'startPhysicalInventory' as const,
                        title: 'Lancer un inventaire physique',
                        desc: 'Générer des feuilles de comptage et bloquer les mouvements.',
                      },
                      {
                        k: 'accessSettings' as const,
                        title: 'Accéder aux paramètres',
                        desc: 'Configuration des nomenclatures et des unités.',
                      },
                    ] as const
                  ).map(({ k, title, desc }, i) => (
                    <div
                      key={k}
                      className={cn(
                        'flex items-center justify-between gap-4',
                        i === 3 && 'opacity-60',
                        editPerimeterMode === 'readonly' && 'pointer-events-none opacity-60',
                      )}
                    >
                      <div className="min-w-0 max-w-[80%]">
                        <p className="text-sm font-bold text-primary">{title}</p>
                        <p className="text-xs leading-relaxed text-secondary">{desc}</p>
                      </div>
                      <OpSwitch
                        on={operationalRights[k]}
                        onToggle={() => {
                          if (k === 'validateInventory' && !operationalRights.validateInventory) {
                            if (editForm.role !== 'administrateur') {
                              setShowInventoryRiskModal(true);
                              return;
                            }
                          }
                          if (k === 'validateInventory' && operationalRights.validateInventory) {
                            setOperationalRights((r) => ({ ...r, validateInventory: false }));
                            return;
                          }
                          setOperationalRights((r) => ({ ...r, [k]: !r[k] }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                  Contrôles et validations
                </h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {(
                    [
                      { k: 'validation' as const, label: 'Validation requise' },
                      { k: 'qr' as const, label: 'Autoriser scan QR' },
                      { k: 'justification' as const, label: 'Exiger justification' },
                      { k: 'alert' as const, label: 'Seuil d’alerte' },
                    ] as const
                  ).map(({ k, label }) => (
                    <div
                      key={k}
                      className="flex items-center justify-between gap-2 rounded-xl border border-surface-container p-4"
                    >
                      <span className="text-xs font-bold text-primary">{label}</span>
                      <OpSwitch
                        on={controlRights[k]}
                        onToggle={() =>
                          setControlRights((c) => ({ ...c, [k]: !c[k] }))
                        }
                        disabled={editPerimeterMode === 'readonly'}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {accessEditSnapshot ? (
                <section className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-6">
                  <h4 className="mb-4 flex items-center gap-2 text-xs font-bold text-primary">
                    <ScanLine className="h-4 w-4" />
                    Résumé des changements
                  </h4>
                  <div className="flex items-center justify-between border-b border-surface-container py-2 text-xs">
                    <span className="text-secondary">Rôle</span>
                    <div className="flex max-w-[70%] flex-wrap items-center justify-end gap-2 text-right">
                      {accessEditSnapshot.role !== editForm.role ? (
                        <>
                          <span className="text-outline line-through">
                            {roleLabel(accessEditSnapshot.role)}
                          </span>
                          <ArrowRight className="h-3 w-3 shrink-0 text-outline" />
                        </>
                      ) : null}
                      <span className="font-bold text-primary">{roleLabel(editForm.role)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 text-xs">
                    <span className="text-secondary">Sites accessibles</span>
                    <div className="flex max-w-[70%] flex-wrap items-center justify-end gap-2 text-right">
                      {(() => {
                        const fromP =
                          accessEditSnapshot.perimeter === 'all'
                            ? 'Tous les sites'
                            : accessEditSnapshot.site
                              ? (siteOptions.find((x) => x.id === accessEditSnapshot.site)?.name ?? '—')
                              : '—';
                        const toP =
                          editPerimeterMode === 'all'
                            ? 'Tous les sites'
                            : editForm.site
                              ? (siteOptions.find((x) => x.id === editForm.site)?.name ?? '—')
                              : '—';
                        const perimCh =
                          accessEditSnapshot.perimeter !== editPerimeterMode ||
                          (accessEditSnapshot.perimeter !== 'all' &&
                            editPerimeterMode !== 'all' &&
                            accessEditSnapshot.site !== editForm.site) ||
                          (accessEditSnapshot.perimeter === 'all' && editPerimeterMode !== 'all') ||
                          (accessEditSnapshot.perimeter !== 'all' && editPerimeterMode === 'all');
                        return (
                          <>
                            {perimCh ? (
                              <>
                                <span className="text-outline line-through">{fromP}</span>
                                <ArrowRight className="h-3 w-3 shrink-0 text-outline" />
                              </>
                            ) : null}
                            <span className="font-bold text-primary">{toP}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-container p-6">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
                <div className="relative mb-3 flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary-fixed" />
                  <span className="text-sm font-bold text-white">Suggestion</span>
                </div>
                <p className="relative text-xs italic leading-relaxed text-white/80">
                  {editForm.role === 'magasinier'
                    ? 'Pour un profil magasinier, limitez l’accès direct aux chantiers pour réduire les erreurs de saisie à distance.'
                    : editForm.role === 'administrateur'
                      ? 'Vérifiez les comptes administrateurs : réservez-les aux personnes tenues de gouverner l’annuaire et la configuration.'
                      : 'Adaptez le périmètre au besoin : un site ciblé suffit souvent pour les rôles terrain.'}
                </p>
                <button
                  type="button"
                  className="relative mt-4 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary-fixed transition-colors hover:text-white"
                  onClick={() => {
                    if (editForm.role === 'magasinier') {
                      setEditPerimeterMode('selected');
                    } else {
                      setEditForm((f) => f && { ...f, role: 'magasinier' });
                      setOperationalRights(defaultOperationalForRole('magasinier'));
                    }
                  }}
                >
                  Appliquer la recommandation
                  <ChevronRight className="h-3 w-3" />
                </button>
              </section>
            </div>

            <div className="flex flex-col gap-6 border-t border-surface-container bg-white p-8">
              <label className="group flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                  checked={notifyByEmail}
                  onChange={(e) => setNotifyByEmail(e.target.checked)}
                />
                <span className="text-xs font-medium text-on-surface-variant group-hover:text-primary">
                  Notifier l&apos;utilisateur par e-mail
                </span>
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="flex-1 min-w-[140px] rounded-xl bg-primary px-6 py-4 text-sm font-bold text-white transition-all hover:bg-primary-container"
                  disabled={saving}
                  onClick={() => void saveEdit()}
                >
                  {saving ? <Loader2 className="inline h-4 w-4 animate-spin" /> : null}
                  {saving ? ' Enregistrement…' : 'Enregistrer les modifications'}
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-surface-container-low px-6 py-4 text-sm font-bold text-secondary transition-colors hover:bg-surface-container-high"
                  disabled={saving}
                  onClick={() => closeEdit()}
                >
                  Annuler
                </button>
              </div>
              <button
                type="button"
                className="self-center text-xs font-bold text-error transition-opacity hover:opacity-70"
                disabled={saving}
                onClick={() => {
                  if (!editForm) {
                    return;
                  }
                  setOperationalRights(defaultOperationalForRole(editForm.role));
                  setControlRights(defaultControlRights());
                }}
              >
                Réinitialiser tous les droits
              </button>
            </div>
          </aside>

          {showInventoryRiskModal ? (
            <div
              className="fixed inset-0 z-[2300] flex items-center justify-center p-4 bg-slate-900/40"
              onClick={() => {
                setShowInventoryRiskModal(false);
                setInventoryRiskNote('');
              }}
            >
              <div
                className="w-full max-w-[400px] rounded-2xl border border-surface-container bg-white p-8 shadow-[0_20px_40px_rgba(9,20,38,0.12)]"
                onClick={(e) => e.stopPropagation()}
                role="alertdialog"
                aria-modal
                aria-labelledby="inventory-risk-title"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
                <h3 id="inventory-risk-title" className="mb-2 text-xl font-bold text-primary">
                  Confirmation requise
                </h3>
                <p className="mb-6 text-sm leading-relaxed text-secondary">
                  L’octroi du droit <span className="font-bold text-primary">« Valider les écarts d’inventaire »</span> est
                  une action à haut risque pour ce profil.
                </p>
                <div className="mb-4">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-outline">
                    Motif de l’exception
                  </label>
                  <textarea
                    className="h-24 w-full resize-none rounded-xl border-0 bg-surface-container-low p-4 text-sm focus:ring-2 focus:ring-primary"
                    placeholder="Expliquez pourquoi cet accès est nécessaire…"
                    value={inventoryRiskNote}
                    onChange={(e) => setInventoryRiskNote(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-primary py-3 text-xs font-bold text-white"
                    onClick={() => {
                      if (!inventoryRiskNote.trim()) {
                        window.alert('Veuillez indiquer un motif.');
                        return;
                      }
                      setOperationalRights((r) => ({ ...r, validateInventory: true }));
                      setShowInventoryRiskModal(false);
                      setInventoryRiskNote('');
                    }}
                  >
                    Confirmer
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-surface-container-low py-3 text-xs font-bold text-secondary"
                    onClick={() => {
                      setShowInventoryRiskModal(false);
                      setInventoryRiskNote('');
                    }}
                  >
                    Retour
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}

      <div className="mt-16 pt-12 border-t border-slate-200">
        <h3 className="text-2xl font-bold font-headline text-primary mb-8">Structure des rôles</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: 'Administrateur',
              icon: Shield,
              description:
                "Contrôle étendu : utilisateurs, sites et accès applicatifs selon la configuration.",
            },
            {
              title: 'Magasinier',
              icon: Warehouse,
              description: 'Gestion des stocks, mouvements et inventaires sur les dépôts.',
            },
            {
              title: 'Chef de chantier',
              icon: Construction,
              description: 'Suivi des besoins matériaux et des affectations liées aux projets.',
            },
          ].map((role) => (
            <div
              key={role.title}
              className="bg-slate-50 p-8 rounded-2xl border border-transparent hover:border-slate-200"
            >
              <role.icon className="w-10 h-10 text-primary mb-4" />
              <h4 className="text-lg font-bold font-headline text-primary mb-2">{role.title}</h4>
              <p className="text-sm text-slate-500 leading-relaxed">{role.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
