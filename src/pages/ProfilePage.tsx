import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Pencil,
  FileText,
  SlidersHorizontal,
  HardHat,
  MapPin,
  ChevronRight,
  Shield,
  Bell,
  Laptop,
  Smartphone,
  Download,
  BadgeCheck,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  MonitorSmartphone,
  Loader2,
} from 'lucide-react';

import { useCurrentUser } from '@/context/CurrentUserContext';
import { apiServices, meApi } from '@/lib/api';
import { clearAccessToken } from '@/lib/auth';
import { userDisplayName, userInitials } from '@/lib/userDisplay';
import { cn } from '@/lib/utils';
import type {
  MePrefCurrency,
  MePrefDateFormat,
  MePrefDisplayDensity,
  MePrefLanguage,
  MePrefTimezone,
  MeResponse,
  Site,
} from '@/types/api';
import type { UUID } from '@/types/common';

const architecturalShadow = 'shadow-[0_20px_40px_rgba(9,20,38,0.05)]';

function ToggleOn() {
  return (
    <div
      className="w-10 h-6 bg-primary rounded-full relative transition-all cursor-pointer shrink-0"
      role="presentation"
    >
      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
    </div>
  );
}

function ToggleOff() {
  return (
    <div
      className="w-10 h-6 bg-slate-200 rounded-full relative transition-all cursor-pointer shrink-0 opacity-50"
      role="presentation"
    >
      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
    </div>
  );
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function parseApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const d = err.response.data as { detail?: string | string[] };
    if (typeof d.detail === 'string') {
      return d.detail;
    }
    if (Array.isArray(d.detail) && d.detail.length) {
      return d.detail.join(' ');
    }
  }
  return fallback;
}

type ProfileForm = {
  email: string;
  first_name: string;
  last_name: string;
  job_title: string;
  phone: string;
  site: UUID | null;
};

function meToForm(m: MeResponse): ProfileForm {
  return {
    email: m.user.email,
    first_name: m.user.first_name,
    last_name: m.user.last_name,
    job_title: m.profile.job_title,
    phone: m.profile.phone ?? '',
    site: m.profile.site,
  };
}

type DisplayPreferencesForm = {
  pref_language: MePrefLanguage;
  pref_timezone: MePrefTimezone;
  pref_date_format: MePrefDateFormat;
  pref_display_density: MePrefDisplayDensity;
  pref_currency: MePrefCurrency;
};

const PREF_LANGUAGE_OPTIONS: { value: MePrefLanguage; label: string }[] = [
  { value: 'fr-FR', label: 'Français (France)' },
  { value: 'en-US', label: 'English (US)' },
];

const PREF_TIMEZONE_OPTIONS: { value: MePrefTimezone; label: string }[] = [
  { value: 'Europe/Paris', label: '(GMT+01:00) Paris' },
  {
    value: 'Africa/Porto-Novo',
    label: '(GMT+01:00) Cotonou / Porto-Novo',
  },
  { value: 'UTC', label: 'UTC' },
];

const PREF_DATE_FORMAT_OPTIONS: { value: MePrefDateFormat; label: string }[] = [
  { value: 'dmy', label: 'JJ/MM/AAAA' },
  { value: 'mdy', label: 'MM/JJ/AAAA' },
  { value: 'ymd', label: 'AAAA-MM-JJ (ISO)' },
];

const PREF_DENSITY_OPTIONS: {
  value: MePrefDisplayDensity;
  label: string;
}[] = [
  { value: 'standard', label: 'Standard (Editorial)' },
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Lecture confortable' },
];

const PREF_CURRENCY_OPTIONS: { value: MePrefCurrency; label: string }[] = [
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'XOF', label: 'Franc CFA (BCEAO)' },
  { value: 'USD', label: 'Dollar (US)' },
  { value: 'CNY', label: 'Yuan renminbi (¥)' },
];

function meToPrefForm(m: MeResponse): DisplayPreferencesForm {
  return {
    pref_language: m.profile.pref_language,
    pref_timezone: m.profile.pref_timezone,
    pref_date_format: m.profile.pref_date_format,
    pref_display_density: m.profile.pref_display_density,
    pref_currency: m.profile.pref_currency,
  };
}

