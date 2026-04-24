import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  BellRing,
  CheckCircle2,
  Cloud,
  Database,
  FlaskConical,
  HardHat,
  History,
  Info,
  Lightbulb,
  Loader2,
  Mail,
  MapPin,
  Network,
  Package,
  RotateCcw,
  Ruler,
  Send,
  Shield,
  Terminal,
  Warehouse,
  X,
} from 'lucide-react';

import { useCurrentUser } from '@/context/CurrentUserContext';
import { apiServices, organizationSettingsApi, type SmtpTestPayload } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Integration, OrganizationSettings } from '@/types/api';
import type { UUID } from '@/types/common';

type SmtpEncryption = 'starttls' | 'ssl' | 'none';

/** Form slice for SMTP; SSL and STARTTLS are mutually exclusive in the UI. */
type SmtpFormDraft = {
  smtp_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_use_tls: boolean;
  smtp_use_ssl: boolean;
  smtp_user: string;
  smtp_from_email: string;
};

/** Valeurs par défaut du formulaire SMTP quand aucun `OrganizationSettings` n’est en base. */
const EMPTY_SMTP_DRAFT: SmtpFormDraft = {
  smtp_enabled: false,
  smtp_host: '',
  smtp_port: 587,
  smtp_use_tls: true,
  smtp_use_ssl: false,
  smtp_user: '',
  smtp_from_email: '',
};

function orgToSmtpDraft(row: OrganizationSettings): SmtpFormDraft {
  const ssl = Boolean(row.smtp_use_ssl);
  return {
    smtp_enabled: row.smtp_enabled,
    smtp_host: row.smtp_host ?? '',
    smtp_port: row.smtp_port ?? 587,
    smtp_use_tls: ssl ? false : Boolean(row.smtp_use_tls),
    smtp_use_ssl: ssl,
    smtp_user: row.smtp_user ?? '',
    smtp_from_email: row.smtp_from_email ?? '',
  };
}

