import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  BellRing,
  Cloud,
  Database,
  HardHat,
  History,
  Loader2,
  Mail,
  MapPin,
  Network,
  Package,
  Ruler,
  Shield,
  Warehouse,
  X,
} from 'lucide-react';

import { apiServices, organizationSettingsApi, type SmtpTestPayload } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Integration, OrganizationSettings } from '@/types/api';
import type { UUID } from '@/types/common';

type SmtpEncryption = 'starttls' | 'ssl' | 'none';

function smtpEncryptionFromDraft(d: {
  smtp_use_tls: boolean;
  smtp_use_ssl: boolean;
}): SmtpEncryption {
  if (d.smtp_use_ssl) {
    return 'ssl';
  }
  if (d.smtp_use_tls) {
    return 'starttls';
  }
  return 'none';
}

export default function SettingsPage() {
  const [org, setOrg] = useState<OrganizationSettings | null>(null);
  const [orgId, setOrgId] = useState<UUID | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [draft, setDraft] = useState({
    smtp_enabled: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_use_tls: true,
    smtp_use_ssl: false,
    smtp_user: '',
    smtp_from_email: '',
  });
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpModalOpen, setSmtpModalOpen] = useState(false);

  const openSmtpModal = () => {
    setFormErr(null);
    setFormMsg(null);
    setSmtpModalOpen(true);
  };

  const closeSmtpModal = () => {
    setSmtpModalOpen(false);
  };

  const setSmtpEncryption = (mode: SmtpEncryption) => {
    setDraft((d) => {
      const next = { ...d };
      if (mode === 'starttls') {
        next.smtp_use_tls = true;
        next.smtp_use_ssl = false;
        if (d.smtp_port === 465) {
          next.smtp_port = 587;
        }
      } else if (mode === 'ssl') {
        next.smtp_use_tls = false;
        next.smtp_use_ssl = true;
        if (d.smtp_port === 587) {
          next.smtp_port = 465;
        }
      } else {
        next.smtp_use_tls = false;
        next.smtp_use_ssl = false;
      }
      return next;
    });
  };

  const smtpEnc = smtpEncryptionFromDraft(draft);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [settingsRows, intRows] = await Promise.all([
        apiServices.organizationSettings.list(),
        apiServices.integrations.list(),
      ]);
      setIntegrations(intRows);
      const row = settingsRows[0] ?? null;
      setOrg(row);
      if (row) {
        setOrgId(row.id);
        const ssl = Boolean(row.smtp_use_ssl);
        setDraft({
          smtp_enabled: row.smtp_enabled,
          smtp_host: row.smtp_host ?? '',
          smtp_port: row.smtp_port ?? 587,
          smtp_use_tls: ssl ? false : Boolean(row.smtp_use_tls),
          smtp_use_ssl: ssl,
          smtp_user: row.smtp_user ?? '',
          smtp_from_email: row.smtp_from_email ?? '',
        });
        setSmtpPassword('');
      } else {
        setOrgId(null);
      }
    } catch (e) {
      setLoadError(
        axios.isAxiosError(e) && e.response?.data?.detail
          ? String(e.response.data.detail)
          : "Impossible de charger les paramètres.",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!smtpModalOpen) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSmtpModalOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [smtpModalOpen]);

  const connectedCount =
    integrations.filter((i) => i.is_connected).length +
    (draft.smtp_enabled && draft.smtp_host.trim() ? 1 : 0);

  const saveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      setFormErr('Aucun enregistrement de paramètres ; contactez l’administrateur.');
      return;
    }
    setFormErr(null);
    setFormMsg(null);
    setSaving(true);
    try {
      const payload: Partial<OrganizationSettings> = { ...draft };
      if (smtpPassword) {
        payload.smtp_password = smtpPassword;
      }
      const updated = await apiServices.organizationSettings.patch(orgId, payload);
      setOrg(updated);
      setSmtpPassword('');
      setFormMsg('Paramètres e-mail enregistrés.');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const d = err.response.data;
        if (typeof d === 'object' && d !== null) {
          const first = Object.values(d).flat().find((v) => typeof v === 'string');
          if (first) {
            setFormErr(first);
            setSaving(false);
            return;
          }
        }
        if (err.response.data?.detail) {
          setFormErr(String(err.response.data.detail));
          setSaving(false);
          return;
        }
      }
      setFormErr("Enregistrement impossible. Vérifiez les champs et réessayez.");
    } finally {
      setSaving(false);
    }
  };

  const testSmtp = async () => {
    if (!orgId) {
      return;
    }
    setFormErr(null);
    setFormMsg(null);
    if (!draft.smtp_enabled) {
      setFormErr(
        'Cochez « Activer l’envoi par SMTP » pour tester la configuration (le test utilise les valeurs du formulaire).',
      );
      return;
    }
    if (!draft.smtp_host.trim()) {
      setFormErr('Indiquez l’hôte SMTP (ex. smtp.fournisseur.com) avant de tester.');
      return;
    }
    setTesting(true);
    try {
      const payload: SmtpTestPayload = {
        smtp_enabled: draft.smtp_enabled,
        smtp_host: draft.smtp_host.trim(),
        smtp_port: draft.smtp_port,
        smtp_use_tls: draft.smtp_use_tls,
        smtp_use_ssl: draft.smtp_use_ssl,
        smtp_user: draft.smtp_user,
      };
      if (smtpPassword) {
        payload.smtp_password = smtpPassword;
      }
      const res = await organizationSettingsApi.testSmtp(orgId, payload);
      if (res.success) {
        setFormMsg(`Réussite — ${res.detail}`);
      } else {
        setFormErr(res.detail);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const d = err.response.data as { detail?: unknown };
        if (d.detail != null) {
          setFormErr(
            typeof d.detail === 'string' ? d.detail : Array.isArray(d.detail) ? d.detail.join(' ') : String(d.detail),
          );
        } else {
          setFormErr('Échec du test de connexion (réponse inattendue).');
        }
      } else {
        setFormErr('Échec du test (réseau ou serveur injoignable).');
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-10 pb-10">
      {/* Header Section */}
      <header className="mb-12">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Configuration Système</p>
        <h2 className="text-4xl font-headline font-bold text-primary tracking-tight">Paramètres</h2>
        <p className="text-on-surface-variant font-body mt-2 leading-relaxed max-w-2xl">
          Gérez les fondations de votre environnement Bâtir Pro, des structures de données aux intégrations intelligentes.
        </p>
      </header>

      {/* Settings Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Configuration Column */}
        <div className="lg:col-span-8 space-y-8">
          {/* Categories Section */}
          <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 transition-all hover:translate-y-[-2px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary mr-4">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-headline font-bold text-primary">Catégories d'articles</h4>
                  <p className="text-sm text-slate-500">Structurez votre inventaire par types de ressources.</p>
                </div>
              </div>
              <button className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-container transition-all">
                Gérer les catégories
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="font-bold text-sm text-primary">Matériaux bruts</span>
                <span className="bg-primary-container/10 text-primary px-2 py-1 rounded text-[10px] font-bold">12 articles</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="font-bold text-sm text-primary">Outillage électroportatif</span>
                <span className="bg-primary-container/10 text-primary px-2 py-1 rounded text-[10px] font-bold">45 articles</span>
              </div>
            </div>
          </section>

          {/* Alert Thresholds Section */}
          <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-error-container flex items-center justify-center text-on-error-container mr-4">
                <BellRing className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-headline font-bold text-primary">Seuils d'alerte</h4>
                <p className="text-sm text-slate-500">Configurez les notifications de stock critique.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-primary">Alerte de Stock Bas Global</span>
                  <span className="text-xs text-slate-500">Notifie l'administrateur quand le stock atteint 15%</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-primary">15%</span>
                  <button className="w-10 h-6 bg-primary rounded-full relative flex items-center px-1">
                    <div className="w-4 h-4 bg-white rounded-full ml-auto shadow-sm"></div>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-primary">Péremption Matériaux</span>
                  <span className="text-xs text-slate-500">Alerte 30 jours avant la date limite</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-primary">30j</span>
                  <button className="w-10 h-6 bg-slate-200 rounded-full relative flex items-center px-1">
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Units and Locations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <Ruler className="w-8 h-8 text-primary mb-4" />
              <h4 className="text-md font-headline font-bold text-primary mb-1">Unités de mesure</h4>
              <p className="text-xs text-slate-500 mb-6 font-medium">m², kg, m³, unités...</p>
              <button className="text-xs font-bold text-primary underline underline-offset-8 uppercase tracking-widest hover:text-primary-container transition-colors">
                Modifier la liste
              </button>
            </section>
            <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <MapPin className="w-8 h-8 text-primary mb-4" />
              <h4 className="text-md font-headline font-bold text-primary mb-1">Lieux</h4>
              <p className="text-xs text-slate-500 mb-6 font-medium">Dépôts, entrepôts, zones de transit.</p>
              <button className="text-xs font-bold text-primary underline underline-offset-8 uppercase tracking-widest hover:text-primary-container transition-colors">
                Configurer les zones
              </button>
            </section>
          </div>
        </div>

        {/* Specialized Column */}
        <div className="lg:col-span-4 space-y-8">
          {/* AI Settings Card */}
          <section className="bg-primary text-white rounded-2xl p-8 overflow-hidden relative shadow-xl">
            <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center px-2 py-1 bg-white/10 rounded text-[10px] font-bold tracking-widest uppercase mb-6 backdrop-blur-md border border-white/10">
                Smart Core
              </div>
              <h4 className="text-xl font-headline font-bold mb-2">Paramètres IA</h4>
              <p className="text-sm text-slate-300 leading-relaxed mb-8">
                Optimisez les prédictions de stock et l'automatisation des commandes via l'intelligence artificielle.
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <span className="text-sm font-medium">Analyse prédictive</span>
                  <span className="text-[10px] font-bold text-primary-fixed">ACTIF</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <span className="text-sm font-medium">Rapports automatiques</span>
                  <span className="text-[10px] font-bold text-slate-500">INACTIF</span>
                </div>
              </div>
              <button className="w-full mt-8 py-3 bg-white text-primary font-bold rounded-xl text-sm hover:bg-slate-100 transition-all active:scale-95">
                Configurer l'IA
              </button>
            </div>
          </section>

          {/* Roles & Security */}
          <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 border-l-4 border-primary">
            <h4 className="text-lg font-headline font-bold text-primary mb-2">Rôles & Permissions</h4>
            <p className="text-sm text-slate-500 mb-6">Définissez qui peut voir, modifier ou supprimer les données.</p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold text-primary">Administrateurs (3)</span>
              </div>
              <div className="flex items-center gap-3">
                <HardHat className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold text-primary">Chefs de chantier (12)</span>
              </div>
              <div className="flex items-center gap-3">
                <Warehouse className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold text-primary">Magasiniers (5)</span>
              </div>
            </div>
          </section>

          {/* Integrations + SMTP e-mail */}
          <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-headline font-bold text-primary">Intégrations</h4>
              <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">
                {connectedCount} CONNECTÉE{connectedCount > 1 ? 'S' : ''}
              </span>
            </div>
            {loadError && (
              <p className="text-sm text-error mb-4">{loadError}</p>
            )}
            <p className="text-xs text-slate-500 mb-3">
              Cliquez sur l’icône e-mail pour configurer l’envoi SMTP (mots de passe oubliés, etc.).
            </p>
            <div className="grid grid-cols-4 gap-3 mb-2">
              <button
                type="button"
                onClick={openSmtpModal}
                className={cn(
                  'aspect-square rounded-xl flex items-center justify-center border transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2',
                  draft.smtp_enabled && draft.smtp_host.trim()
                    ? 'bg-primary-container text-white border-primary-container cursor-pointer shadow-sm hover:opacity-95'
                    : 'bg-slate-50 text-slate-400 border-slate-100 cursor-pointer hover:bg-slate-100 hover:border-slate-200',
                )}
                title="Configurer l’e-mail (SMTP)"
                aria-label="Ouvrir la configuration SMTP"
                aria-haspopup="dialog"
                aria-expanded={smtpModalOpen}
              >
                <Mail className="w-5 h-5" />
              </button>
              <div
                className="aspect-square flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50 opacity-60 grayscale"
                title="Bientôt disponible"
                aria-hidden
              >
                <Cloud className="h-5 w-5 text-slate-400" />
              </div>
              <div
                className="aspect-square flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50 opacity-60 grayscale"
                title="Bientôt disponible"
                aria-hidden
              >
                <Network className="h-5 w-5 text-slate-400" />
              </div>
              <div
                className="aspect-square flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50 opacity-60 grayscale"
                title="Bientôt disponible"
                aria-hidden
              >
                <Database className="h-5 w-5 text-slate-400" />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Action Footer */}
      {smtpModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4"
          role="presentation"
        >
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] transition-opacity"
            onClick={closeSmtpModal}
            aria-hidden
          />
          <div
            className="relative z-10 flex w-full sm:max-w-lg max-h-[min(100dvh,720px)] flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-slate-100 sm:mt-0 mt-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="smtp-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3
                    id="smtp-dialog-title"
                    className="font-headline text-lg font-bold text-primary truncate"
                  >
                    E-mail (SMTP)
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    E-mails transactionnels ; désactivé = configuration du serveur.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeSmtpModal}
                className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={saveSmtp}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6"
            >
              <div className="space-y-3 pb-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={draft.smtp_enabled}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, smtp_enabled: e.target.checked }))
                    }
                  />
                  <span className="text-sm font-medium text-primary">Activer l’envoi par SMTP</span>
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hôte</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="smtp.example.com"
                      value={draft.smtp_host}
                      onChange={(e) => setDraft((d) => ({ ...d, smtp_host: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Port</label>
                    <input
                      type="number"
                      min={1}
                      max={65535}
                      className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={draft.smtp_port}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, smtp_port: Number(e.target.value) || 587 }))
                      }
                    />
                  </div>
                  <div className="relative z-20 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Chiffrement
                    </p>
                    <p className="text-xs text-slate-500">Un seul mode à la fois (boutons, pas de cases à cocher).</p>
                    <div
                      className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                      role="radiogroup"
                      aria-label="Chiffrement SMTP"
                    >
                      {(
                        [
                          { mode: 'starttls' as const, label: 'STARTTLS', hint: 'souvent 587' },
                          { mode: 'ssl' as const, label: 'SSL (SMTPS)', hint: 'souvent 465' },
                          { mode: 'none' as const, label: 'Aucun', hint: 'ex. 25' },
                        ] as const
                      ).map(({ mode, label, hint }) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setSmtpEncryption(mode)}
                          className={cn(
                            'flex min-h-11 w-full flex-col items-center justify-center gap-0.5 rounded-xl border px-2 py-2.5 text-center transition-all',
                            smtpEnc === mode
                              ? 'border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]',
                          )}
                          aria-pressed={smtpEnc === mode}
                        >
                          <span className="text-sm font-bold leading-tight">{label}</span>
                          <span
                            className={cn(
                              'text-[10px] font-medium',
                              smtpEnc === mode ? 'text-primary/80' : 'text-slate-400',
                            )}
                          >
                            {hint}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Utilisateur
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={draft.smtp_user}
                      onChange={(e) => setDraft((d) => ({ ...d, smtp_user: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Mot de passe
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder={org?.smtp_has_password ? '•••••••• (inchangé si vide)' : ''}
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Expéditeur (from)
                    </label>
                    <input
                      type="email"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      placeholder="noreply@example.com"
                      value={draft.smtp_from_email}
                      onChange={(e) => setDraft((d) => ({ ...d, smtp_from_email: e.target.value }))}
                    />
                  </div>
                </div>
                {formErr && <p className="text-sm text-error">{formErr}</p>}
                {formMsg && (
                  <p className="text-sm font-medium text-green-800 bg-green-50 border border-green-200/80 rounded-lg px-3 py-2">
                    {formMsg}
                  </p>
                )}
              </div>
              <div className="sticky bottom-0 -mx-5 flex flex-wrap gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:-mx-6 sm:px-6">
                <button
                  type="button"
                  onClick={closeSmtpModal}
                  className="px-4 py-2.5 text-sm font-bold text-slate-600 rounded-xl border border-slate-200 hover:bg-slate-50"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  disabled={testing || !orgId}
                  onClick={() => void testSmtp()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-sm font-bold rounded-xl text-primary hover:bg-slate-50 disabled:opacity-50"
                >
                  {testing && <Loader2 className="w-4 h-4 animate-spin" />}
                  Tester la connexion
                </button>
                <button
                  type="submit"
                  disabled={saving || !orgId}
                  className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-container disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="mt-16 flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-slate-200 gap-6">
        <div className="flex items-center gap-2 text-slate-500">
          <History className="w-4 h-4" />
          <span className="text-xs italic font-medium">Dernière modification : Aujourd'hui à 14:32 par J. Dossou</span>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-primary transition-colors">
            Réinitialiser
          </button>
          <button className="flex-1 sm:flex-none px-8 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-lg hover:bg-primary-container transition-all active:scale-95">
            Enregistrer les modifications
          </button>
        </div>
      </footer>
    </div>
  );
}