export default function ProfilePage() {
  const { refresh: refreshCurrentUser } = useCurrentUser();
  const navigate = useNavigate();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const [prefForm, setPrefForm] = useState<DisplayPreferencesForm | null>(null);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [prefOk, setPrefOk] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdOk, setPwdOk] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [showPwdForm, setShowPwdForm] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [meRes, siteList] = await Promise.all([
        meApi.get(),
        apiServices.sites.list().catch(() => [] as Site[]),
      ]);
      setMe(meRes);
      setForm(meToForm(meRes));
      setPrefForm(meToPrefForm(meRes));
      setSites(siteList);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        clearAccessToken();
        navigate('/login', { replace: true });
        return;
      }
      setLoadError(parseApiError(err, 'Impossible de charger le profil.'));
    }
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFormChange = <K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K],
  ) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setSaveOk(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) {
      return;
    }
    setSaveError(null);
    setSaveOk(false);
    setSaving(true);
    try {
      const updated = await meApi.patch({
        email: form.email.trim(),
        first_name: form.first_name,
        last_name: form.last_name,
        job_title: form.job_title,
        phone: form.phone,
        site: form.site,
      });
      setMe(updated);
      setForm(meToForm(updated));
      setPrefForm(meToPrefForm(updated));
      setSaveOk(true);
      await refreshCurrentUser();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        clearAccessToken();
        navigate('/login', { replace: true });
        return;
      }
      setSaveError(
        parseApiError(err, 'Enregistrement impossible. Vérifiez les champs.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePrefChange = <K extends keyof DisplayPreferencesForm>(
    key: K,
    value: DisplayPreferencesForm[K],
  ) => {
    setPrefForm((f) => (f ? { ...f, [key]: value } : f));
    setPrefOk(false);
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefForm) {
      return;
    }
    setPrefError(null);
    setPrefOk(false);
    setPrefSaving(true);
    try {
      const updated = await meApi.patch({
        pref_language: prefForm.pref_language,
        pref_timezone: prefForm.pref_timezone,
        pref_date_format: prefForm.pref_date_format,
        pref_display_density: prefForm.pref_display_density,
        pref_currency: prefForm.pref_currency,
      });
      setMe(updated);
      setForm(meToForm(updated));
      setPrefForm(meToPrefForm(updated));
      setPrefOk(true);
      await refreshCurrentUser();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        clearAccessToken();
        navigate('/login', { replace: true });
        return;
      }
      setPrefError(
        parseApiError(
          err,
          'Enregistrement des préférences impossible. Réessayez.',
        ),
      );
    } finally {
      setPrefSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdOk(false);
    if (newPassword !== confirmPassword) {
      setPwdError('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }
    if (newPassword.length < 8) {
      setPwdError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setPwdSaving(true);
    try {
      await meApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPwdOk(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refreshCurrentUser();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        clearAccessToken();
        navigate('/login', { replace: true });
        return;
      }
      setPwdError(
        parseApiError(
          err,
          'Impossible de mettre à jour le mot de passe. Réessayez.',
        ),
      );
    } finally {
      setPwdSaving(false);
    }
  };

  if (loadError && !me) {
    return (
      <div className="max-w-2xl">
        <p className="text-error font-sans text-sm" role="alert">
          {loadError}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 text-primary text-sm font-medium underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!me || !form || !prefForm) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-on-surface-variant gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="font-sans">Chargement du profil…</span>
      </div>
    );
  }

  const user = me.user;
  const profile = me.profile;
  const inputClass =
    'w-full bg-surface-container-highest border border-transparent rounded-lg py-2.5 px-3 text-on-surface text-sm font-sans ' +
    'focus:bg-white focus:ring-2 focus:ring-primary/10 focus:outline-none focus:border-outline-variant/50';

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full pb-10">
      <header className="mb-2 md:mb-4">
        <h1 className="font-headline font-bold text-2xl md:text-[1.75rem] text-primary mb-2">
          Mon profil
        </h1>
        <p className="text-on-surface-variant font-sans text-sm max-w-2xl">
          Gérez vos informations personnelles et configurez vos préférences de chantier.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        <div className="lg:col-span-7 space-y-6 md:space-y-8">
          <section
            className={cn(
              'bg-white p-6 md:p-8 rounded-xl border border-slate-100',
              architecturalShadow,
            )}
          >
            <div className="flex items-start gap-4 md:gap-6">
              <div className="relative shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-primary-fixed flex items-center justify-center text-primary font-headline font-bold text-xl md:text-2xl border border-slate-100 shadow-sm">
                  {userInitials(user)}
                </div>
                <span className="absolute -bottom-2 -right-2 p-1.5 bg-primary text-white rounded-lg shadow-lg border-2 border-white">
                  <Pencil className="w-3.5 h-3.5" aria-hidden />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-headline font-bold text-lg md:text-xl text-primary">
                  {userDisplayName(user)}
                </h2>
                <p className="text-slate-600 font-sans text-sm">
                  {profile.job_title || '—'}
                </p>
                {profile.role_label && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary-fixed text-on-primary-fixed rounded-full text-[0.6875rem] font-sans uppercase tracking-widest">
                    {profile.role_label}
                  </div>
                )}
                <p className="text-xs text-on-surface-variant mt-2 font-sans">
                  {user.email}
                </p>
              </div>
            </div>
          </section>

          <form onSubmit={handleSaveProfile}>
            <section
              className={cn('bg-white p-6 md:p-8 rounded-xl', architecturalShadow)}
            >
              <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 shrink-0" />
                Coordonnées professionnelles
              </h3>
              {saveError && (
                <p
                  className="mb-4 text-sm text-error bg-error-container/30 border border-error/20 rounded-lg px-4 py-2"
                  role="alert"
                >
                  {saveError}
                </p>
              )}
              {saveOk && (
                <p
                  className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2"
                  role="status"
                >
                  Modifications enregistrées.
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label
                    className="block text-[0.6875rem] font-sans text-slate-400 uppercase tracking-widest mb-1"
                    htmlFor="profile-email"
                  >
                    E-mail
                  </label>
                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    required
                    autoComplete="email"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label
                    className="block text-[0.6875rem] font-sans text-slate-400 uppercase tracking-widest mb-1"
                    htmlFor="profile-phone"
                  >
                    Téléphone
                  </label>
                  <input
                    id="profile-phone"
                    name="phone"
                    type="tel"
                    className={inputClass}
                    value={form.phone}
                    onChange={(e) => handleFormChange('phone', e.target.value)}
                    autoComplete="tel"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label
                    className="block text-[0.6875rem] font-sans text-slate-400 uppercase tracking-widest mb-1"
                    htmlFor="profile-first"
                  >
                    Prénom
                  </label>
                  <input
                    id="profile-first"
                    name="first_name"
                    type="text"
                    className={inputClass}
                    value={form.first_name}
                    onChange={(e) =>
                      handleFormChange('first_name', e.target.value)
                    }
                    autoComplete="given-name"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label
                    className="block text-[0.6875rem] font-sans text-slate-400 uppercase tracking-widest mb-1"
                    htmlFor="profile-last"
                  >
                    Nom
                  </label>
                  <input
                    id="profile-last"
                    name="last_name"
                    type="text"
                    className={inputClass}
                    value={form.last_name}
                    onChange={(e) => handleFormChange('last_name', e.target.value)}
                    autoComplete="family-name"
                    disabled={saving}
                  />
                </div>
                <div className="md:col-span-2">
                  <label
                    className="block text-[0.6875rem] font-sans text-slate-400 uppercase tracking-widest mb-1"
                    htmlFor="profile-title"
                  >
                    Intitulé de poste
                  </label>
                  <input
                    id="profile-title"
                    name="job_title"
                    type="text"
                    className={inputClass}
                    value={form.job_title}
                    onChange={(e) => handleFormChange('job_title', e.target.value)}
                    autoComplete="organization-title"
                    disabled={saving}
                  />
                </div>
                <div className="md:col-span-2">
                  <span className="block text-[0.6875rem] font-sans text-slate-400 uppercase tracking-widest mb-1">
                    Affectation (site)
                  </span>
                  <div className="flex items-start gap-2 text-on-surface">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-2.5" />
                    <select
                      id="profile-site"
                      name="site"
                      className={inputClass}
                      value={form.site ?? ''}
                      onChange={(e) =>
                        handleFormChange(
                          'site',
                          e.target.value ? (e.target.value as UUID) : null,
                        )
                      }
                      disabled={saving}
                    >
                      <option value="">Aucun site</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.code ? ` (${s.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:opacity-95 disabled:opacity-60 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enregistrement…
                    </>
                  ) : (
                    'Enregistrer'
                  )}
                </button>
              </div>
            </section>
          </form>

          <form onSubmit={handleSavePreferences}>
            <section
              className={cn('bg-white p-6 md:p-8 rounded-xl', architecturalShadow)}
            >
              <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 shrink-0" />
                Préférences d&apos;affichage
              </h3>
              {prefError && (
                <p
                  className="mb-4 text-sm text-error bg-error-container/30 border border-error/20 rounded-lg px-4 py-2"
                  role="alert"
                >
                  {prefError}
                </p>
              )}
              {prefOk && (
                <p
                  className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2"
                  role="status"
                >
                  Préférences enregistrées.
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                <div className="space-y-1">
                  <label
                    className="block text-[0.6875rem] font-sans text-slate-400 uppercase tracking-widest"
                    htmlFor="pref-language"
                  >
                    Langue
                  </label>
                  <select
                    id="pref-language"
                    className={inputClass}
                    value={prefForm.pref_language}
                    onChange={(e) =>
                      handlePrefChange(
                        'pref_language',
                        e.target.value as MePrefLanguage,
                      )
                    }
                    disabled={prefSaving}
                  >
                    {PREF_LANGUAGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label
                    className="block text-[0.6875rem] font-sans text-slate-400 uppercase tracking-widest"
                    htmlFor="pref-tz"
                  >
                    Fuseau horaire
                  </label>
                  <select
                    id="pref-tz"
                    className={inputClass}
                    value={prefForm.pref_timezone}
                    onChange={(e) =>
                      handlePrefChange(
                        'pref_timezone',
                        e.target.value as MePrefTimezone,
                      )
                    }
                    disabled={prefSaving}
                  >
                    {PREF_TIMEZONE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label
                    className="block text-[0.6875rem] font-sans text-slate-400 uppercase tracking-widest"
                    htmlFor="pref-date"
                  >
                    Format de date
                  </label>
                  <select
                    id="pref-date"
                    className={inputClass}
                    value={prefForm.pref_date_format}
                    onChange={(e) =>
                      handlePrefChange(
                        'pref_date_format',
                        e.target.value as MePrefDateFormat,
                      )
                    }
                    disabled={prefSaving}
                  >
                    {PREF_DATE_FORMAT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label
                    className="block text-[0.6875rem] font-sans text-slate-400 uppercase tracking-widest"
                    htmlFor="pref-density"
                  >
                    Densité d&apos;affichage
                  </label>
                  <select
                    id="pref-density"
                    className={inputClass}
                    value={prefForm.pref_display_density}
                    onChange={(e) =>
                      handlePrefChange(
                        'pref_display_density',
                        e.target.value as MePrefDisplayDensity,
                      )
                    }
                    disabled={prefSaving}
                  >
                    {PREF_DENSITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2 max-w-md">
                  <label
                    className="block text-[0.6875rem] font-sans text-slate-400 uppercase tracking-widest"
                    htmlFor="pref-currency"
                  >
                    Devise
                  </label>
                  <select
                    id="pref-currency"
                    className={inputClass}
                    value={prefForm.pref_currency}
                    onChange={(e) =>
                      handlePrefChange(
                        'pref_currency',
                        e.target.value as MePrefCurrency,
                      )
                    }
                    disabled={prefSaving}
                  >
                    {PREF_CURRENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={prefSaving}
                  className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:opacity-95 disabled:opacity-60 flex items-center gap-2"
                >
                  {prefSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enregistrement…
                    </>
                  ) : (
                    'Enregistrer les préférences'
                  )}
                </button>
              </div>
            </section>
          </form>

          <section className={cn('bg-white p-6 md:p-8 rounded-xl', architecturalShadow)}>
            <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
              <HardHat className="w-5 h-5 shrink-0" />
              Préférences Terrain
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 py-2">
                <div>
                  <p className="font-sans font-medium text-on-surface">Scan QR Code automatique</p>
                  <p className="text-[0.6875rem] text-slate-400">
                    Activer l&apos;appareil photo dès l&apos;ouverture de l&apos;inventaire
                  </p>
                </div>
                <ToggleOn />
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <div>
                  <p className="font-sans font-medium text-on-surface">Confirmation mouvement sensible</p>
                  <p className="text-[0.6875rem] text-slate-400">
                    Exiger une validation pour tout mouvement &gt; 5000€
                  </p>
                </div>
                <ToggleOn />
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-5 space-y-6 md:space-y-8">
          <section className="bg-primary text-white p-6 md:p-8 rounded-xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-[0.6875rem] font-sans text-slate-400 uppercase tracking-widest mb-1">
                    Statut du compte
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                    <span className="font-headline font-bold text-lg">Compte actif</span>
                  </div>
                </div>
                <BadgeCheck className="w-9 h-9 opacity-20 shrink-0" aria-hidden />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-white/10 pb-3 gap-2">
                  <span className="text-slate-400 text-sm font-sans">Rôle</span>
                  <span className="font-medium font-sans text-right text-sm">
                    {profile.role_label}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-3 gap-2">
                  <span className="text-slate-400 text-sm font-sans">Dernière connexion</span>
                  <span className="font-medium font-sans text-right text-sm">
                    {formatDateTime(user.last_login)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400 text-sm font-sans">Compte créé le</span>
                  <span className="font-medium font-sans text-right text-sm">
                    {formatDateTime(user.date_joined)}
                  </span>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-container to-primary opacity-50" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          </section>

          <section className={cn('bg-white p-6 md:p-8 rounded-xl', architecturalShadow)}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Shield className="w-5 h-5 shrink-0" />
                Sécurité &amp; Accès
              </h3>
            </div>
            {!showPwdForm ? (
              <button
                type="button"
                onClick={() => {
                  setShowPwdForm(true);
                  setPwdError(null);
                  setPwdOk(false);
                }}
                className="w-full flex items-center justify-between p-4 bg-surface-container-low rounded-lg group hover:bg-surface-container-high transition-all text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <KeyRound className="w-5 h-5 text-slate-500 shrink-0" />
                  <span className="text-sm font-medium truncate">Changer le mot de passe</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-3">
                {pwdError && (
                  <p className="text-sm text-error" role="alert">
                    {pwdError}
                  </p>
                )}
                {pwdOk && (
                  <p className="text-sm text-emerald-700" role="status">
                    Mot de passe mis à jour.
                  </p>
                )}
                <div>
                  <label className="block text-xs text-slate-500 mb-1" htmlFor="old-pw">
                    Mot de passe actuel
                  </label>
                  <input
                    id="old-pw"
                    type="password"
                    className={inputClass}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={pwdSaving}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1" htmlFor="new-pw">
                    Nouveau mot de passe (min. 8 caractères)
                  </label>
                  <input
                    id="new-pw"
                    type="password"
                    className={inputClass}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={pwdSaving}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1" htmlFor="confirm-pw">
                    Confirmer
                  </label>
                  <input
                    id="confirm-pw"
                    type="password"
                    className={inputClass}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={pwdSaving}
                  />
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm text-slate-600"
                    onClick={() => {
                      setShowPwdForm(false);
                      setPwdError(null);
                    }}
                    disabled={pwdSaving}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={pwdSaving}
                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg disabled:opacity-60 flex items-center gap-2"
                  >
                    {pwdSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Enregistrer
                  </button>
                </div>
              </form>
            )}
            <div className="mt-3 flex items-center justify-between p-4 bg-surface-container-low rounded-lg text-left opacity-80">
              <div className="flex items-center gap-3 min-w-0">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Double authentification (2FA)</p>
                  <p className="text-[0.6875rem] text-slate-400">Bientôt disponible</p>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-slate-300 shrink-0" />
            </div>
          </section>

          <section className={cn('bg-white p-6 md:p-8 rounded-xl', architecturalShadow)}>
            <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5 shrink-0" />
              Alertes Inventaire
            </h3>
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-sans">Alerte stock bas</span>
                <ToggleOn />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-sans">Rupture critique immédiate</span>
                <ToggleOn />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-sans">Écart d&apos;inventaire (&gt;5%)</span>
                <ToggleOn />
              </div>
              <div className="flex items-center justify-between gap-3 opacity-50">
                <span className="text-sm font-sans">Rapports hebdomadaires</span>
                <ToggleOff />
              </div>
            </div>
          </section>

          <section className={cn('bg-white p-6 md:p-8 rounded-xl', architecturalShadow)}>
            <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
              <MonitorSmartphone className="w-5 h-5 shrink-0" />
              Sessions actives
            </h3>
            <p className="text-sm text-slate-500 font-sans">
              La gestion des sessions arrive prochainement.
            </p>
            <div className="mt-4 space-y-4 opacity-60">
              <div className="flex items-start gap-4 pb-4 border-b border-slate-50">
                <Laptop className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Cette session (navigateur)</p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 px-0 md:px-2">
            <a
              className="text-[0.6875rem] font-sans text-slate-400 uppercase tracking-widest flex items-center gap-2 hover:text-primary transition-colors"
              href="#"
            >
              <Shield className="w-4 h-4" />
              Politique de confidentialité
            </a>
            <a
              className="text-[0.6875rem] font-sans text-slate-400 uppercase tracking-widest flex items-center gap-2 hover:text-primary transition-colors"
              href="#"
            >
              <Download className="w-4 h-4" />
              Exporter mes données (RGPD)
            </a>
            <p className="text-[0.6875rem] font-sans text-slate-300 uppercase tracking-widest pt-2">
              © 2026 Bâtir Pro. Tous droits réservés.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
