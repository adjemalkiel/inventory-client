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
import type { ApprovalThreshold, Category, Integration, OrganizationSettings, Role, UnitOfMeasure, UserRole } from '@/types/api';
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
  // Section 7 — Valorisation du stock
  const [valuationMethod, setValuationMethod] =
    useState<'last_price' | 'wac' | 'fifo'>('wac');
  const [defaultCurrency, setDefaultCurrency] = useState('XOF');
  const [vatRate, setVatRate] = useState('0');
  const [valuationSaving, setValuationSaving] = useState(false);
  const [valuationMsg, setValuationMsg] = useState<string | null>(null);
  const [valuationErr, setValuationErr] = useState<string | null>(null);
  // Alertes -- seuils configurables
  const [alertEmailEnabled, setAlertEmailEnabled] = useState(true);
  const [alertNotificationEmail, setAlertNotificationEmail] = useState('');
  const [alertLowStockPercent, setAlertLowStockPercent] = useState(15);
  const [alertNewDeliveryEnabled, setAlertNewDeliveryEnabled] = useState(true);
  const [alertPendingHours, setAlertPendingHours] = useState(24);
  const [alertInventoryGapCost, setAlertInventoryGapCost] = useState('50000');
  const [alertAbnormalThreshold, setAlertAbnormalThreshold] = useState('500000');
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertSettingsMsg, setAlertSettingsMsg] = useState<string | null>(null);
  const [alertSettingsErr, setAlertSettingsErr] = useState<string | null>(null);
  const smtpModalOpenRef = useRef(false);

  // Section 10 — Profil de l'organisation
  const [orgProfile, setOrgProfile] = useState({
    company_name: '',
    company_address: '',
    company_city: '',
    company_country: '',
    company_phone: '',
    company_email: '',
    company_website: '',
    company_tax_id: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  // Section 10 — Données de référence (catégories, unités, fournisseurs, sites, agences)
  const [categoriesList, setCategoriesList] = useState<Array<{ id: string; name: string; parent: string | null }>>([]);
  const [unitsList, setUnitsList] = useState<Array<{ id: string; name: string; symbol: string; is_active: boolean }>>([]);
  const [refModalOpen, setRefModalOpen] = useState(false);
  const [refModalType, setRefModalType] = useState<'category' | 'unit'>('category');
  const [refModalEdit, setRefModalEdit] = useState<any | null>(null);
  const [refModalName, setRefModalName] = useState('');
  const [refModalParentId, setRefModalParentId] = useState<string | null>(null);
  const [refModalSymbol, setRefModalSymbol] = useState('');
  const [refModalSaving, setRefModalSaving] = useState(false);
  const [refModalErr, setRefModalErr] = useState<string | null>(null);

  // Section 10 — Workflows d'approbation
  const [approvalThresholds, setApprovalThresholds] = useState<Array<{
    id: string; label: string; movement_scope: string; movement_scope_label: string;
    min_amount: string | null; max_amount: string | null;
    required_role_code: string; is_active: boolean; order: number;
  }>>([]);
  const [atModalOpen, setAtModalOpen] = useState(false);
  const [atModalEdit, setAtModalEdit] = useState<any | null>(null);
  const [atForm, setAtForm] = useState({
    label: '', movement_scope: 'all', min_amount: '', max_amount: '',
    required_role_code: 'chef_chantier', is_active: true, order: 0,
  });
  const [atSaving, setAtSaving] = useState(false);

  // Section 10 — Rôles & Permissions
  const [rolesList, setRolesList] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [userRolesList, setUserRolesList] = useState<Array<{ user: number; role: string }>>([]);

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
        setValuationMethod(row.stock_valuation_method ?? 'wac');
        setDefaultCurrency(row.default_currency ?? 'XOF');
        setVatRate(String(row.vat_rate_percent ?? '0'));
        setAlertEmailEnabled(row.email_alerts_enabled ?? true);
        setAlertNotificationEmail(row.notification_email ?? '');
        setAlertLowStockPercent(row.global_low_stock_threshold_percent ?? 15);
        setAlertNewDeliveryEnabled(row.new_delivery_alerts_enabled ?? true);
        setAlertPendingHours(row.pending_approval_threshold_hours ?? 24);
        setAlertInventoryGapCost(row.inventory_gap_min_cost ?? '50000');
        setAlertAbnormalThreshold(row.abnormal_movement_threshold ?? '500000');
        // Section 10 — Profil organisation
        setOrgProfile({
          company_name: row.company_name ?? '',
          company_address: row.company_address ?? '',
          company_city: row.company_city ?? '',
          company_country: row.company_country ?? '',
          company_phone: row.company_phone ?? '',
          company_email: row.company_email ?? '',
          company_website: row.company_website ?? '',
          company_tax_id: row.company_tax_id ?? '',
        });
        if (row.company_logo) {
          setLogoPreview(row.company_logo);
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

    // Charger données de référence
    try {
      const [cats, units, thresholds, roles, userRoles] = await Promise.all([
        apiServices.categories.list(),
        apiServices.unitsOfMeasure.list(),
        apiServices.approvalThresholds.list().catch(() => [] as ApprovalThreshold[]),
        apiServices.roles.list().catch(() => [] as Role[]),
        apiServices.userRoles.list().catch(() => [] as UserRole[]),
      ]);
      setCategoriesList(cats);
      setUnitsList(units);
      setApprovalThresholds(thresholds);
      setRolesList(roles);
      setUserRolesList(userRoles);
    } catch {
      // Silencieux — les données de référence ne bloquent pas
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

  const saveValuation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      setValuationErr("Aucun enregistrement de paramètres ; contactez l'administrateur.");
      return;
    }
    setValuationErr(null);
    setValuationMsg(null);
    setValuationSaving(true);
    try {
      const updated = await apiServices.organizationSettings.patch(orgId, {
        stock_valuation_method: valuationMethod,
        default_currency: defaultCurrency,
        vat_rate_percent: vatRate,
      } as Partial<OrganizationSettings>);
      setOrg(updated);
      setValuationMethod(updated.stock_valuation_method ?? 'wac');
      setDefaultCurrency(updated.default_currency ?? 'XOF');
      setVatRate(String(updated.vat_rate_percent ?? '0'));
      setValuationMsg('Paramètres de valorisation enregistrés.');
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : "Impossible d'enregistrer les paramètres de valorisation.";
      setValuationErr(msg);
    } finally {
      setValuationSaving(false);
    }
  };

  const saveAlertSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      setAlertSettingsErr("Aucun enregistrement de parametres ; contactez l'administrateur.");
      return;
    }
    setAlertSettingsErr(null);
    setAlertSettingsMsg(null);
    setAlertSaving(true);
    try {
      const updated = await apiServices.organizationSettings.patch(orgId, {
        email_alerts_enabled: alertEmailEnabled,
        notification_email: alertNotificationEmail,
        global_low_stock_threshold_percent: alertLowStockPercent,
        new_delivery_alerts_enabled: alertNewDeliveryEnabled,
        pending_approval_threshold_hours: alertPendingHours,
        inventory_gap_min_cost: alertInventoryGapCost,
        abnormal_movement_threshold: alertAbnormalThreshold,
      } as Partial<OrganizationSettings>);
      setOrg(updated);
      setAlertSettingsMsg('Parametres d\'alerte enregistres.');
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : "Impossible d'enregistrer les parametres d'alerte.";
      setAlertSettingsErr(msg);
    } finally {
      setAlertSaving(false);
    }
  };

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

  // ─── Section 10 — Profil organisation ───────────────────────────────────
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const saveOrgProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setProfileSaving(true);
    setProfileErr(null);
    setProfileMsg(null);
    try {
      const formData = new FormData();
      Object.entries(orgProfile).forEach(([k, v]) => formData.append(k, String(v)));
      if (logoFile) formData.append('company_logo', logoFile);
      const updated = await apiServices.organizationSettings.patchFormData(orgId, formData);
      setOrg(updated);
      setProfileMsg('Profil de l\'organisation enregistré.');
    } catch (err) {
      setProfileErr(
        axios.isAxiosError(err) && err.response?.data?.detail
          ? String(err.response.data.detail)
          : "Impossible d'enregistrer le profil.",
      );
    } finally {
      setProfileSaving(false);
    }
  };

  // ─── Section 10 — Données de référence ──────────────────────────────────
  const openRefModal = (type: 'category' | 'unit', edit?: any) => {
    setRefModalType(type);
    setRefModalEdit(edit ?? null);
    setRefModalName(edit?.name ?? '');
    setRefModalParentId(edit?.parent ?? null);
    setRefModalSymbol(edit?.symbol ?? '');
    setRefModalErr(null);
    setRefModalOpen(true);
  };

  const saveRefItem = async () => {
    if (!refModalName.trim()) {
      setRefModalErr('Le nom est requis.');
      return;
    }
    setRefModalSaving(true);
    setRefModalErr(null);
    try {
      if (refModalType === 'category') {
        if (refModalEdit) {
          await apiServices.categories.patch(refModalEdit.id, { name: refModalName.trim(), parent: refModalParentId });
        } else {
          await apiServices.categories.create({ name: refModalName.trim(), parent: refModalParentId } as any);
        }
        const cats = await apiServices.categories.list();
        setCategoriesList(cats);
      } else {
        if (refModalEdit) {
          await apiServices.unitsOfMeasure.patch(refModalEdit.id, { name: refModalName.trim(), symbol: refModalSymbol.trim() });
        } else {
          await apiServices.unitsOfMeasure.create({ name: refModalName.trim(), symbol: refModalSymbol.trim() } as any);
        }
        const units = await apiServices.unitsOfMeasure.list();
        setUnitsList(units);
      }
      setRefModalOpen(false);
    } catch (err: any) {
      setRefModalErr(
        axios.isAxiosError(err) && err.response?.data
          ? Object.values(err.response.data).flat().join(' ')
          : "Erreur d'enregistrement.",
      );
    } finally {
      setRefModalSaving(false);
    }
  };

  const deleteRefItem = async (type: 'category' | 'unit', id: string) => {
    if (!window.confirm('Supprimer cet élément ?')) return;
    try {
      if (type === 'category') {
        await apiServices.categories.remove(id);
        const cats = await apiServices.categories.list();
        setCategoriesList(cats);
      } else {
        await apiServices.unitsOfMeasure.remove(id);
        const units = await apiServices.unitsOfMeasure.list();
        setUnitsList(units);
      }
    } catch (err: any) {
      alert(
        axios.isAxiosError(err) && err.response?.status === 400
          ? 'Suppression impossible : cet élément est référencé par au moins un article ou un mouvement.'
          : "Erreur lors de la suppression.",
      );
    }
  };

  // ─── Section 10 — Workflows d'approbation ───────────────────────────────
  const openAtModal = (edit?: any) => {
    setAtModalEdit(edit ?? null);
    setAtForm({
      label: edit?.label ?? '',
      movement_scope: edit?.movement_scope ?? 'all',
      min_amount: edit?.min_amount ?? '',
      max_amount: edit?.max_amount ?? '',
      required_role_code: edit?.required_role_code ?? 'chef_chantier',
      is_active: edit?.is_active ?? true,
      order: edit?.order ?? 0,
    });
    setAtModalOpen(true);
  };

  const saveAt = async () => {
    if (!atForm.label.trim()) return;
    setAtSaving(true);
    try {
      if (atModalEdit) {
        await apiServices.approvalThresholds.patch(atModalEdit.id, atForm);
      } else {
        await apiServices.approvalThresholds.create(atForm as any);
      }
      const thresholds = await apiServices.approvalThresholds.list();
      setApprovalThresholds(thresholds);
      setAtModalOpen(false);
    } catch {
      // Erreur silencieuse
    } finally {
      setAtSaving(false);
    }
  };

  const toggleAtActive = async (id: string, is_active: boolean) => {
    try {
      await apiServices.approvalThresholds.patch(id, { is_active: !is_active } as any);
      setApprovalThresholds((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_active: !is_active } : t)),
      );
    } catch { /* silencieux */ }
  };

  const deleteAt = async (id: string) => {
    if (!window.confirm('Supprimer ce seuil ?')) return;
    try {
      await apiServices.approvalThresholds.remove(id);
      setApprovalThresholds((prev) => prev.filter((t) => t.id !== id));
    } catch { /* silencieux */ }
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

          {/* ── Section 10 — Profil de l'organisation ──────────────────── */}
          <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 border-l-4 border-primary">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary mr-4">
                <HardHat className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-headline font-bold text-primary">Profil de l'organisation</h4>
                <p className="text-sm text-slate-500">Informations légales de l'entreprise (affichées sur les exports et les emails).</p>
              </div>
            </div>
            <form className="space-y-6" onSubmit={saveOrgProfile}>
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Logo */}
                <div className="shrink-0">
                  <label className="relative cursor-pointer group block w-28 h-28 rounded-xl border-2 border-dashed border-slate-200 hover:border-primary transition-colors overflow-hidden bg-slate-50">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400 text-xs font-medium text-center px-2">
                        Logo PNG/JPG
                      </div>
                    )}
                    <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleLogoChange} className="hidden" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">Changer</span>
                    </div>
                  </label>
                </div>

                {/* Fields */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Nom légal</label>
                    <input
                      type="text"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      value={orgProfile.company_name}
                      onChange={(e) => setOrgProfile((p) => ({ ...p, company_name: e.target.value }))}
                      placeholder="Raison sociale de l'entreprise"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">RCCM / NIF</label>
                    <input
                      type="text"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      value={orgProfile.company_tax_id}
                      onChange={(e) => setOrgProfile((p) => ({ ...p, company_tax_id: e.target.value }))}
                      placeholder="N° identification fiscale"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Téléphone</label>
                    <input
                      type="text"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      value={orgProfile.company_phone}
                      onChange={(e) => setOrgProfile((p) => ({ ...p, company_phone: e.target.value }))}
                      placeholder="+229 01 23 45 67"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      value={orgProfile.company_email}
                      onChange={(e) => setOrgProfile((p) => ({ ...p, company_email: e.target.value }))}
                      placeholder="contact@entreprise.bj"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Site web</label>
                    <input
                      type="url"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      value={orgProfile.company_website}
                      onChange={(e) => setOrgProfile((p) => ({ ...p, company_website: e.target.value }))}
                      placeholder="https://entreprise.bj"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Adresse</label>
                    <input
                      type="text"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      value={orgProfile.company_address}
                      onChange={(e) => setOrgProfile((p) => ({ ...p, company_address: e.target.value }))}
                      placeholder="Quartier, rue, lot..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Ville</label>
                    <input
                      type="text"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      value={orgProfile.company_city}
                      onChange={(e) => setOrgProfile((p) => ({ ...p, company_city: e.target.value }))}
                      placeholder="Cotonou"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Pays</label>
                    <input
                      type="text"
                      className="w-full h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      value={orgProfile.company_country}
                      onChange={(e) => setOrgProfile((p) => ({ ...p, company_country: e.target.value }))}
                      placeholder="Bénin"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-6 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl shadow-lg hover:bg-primary-container transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {profileSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Enregistrer
                </button>
                {profileMsg && <span className="text-sm font-medium text-emerald-600">{profileMsg}</span>}
                {profileErr && <span className="text-sm font-medium text-error">{profileErr}</span>}
              </div>
            </form>
          </section>

          {/* Categories Section */}
          <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 transition-all hover:translate-y-[-2px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary mr-4">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-headline font-bold text-primary">Catégories d'articles</h4>
                  <p className="text-sm text-slate-500">Structurez votre inventaire par types de ressources.</p>
                </div>
              </div>
              <button
                onClick={() => openRefModal('category')}
                className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-container transition-all"
              >
                + Ajouter
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {categoriesList.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-bold text-sm text-primary">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openRefModal('category', cat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-white transition-colors"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteRefItem('category', cat.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-error hover:bg-white transition-colors"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              {categoriesList.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Aucune catégorie définie.</p>
              )}
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
                <p className="text-sm text-slate-500">Configurez les notifications et les seuils de declenchement.</p>
              </div>
            </div>
            <form className="space-y-4" onSubmit={saveAlertSettings}>
              {/* Email alerts */}
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-primary">Email pour alertes critiques</span>
                  <span className="text-xs text-slate-500">Envoi automatique pour les alertes de severite critique</span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setAlertEmailEnabled(!alertEmailEnabled)}
                    className={cn(
                      'w-10 h-6 rounded-full relative flex items-center px-1 transition-colors',
                      alertEmailEnabled ? 'bg-primary' : 'bg-slate-200',
                    )}
                  >
                    <div className={cn('w-4 h-4 bg-white rounded-full shadow-sm transition-transform', alertEmailEnabled && 'translate-x-4')} />
                  </button>
                </div>
              </div>
              {/* Notification email */}
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-col flex-1 mr-4">
                  <span className="font-bold text-sm text-primary">Email destinataire</span>
                  <span className="text-xs text-slate-500">Adresse de reception des alertes critiques</span>
                </div>
                <input
                  type="email"
                  value={alertNotificationEmail}
                  onChange={(e) => setAlertNotificationEmail(e.target.value)}
                  placeholder="admin@exemple.com"
                  className="w-64 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-primary font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                />
              </div>
              {/* Low stock threshold */}
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-primary">Alerte de Stock Bas Global</span>
                  <span className="text-xs text-slate-500">Notifie quand le stock atteint ce pourcentage du seuil minimum</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={alertLowStockPercent}
                    onChange={(e) => setAlertLowStockPercent(Math.max(1, Math.min(100, Number(e.target.value) || 15)))}
                    className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-primary font-bold text-center focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                  />
                  <span className="text-sm font-bold text-primary">%</span>
                </div>
              </div>
              {/* New delivery alerts */}
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-primary">Alertes nouvelles livraisons</span>
                  <span className="text-xs text-slate-500">Generer une alerte info a chaque reception de livraison</span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setAlertNewDeliveryEnabled(!alertNewDeliveryEnabled)}
                    className={cn(
                      'w-10 h-6 rounded-full relative flex items-center px-1 transition-colors',
                      alertNewDeliveryEnabled ? 'bg-primary' : 'bg-slate-200',
                    )}
                  >
                    <div className={cn('w-4 h-4 bg-white rounded-full shadow-sm transition-transform', alertNewDeliveryEnabled && 'translate-x-4')} />
                  </button>
                </div>
              </div>
              {/* Pending approval threshold */}
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-primary">Delai validation en attente</span>
                  <span className="text-xs text-slate-500">Declenche une alerte si un mouvement reste en attente au-dela de ce delai</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={720}
                    value={alertPendingHours}
                    onChange={(e) => setAlertPendingHours(Math.max(1, Number(e.target.value) || 24))}
                    className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-primary font-bold text-center focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                  />
                  <span className="text-sm font-bold text-primary">heures</span>
                </div>
              </div>
              {/* Inventory gap min cost */}
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-primary">Seuil ecart inventaire (cout)</span>
                  <span className="text-xs text-slate-500">Valeur minimale d'un ajustement perte pour declencher une alerte</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={alertInventoryGapCost}
                    onChange={(e) => setAlertInventoryGapCost(e.target.value)}
                    className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-primary font-bold text-center focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                  />
                  <span className="text-sm font-bold text-primary">XOF</span>
                </div>
              </div>
              {/* Abnormal movement threshold */}
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-primary">Seuil mouvement eleve</span>
                  <span className="text-xs text-slate-500">Valeur minimale d'une sortie pour declencher une alerte</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={alertAbnormalThreshold}
                    onChange={(e) => setAlertAbnormalThreshold(e.target.value)}
                    className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-sm text-primary font-bold text-center focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
                  />
                  <span className="text-sm font-bold text-primary">XOF</span>
                </div>
              </div>
              {/* Save button */}
              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={alertSaving}
                  className="px-6 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl shadow-lg hover:bg-primary-container transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {alertSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Enregistrer
                </button>
                {alertSettingsMsg && (
                  <span className="text-sm font-medium text-emerald-600">{alertSettingsMsg}</span>
                )}
                {alertSettingsErr && (
                  <span className="text-sm font-medium text-error">{alertSettingsErr}</span>
                )}
              </div>
            </form>
          </section>

          {/* ── Section 10 — Workflows d'approbation ─────────────────── */}
          <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 border-l-4 border-primary">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary mr-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-headline font-bold text-primary">Workflows d'approbation</h4>
                <p className="text-sm text-slate-500">
                  Définissez quel rôle doit approuver un mouvement selon sa valeur. La première règle correspondante s'applique.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <th className="text-left py-2 pr-4">#</th>
                    <th className="text-left py-2 pr-4">Type de mouvement</th>
                    <th className="text-right py-2 pr-4">De (XOF)</th>
                    <th className="text-right py-2 pr-4">À (XOF)</th>
                    <th className="text-left py-2 pr-4">Rôle requis</th>
                    <th className="text-center py-2 pr-4">Statut</th>
                    <th className="text-right py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {approvalThresholds.map((t, idx) => (
                    <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-3 pr-4 font-medium text-slate-500">{idx + 1}</td>
                      <td className="py-3 pr-4 font-bold text-primary">{t.movement_scope_label}</td>
                      <td className="py-3 pr-4 text-right">{t.min_amount ?? '0'}</td>
                      <td className="py-3 pr-4 text-right">{t.max_amount ?? '—'}</td>
                      <td className="py-3 pr-4 capitalize">{t.required_role_code.replace(/_/g, ' ')}</td>
                      <td className="py-3 pr-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleAtActive(t.id, t.is_active)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {t.is_active ? '● Actif' : '○ Inactif'}
                        </button>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <button onClick={() => openAtModal(t)} className="text-slate-400 hover:text-primary mr-2" title="Modifier">✏️</button>
                        <button onClick={() => deleteAt(t.id)} className="text-slate-400 hover:text-error" title="Supprimer">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {approvalThresholds.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">Aucun seuil configuré.</p>
              )}
            </div>
            <button
              onClick={() => openAtModal()}
              className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-container transition-all"
            >
              + Ajouter une règle
            </button>
          </section>

          {/* Stock valuation (Section 7) */}
          <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 border-l-4 border-primary">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary mr-4">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-headline font-bold text-primary">Valorisation du stock</h4>
                <p className="text-sm text-slate-500">
                  Méthode utilisée pour figer le coût des sorties vers les chantiers.
                </p>
              </div>
            </div>
            <form className="space-y-4" onSubmit={saveValuation}>
              {(
                [
                  { v: 'last_price' as const, t: "Dernier prix d'achat connu", d: "Simple — chaque sortie au dernier prix payé.", recommended: false },
                  { v: 'wac' as const, t: 'Coût moyen pondéré (CUMP)', d: "Lisse les variations de prix. Standard comptable.", recommended: true },
                  { v: 'fifo' as const, t: 'FIFO / PEPS', d: "Consomme les plus anciens lots d'abord. Traçabilité fine.", recommended: false },
                ]
              ).map((opt) => (
                <label
                  key={opt.v}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    valuationMethod === opt.v
                      ? 'border-primary bg-primary-fixed/40'
                      : 'border-slate-100 hover:border-slate-200 bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="stock_valuation_method"
                    className="mt-1 accent-primary"
                    checked={valuationMethod === opt.v}
                    onChange={() => setValuationMethod(opt.v)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-primary">{opt.t}</span>
                      {opt.recommended ? (
                        <span className="rounded-full bg-primary text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                          Recommandé
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{opt.d}</p>
                  </div>
                </label>
              ))}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                ⚠️ Le changement s'applique aux prochaines sorties. Les coûts déjà figés ne sont pas recalculés.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="font-label mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Devise par défaut
                  </label>
                  <select
                    className="w-full h-12 rounded-xl border border-slate-100 bg-white px-4 font-bold text-primary shadow-sm"
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                  >
                    <option value="XOF">XOF (FCFA)</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="CNY">CNY</option>
                  </select>
                </div>
                <div>
                  <label className="font-label mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Taux de TVA (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full h-12 rounded-xl border border-slate-100 bg-white px-4 font-bold text-primary shadow-sm"
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                  />
                </div>
              </div>
              {valuationMsg ? (
                <p className="text-xs font-bold text-emerald-700">{valuationMsg}</p>
              ) : null}
              {valuationErr ? (
                <p className="text-xs font-bold text-red-700">{valuationErr}</p>
              ) : null}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={valuationSaving}
                  className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-container transition-all disabled:opacity-50"
                >
                  {valuationSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </section>

          {/* Units and Locations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Unités de mesure */}
            <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Ruler className="w-8 h-8 text-primary mb-1" />
                  <h4 className="text-md font-headline font-bold text-primary">Unités de mesure</h4>
                  <p className="text-xs text-slate-500 font-medium">kg, m³, unités...</p>
                </div>
                <button
                  onClick={() => openRefModal('unit')}
                  className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-container transition-all"
                >
                  + Ajouter
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {unitsList.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <span className="font-bold text-sm text-primary">{u.name}</span>
                      {u.symbol && <span className="text-xs text-slate-400 ml-1">({u.symbol})</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openRefModal('unit', u)} className="p-1 rounded text-slate-400 hover:text-primary" title="Modifier">✏️</button>
                      <button onClick={() => deleteRefItem('unit', u.id)} className="p-1 rounded text-slate-400 hover:text-error" title="Supprimer">🗑️</button>
                    </div>
                  </div>
                ))}
                {unitsList.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">Aucune unité définie.</p>
                )}
              </div>
            </section>

            {/* Lieux */}
            <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
              <MapPin className="w-8 h-8 text-primary mb-4" />
              <h4 className="text-md font-headline font-bold text-primary mb-1">Sites & Agences</h4>
              <p className="text-xs text-slate-500 mb-4 font-medium">Dépôts, entrepôts, zones de transit. Gérés depuis <strong>Lieux de stockage</strong>.</p>
              <button
                onClick={() => window.location.href = '/storage'}
                className="text-xs font-bold text-primary underline underline-offset-8 uppercase tracking-widest hover:text-primary-container transition-colors"
              >
                Gérer les lieux
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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-headline font-bold text-primary mb-1">Rôles & Permissions</h4>
                <p className="text-sm text-slate-500">Définissez qui peut voir, modifier ou supprimer les données.</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {rolesList.map((role) => {
                const count = userRolesList.filter((ur) => ur.role === role.id).length;
                return (
                  <div key={role.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-bold text-sm text-primary flex-1">{role.name}</span>
                    <span className="text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full">{count} utilisateur{count > 1 ? 's' : ''}</span>
                  </div>
                );
              })}
              {rolesList.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Aucun rôle configuré.</p>
              )}
            </div>
            <a
              href="/users"
              className="text-xs font-bold text-primary underline underline-offset-8 uppercase tracking-widest hover:text-primary-container transition-colors"
            >
              Gérer les utilisateurs
            </a>
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

      {/* ── Modal référence (catégorie / unité) ──────────────────────── */}
      {refModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-primary/40 backdrop-blur-sm" role="presentation">
          <div className="absolute inset-0" onClick={() => setRefModalOpen(false)} />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 p-6"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-headline text-lg font-bold text-primary mb-4">
              {refModalEdit ? 'Modifier' : 'Ajouter'} {refModalType === 'category' ? 'une catégorie' : 'une unité'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Nom *</label>
                <input
                  type="text"
                  className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={refModalName}
                  onChange={(e) => setRefModalName(e.target.value)}
                  placeholder={refModalType === 'category' ? 'Ex: Quincaillerie' : 'Ex: Kilogramme'}
                />
              </div>
              {refModalType === 'unit' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Symbole</label>
                  <input
                    type="text"
                    className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    value={refModalSymbol}
                    onChange={(e) => setRefModalSymbol(e.target.value)}
                    placeholder="Ex: kg, m³"
                  />
                </div>
              )}
              {refModalType === 'category' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Parent</label>
                  <select
                    className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    value={refModalParentId ?? ''}
                    onChange={(e) => setRefModalParentId(e.target.value || null)}
                  >
                    <option value="">Aucune (catégorie racine)</option>
                    {categoriesList.filter((c) => c.id !== refModalEdit?.id).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {refModalErr && <p className="text-xs font-medium text-error">{refModalErr}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setRefModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-primary transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={saveRefItem}
                  disabled={refModalSaving}
                  className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-container transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {refModalSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {refModalEdit ? 'Modifier' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal seuil d'approbation ────────────────────────────────── */}
      {atModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-primary/40 backdrop-blur-sm" role="presentation">
          <div className="absolute inset-0" onClick={() => setAtModalOpen(false)} />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 p-6"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-headline text-lg font-bold text-primary mb-4">
              {atModalEdit ? 'Modifier' : 'Ajouter'} un seuil d'approbation
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Libellé *</label>
                <input
                  type="text"
                  className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={atForm.label}
                  onChange={(e) => setAtForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Ex: Sortie < 100 000 XOF"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Type de mouvement</label>
                <select
                  className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={atForm.movement_scope}
                  onChange={(e) => setAtForm((f) => ({ ...f, movement_scope: e.target.value }))}
                >
                  <option value="all">Tous les types</option>
                  <option value="sortie">Sortie vers chantier</option>
                  <option value="transfert">Transfert inter-sites</option>
                  <option value="ajustement">Ajustement / perte</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Montant min (XOF)</label>
                  <input
                    type="number"
                    className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    value={atForm.min_amount}
                    onChange={(e) => setAtForm((f) => ({ ...f, min_amount: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Montant max (XOF)</label>
                  <input
                    type="number"
                    className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    value={atForm.max_amount}
                    onChange={(e) => setAtForm((f) => ({ ...f, max_amount: e.target.value }))}
                    placeholder="Illimité"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Rôle requis</label>
                <select
                  className="w-full h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={atForm.required_role_code}
                  onChange={(e) => setAtForm((f) => ({ ...f, required_role_code: e.target.value }))}
                >
                  {rolesList.map((r) => (
                    <option key={r.id} value={r.code}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setAtModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-primary transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={saveAt}
                  disabled={atSaving}
                  className="px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-container transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {atSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {atModalEdit ? 'Modifier' : 'Enregistrer'}
                </button>
              </div>
            </div>
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