function clampedSmtpPortFromDraft(d: SmtpFormDraft): number {
  return Number.isFinite(d.smtp_port) && d.smtp_port >= 1 && d.smtp_port <= 65535
    ? d.smtp_port
    : 587;
}

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
  const { me } = useCurrentUser();
  const [org, setOrg] = useState<OrganizationSettings | null>(null);
  const [orgId, setOrgId] = useState<UUID | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  /** Texte brut renvoyé par le test SMTP (réponse EHLO/HELO du serveur). */
  /**
   * Transcript complet de la session smtplib (banner + EHLO + STARTTLS + AUTH + QUIT, ou sendmail).
   * Les identifiants AUTH sont masqués côté serveur.
   */
  const [smtpDebugLog, setSmtpDebugLog] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingEmailSend, setTestingEmailSend] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [draft, setDraft] = useState<SmtpFormDraft>({
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
  const smtpModalOpenRef = useRef(false);

  const openSmtpModal = () => {
    setFormErr(null);
    setFormMsg(null);
    setSmtpDebugLog(null);
    setSmtpModalOpen(true);
  };

  const closeSmtpModal = () => {
    setSmtpModalOpen(false);
  };

  /**
   * Réinitialise le formulaire aux valeurs enregistrées côté serveur ; à défaut (pas
   * encore de ligne `OrganizationSettings`), retombe sur les défauts vides afin que
   * le bouton soit toujours utile pour « tout effacer » pendant une première config.
   */
  const resetSmtpFormFromServer = () => {
    const next = org ? orgToSmtpDraft(org) : EMPTY_SMTP_DRAFT;
    setDraft(next);
    setSmtpPortText(String(clampedSmtpPortFromDraft(next)));
    setSmtpPassword('');
    setTestEmailTo('');
    setFormErr(null);
    setSmtpDebugLog(null);
    setFormMsg(
      org
        ? 'Formulaire réinitialisé aux valeurs enregistrées.'
        : 'Formulaire remis à zéro.',
    );
  };

  /**
   * Ports « canoniques » (25/465/587). Si le port actuel est l’un d’eux, on le bascule
   * vers celui du nouveau mode — sinon on laisse la valeur saisie à la main (ex. 2525,
   * 1025). Sans ça, la séquence TLS → Aucun (25) → SSL laissait le champ figé à 25
   * parce que chaque branche ne testait qu’une seule valeur de départ.
   */
  const CANONICAL_SMTP_PORTS = new Set([25, 465, 587]);

  const setSmtpEncryption = (mode: SmtpEncryption) => {
    setDraft((d) => {
      const next = { ...d };
      if (mode === 'starttls') {
        next.smtp_use_tls = true;
        next.smtp_use_ssl = false;
      } else if (mode === 'ssl') {
        next.smtp_use_tls = false;
        next.smtp_use_ssl = true;
      } else {
        next.smtp_use_tls = false;
        next.smtp_use_ssl = false;
      }
      if (CANONICAL_SMTP_PORTS.has(d.smtp_port)) {
        next.smtp_port = mode === 'none' ? 25 : mode === 'ssl' ? 465 : 587;
      }
      return next;
    });
  };

  const smtpEnc = smtpEncryptionFromDraft(draft);

  const smtpPortDisplay = clampedSmtpPortFromDraft(draft);

  /** Par défaut selon le mode (aligné sur setSmtpEncryption). */
  const defaultPortForEnc = (enc: SmtpEncryption) =>
    enc === 'none' ? 25 : enc === 'ssl' ? 465 : 587;

  /** Saisie texte : évite les bugs d’<input type="number"> (valeur figée) et lie le vidage au mode. */
  const [smtpPortText, setSmtpPortText] = useState('');

  useLayoutEffect(() => {
    if (!smtpModalOpen) {
      return;
    }
    // Uniquement à l’ouverture ou quand le mode TLS/SSL/Aucun change (pas à chaque frappe de port,
    // sinon l’<input> number contrôlé se bloquait souvent en « Aucun »).
    setSmtpPortText(String(smtpPortDisplay));
    // smtpPortDisplay vient du draft le plus récent au moment de ce rendu
  }, [smtpModalOpen, smtpEnc]);

  const onSmtpPortTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    setSmtpPortText(digits);
    if (digits === '') {
      return;
    }
    const n = parseInt(digits, 10);
    if (Number.isNaN(n)) {
      return;
    }
    setDraft((d) => ({ ...d, smtp_port: Math.min(65535, Math.max(1, n)) }));
  };

  const onSmtpPortTextBlur = () => {
    if (smtpPortText === '') {
      const p = defaultPortForEnc(smtpEnc);
      setSmtpPortText(String(p));
      setDraft((d) => ({ ...d, smtp_port: p }));
    }
  };

  useEffect(() => {
    smtpModalOpenRef.current = smtpModalOpen;
  }, [smtpModalOpen]);

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
        // Ne pas écraser le formulaire (chiffrement, etc.) ni le mot de passe saisi
        // si le chargement initial se termine pendant que le modal est ouvert.
        if (!smtpModalOpenRef.current) {
          setDraft(orgToSmtpDraft(row));
          setSmtpPassword('');
        }
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
    const addr = me?.user.email?.trim();
    if (addr) {
      setTestEmailTo((prev) => (prev.trim() ? prev : addr));
    }
  }, [me?.user.email]);

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
    setSmtpDebugLog(null);
    setSaving(true);
    try {
      const payload: Partial<OrganizationSettings> = { ...draft };
      if (smtpPassword) {
        payload.smtp_password = smtpPassword;
      }
      const updated = await apiServices.organizationSettings.patch(orgId, payload);
      setOrg(updated);
      const nextDraft = orgToSmtpDraft(updated);
      setDraft(nextDraft);
      setSmtpPortText(String(clampedSmtpPortFromDraft(nextDraft)));
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
    setSmtpDebugLog(null);
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
    if (
      draft.smtp_user.trim() &&
      !smtpPassword.trim() &&
      !org?.smtp_has_password
    ) {
      setFormErr(
        'Avec un identifiant SMTP, saisissez le mot de passe d’application pour tester, ou enregistrez d’abord un mot de passe (bouton Enregistrer) pour réutiliser celui stocké.',
      );
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
        smtp_from_email: draft.smtp_from_email.trim(),
      };
      if (smtpPassword.trim()) {
        payload.smtp_password = smtpPassword;
      }
      const res = await organizationSettingsApi.testSmtp(orgId, payload);
      const log = (res.debug_log ?? '').trim();
      setSmtpDebugLog(log || null);
      if (res.success) {
        setFormMsg(res.detail);
      } else {
        setFormErr(res.detail);
      }
    } catch (err) {
      // L'API renvoie aussi debug_log en 400 (ex. échec STARTTLS / AUTH) — on l'affiche.
      if (axios.isAxiosError(err) && err.response?.data) {
        const d = err.response.data as { detail?: unknown; debug_log?: unknown };
        const log = typeof d.debug_log === 'string' ? d.debug_log.trim() : '';
        setSmtpDebugLog(log || null);
        if (d.detail != null) {
          setFormErr(
            typeof d.detail === 'string' ? d.detail : Array.isArray(d.detail) ? d.detail.join(' ') : String(d.detail),
          );
        } else {
          setFormErr('Échec du test de connexion (réponse inattendue).');
        }
      } else {
        setSmtpDebugLog(null);
        setFormErr('Échec du test (réseau ou serveur injoignable).');
      }
    } finally {
      setTesting(false);
    }
  };

  const sendTestSmtpEmail = async () => {
    if (!orgId) {
      return;
    }
    setFormErr(null);
    setFormMsg(null);
    setSmtpDebugLog(null);
    if (!draft.smtp_enabled) {
      setFormErr(
        'Cochez « Activer l’envoi par SMTP » et renseignez l’hôte pour envoyer un e-mail de test.',
      );
      return;
    }
    if (!draft.smtp_host.trim()) {
      setFormErr('Indiquez l’hôte SMTP avant d’envoyer un e-mail de test.');
      return;
    }
    if (!draft.smtp_from_email.trim()) {
      setFormErr(
        'Renseignez l’expéditeur (from) : l’e-mail de test utilise les mêmes champs que le formulaire.',
      );
      return;
    }
    if (
      draft.smtp_user.trim() &&
      !smtpPassword.trim() &&
      !org?.smtp_has_password
    ) {
      setFormErr(
        'Avec un identifiant SMTP, saisissez le mot de passe d’application pour l’e-mail de test, ou enregistrez d’abord un mot de passe (Enregistrer) pour réutiliser celui stocké.',
      );
      return;
    }
    setTestingEmailSend(true);
    try {
      const payload: SmtpTestPayload = {
        smtp_enabled: draft.smtp_enabled,
        smtp_host: draft.smtp_host.trim(),
        smtp_port: draft.smtp_port,
        smtp_use_tls: draft.smtp_use_tls,
        smtp_use_ssl: draft.smtp_use_ssl,
        smtp_user: draft.smtp_user,
        smtp_from_email: draft.smtp_from_email.trim(),
        to_email: testEmailTo.trim() || undefined,
      };
      if (smtpPassword.trim()) {
        payload.smtp_password = smtpPassword;
      }
      const res = await organizationSettingsApi.sendTestSmtpEmail(orgId, payload);
      const log = (res.debug_log ?? '').trim();
      setSmtpDebugLog(log || null);
      if (res.success) {
        setFormMsg(res.detail);
      } else {
        setFormErr(res.detail);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const d = err.response.data as { detail?: unknown; debug_log?: unknown };
        const log = typeof d.debug_log === 'string' ? d.debug_log.trim() : '';
        setSmtpDebugLog(log || null);
        if (d.detail != null) {
          setFormErr(
            typeof d.detail === 'string' ? d.detail : Array.isArray(d.detail) ? d.detail.join(' ') : String(d.detail),
          );
        } else {
          setFormErr('Échec de l’envoi de test (réponse inattendue).');
        }
      } else {
        setSmtpDebugLog(null);
        setFormErr('Échec de l’envoi de test (réseau ou serveur injoignable).');
      }
    } finally {
      setTestingEmailSend(false);
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
          className="fixed inset-0 z-[100] flex items-end justify-center bg-primary/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="presentation"
        >
          <div
            className="absolute inset-0 transition-opacity"
            onClick={closeSmtpModal}
            aria-hidden
          />
          <div
            className="relative z-10 flex max-h-[min(100dvh,920px)] w-full max-w-[840px] flex-col overflow-hidden rounded-t-2xl border border-slate-200/80 bg-[#f7f9fb] shadow-[0_20px_40px_rgba(9,20,38,0.08)] sm:mt-0 sm:rounded-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="smtp-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-slate-200/80 bg-[#f7f9fb] px-6 pb-6 pt-8 sm:px-10 sm:pt-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="smtp-dialog-title"
                    className="font-headline text-xl font-bold tracking-tight text-primary sm:text-2xl"
                  >
                    Intégration e-mail (SMTP)
                  </h2>
                  <p className="mt-1 max-w-lg text-sm leading-relaxed text-slate-500">
                    Configurez l’envoi des e-mails pour les invitations, alertes et réinitialisations de
                    mot de passe. Si cette intégration est désactivée, la configuration du serveur
                    s’applique.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeSmtpModal}
                  className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-200/50 hover:text-primary"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <form
              noValidate
              onSubmit={saveSmtp}
              className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f7f9fb]"
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-8 sm:px-10 sm:pb-10">
                <div className="grid grid-cols-12 gap-8 lg:gap-10">
                  <div className="col-span-12 space-y-8 lg:col-span-7 lg:space-y-10">
                    <div>
                      <div className="flex items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60">
                        <div>
                          <h3 className="text-sm font-bold text-primary">Activer l’envoi d’e-mails</h3>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Requis pour les invitations et la récupération de compte.
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={draft.smtp_enabled}
                          onClick={() =>
                            setDraft((d) => ({ ...d, smtp_enabled: !d.smtp_enabled }))
                          }
                          className={cn(
                            'flex h-6 w-11 shrink-0 items-center rounded-full p-[3px] transition',
                            draft.smtp_enabled ? 'bg-primary' : 'bg-slate-300',
                          )}
                        >
                          <span
                            className={cn(
                              'h-5 w-5 rounded-full bg-white shadow transition',
                              draft.smtp_enabled && 'ml-auto',
                            )}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="border-b border-slate-200 pb-2 font-label text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Serveur SMTP
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label
                            className="mb-2 block text-[11px] font-bold uppercase text-slate-500"
                            htmlFor="smtp-dialog-host"
                          >
                            Serveur SMTP
                          </label>
                          <input
                            id="smtp-dialog-host"
                            name="smtp_host"
                            type="text"
                            autoComplete="off"
                            className="w-full rounded-lg border-0 bg-[#e0e3e5] p-3 text-sm text-slate-800 ring-0 transition focus:bg-white focus:ring-2 focus:ring-primary/30"
                            placeholder="smtp.votre-domaine.bj"
                            value={draft.smtp_host}
                            onChange={(e) => setDraft((d) => ({ ...d, smtp_host: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label
                            className="mb-2 block text-[11px] font-bold uppercase text-slate-500"
                            htmlFor="smtp-dialog-port"
                          >
                            Port
                          </label>
                          <input
                            id="smtp-dialog-port"
                            name="smtp_port"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={5}
                            className="w-full rounded-lg border-0 bg-[#e0e3e5] p-3 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-primary/30"
                            value={smtpPortText}
                            onChange={onSmtpPortTextChange}
                            onBlur={onSmtpPortTextBlur}
                          />
                        </div>
                        <div>
                          <label
                            className="mb-2 block text-[11px] font-bold uppercase text-slate-500"
                            htmlFor="smtp-dialog-security"
                          >
                            Sécurité
                          </label>
                          <select
                            id="smtp-dialog-security"
                            name="smtp_security"
                            className="w-full rounded-lg border-0 bg-[#e0e3e5] p-3 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-primary/30"
                            value={smtpEnc}
                            onChange={(e) =>
                              setSmtpEncryption(e.target.value as SmtpEncryption)
                            }
                          >
                            <option value="starttls">TLS (STARTTLS) — souvent 587</option>
                            <option value="ssl">SSL (SMTPS) — souvent 465</option>
                            <option value="none">Aucun — ex. 25</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-label text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Authentification
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label
                            className="mb-2 block text-[11px] font-bold uppercase text-slate-500"
                            htmlFor="smtp-dialog-user"
                          >
                            Identifiant
                          </label>
                          <input
                            id="smtp-dialog-user"
                            name="smtp_user"
                            type="text"
                            autoComplete="username"
                            className="w-full rounded-lg border-0 bg-[#e0e3e5] p-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary/30"
                            placeholder="Utilisateur ou e-mail"
                            value={draft.smtp_user}
                            onChange={(e) => setDraft((d) => ({ ...d, smtp_user: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label
                            className="mb-2 block text-[11px] font-bold uppercase text-slate-500"
                            htmlFor="smtp-dialog-password"
                          >
                            Mot de passe d’application
                          </label>
                          <input
                            id="smtp-dialog-password"
                            name="smtp_password"
                            type="password"
                            autoComplete="new-password"
                            className="w-full rounded-lg border-0 bg-[#e0e3e5] p-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary/30"
                            placeholder={org?.smtp_has_password ? '•••••••• (inchangé si vide)' : ''}
                            value={smtpPassword}
                            onChange={(e) => setSmtpPassword(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="border-b border-slate-200 pb-2 font-label text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Expéditeur
                      </h3>
                      <div>
                        <label
                          className="mb-2 block text-[11px] font-bold uppercase text-slate-500"
                          htmlFor="smtp-dialog-from"
                        >
                          Adresse (from)
                        </label>
                        <input
                          id="smtp-dialog-from"
                          name="smtp_from_email"
                          type="email"
                          autoComplete="email"
                          className="w-full rounded-lg border-0 bg-[#e0e3e5] p-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary/30"
                          placeholder="notifications@entreprise.bj"
                          value={draft.smtp_from_email}
                          onChange={(e) => setDraft((d) => ({ ...d, smtp_from_email: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-12 space-y-5 lg:col-span-5">
                    <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase text-primary">Statut actuel</span>
                        <span
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                            draft.smtp_enabled && draft.smtp_host.trim()
                              ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                              : 'border-slate-200 bg-slate-100 text-slate-600',
                          )}
                        >
                          {draft.smtp_enabled && draft.smtp_host.trim() ? 'Configuré' : 'Incomplet'}
                        </span>
                      </div>
                      <div className="space-y-3 border-t border-slate-100 pt-3 text-xs">
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Dernière sauvegarde</span>
                          <span className="text-right font-semibold text-slate-800">
                            {org
                              ? new Date(org.updated_at).toLocaleString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-slate-500" />
                        <span className="text-xs font-bold uppercase text-primary">Tester la connexion</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Vérifiez d’abord le protocole, puis l’envoi d’un e-mail de test.
                      </p>
                      <div>
                        <label
                          className="mb-1.5 block text-[11px] font-medium text-slate-500"
                          htmlFor="smtp-dialog-test-to"
                        >
                          Destinataire e-mail de test
                        </label>
                        <input
                          id="smtp-dialog-test-to"
                          name="test_email_to"
                          type="email"
                          className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs focus:ring-2 focus:ring-primary/20"
                          placeholder="Par défaut : votre adresse de connexion"
                          value={testEmailTo}
                          onChange={(e) => setTestEmailTo(e.target.value)}
                          autoComplete="email"
                        />
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          disabled={testing || testingEmailSend || !orgId}
                          onClick={() => void testSmtp()}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-[#e0e3e5] py-2.5 text-xs font-bold text-primary transition hover:bg-slate-300/80 disabled:opacity-50"
                        >
                          {testing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Network className="h-3.5 w-3.5" />
                          )}
                          Connexion
                        </button>
                        <button
                          type="button"
                          disabled={testing || testingEmailSend || !orgId}
                          onClick={() => void sendTestSmtpEmail()}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 py-2.5 text-xs font-bold text-primary transition hover:bg-primary/10 disabled:opacity-50"
                        >
                          {testingEmailSend ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          E-mail de test
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-xl bg-gradient-to-br from-[#091426] to-[#1e293b] p-5 text-white shadow-lg">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-slate-200" />
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-200">
                          Conseils
                        </span>
                      </div>
                      <ul className="space-y-3 text-[11px] leading-relaxed text-slate-300">
                        <li className="flex gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>
                            Préférez un <strong className="text-slate-100">mot de passe d’application</strong>{' '}
                            plutôt que le mot de passe du compte, lorsque le fournisseur le permet.
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>
                            Le port <strong className="text-slate-100">587 (STARTTLS)</strong> est le plus
                            courant ; le <strong className="text-slate-100">465 (SSL)</strong> reste valide
                            selon le fournisseur.
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>
                            Vérifiez <strong className="text-slate-100">SPF / DKIM</strong> côté DNS pour la
                            délivrabilité.
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="col-span-12 space-y-3">
                    {formErr && (
                      <div className="rounded-lg border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-sm text-rose-900">
                        <p className="font-medium">{formErr}</p>
                      </div>
                    )}
                    {formMsg && (
                      <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-900">
                        <p className="font-medium">{formMsg}</p>
                      </div>
                    )}
                    {smtpDebugLog && (
                      <div className="overflow-hidden rounded-xl border border-slate-800/60 bg-slate-950 shadow-[0_10px_30px_rgba(2,6,23,0.25)]">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/80 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Terminal className="h-3.5 w-3.5 text-emerald-300" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
                              Transcription SMTP
                            </span>
                            <span className="text-[10px] text-slate-500">
                              ({smtpDebugLog.split('\n').length} lignes · identifiants masqués)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard?.writeText(smtpDebugLog ?? '');
                            }}
                            className="rounded-md border border-slate-700/80 bg-slate-800/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-200 transition hover:bg-slate-700/80"
                          >
                            Copier
                          </button>
                        </div>
                        <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-[11px] leading-relaxed text-emerald-300">
                          {smtpDebugLog}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200/80 bg-[#eceef0] px-6 py-5 sm:px-10">
                <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={resetSmtpFormFromServer}
                    title={
                      org
                        ? 'Rétablir les valeurs actuellement enregistrées côté serveur'
                        : 'Effacer tous les champs (aucune configuration enregistrée)'
                    }
                    className="inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 transition hover:text-error sm:justify-start"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Réinitialiser
                  </button>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
                    <button
                      type="button"
                      onClick={closeSmtpModal}
                      className="w-full rounded-lg border border-slate-300/80 bg-white px-5 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 sm:w-auto"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !orgId}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#091426] to-[#1e293b] px-7 py-3 text-xs font-bold text-white shadow-md transition active:scale-[0.99] disabled:opacity-50 sm:w-auto"
                    >
                      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Enregistrer la configuration
                    </button>
                  </div>
                </div>
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
