import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Building2,
  Info,
  UserPlus,
  Sparkles,
  Eye,
  CheckCircle2,
  X,
  MailCheck,
  Loader2,
} from 'lucide-react';

import { apiServices } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Site, UserProfileRole } from '@/types/api';
import type { UUID } from '@/types/common';

const ROLE_OPTIONS: { value: UserProfileRole; label: string }[] = [
  { value: 'administrateur', label: 'Administrateur' },
  { value: 'magasinier', label: 'Magasinier' },
  { value: 'chef_chantier', label: 'Chef de chantier' },
  { value: 'consultant', label: 'Consultant' },
];

function splitFullName(name: string): { first: string; last: string } {
  const t = name.trim();
  if (!t) {
    return { first: '', last: '' };
  }
  const parts = t.split(/\s+/);
  if (parts.length === 1) {
    return { first: parts[0] ?? '', last: '' };
  }
  return { first: parts[0] ?? '', last: parts.slice(1).join(' ') };
}

export default function NewUserPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'magasinier' as UserProfileRole,
    siteId: '' as '' | UUID,
    function: '',
  });
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadSitesError, setLoadSitesError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    void apiServices.sites
      .list()
      .then(setSites)
      .catch(() => setLoadSitesError('Impossible de charger la liste des sites.'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setLoading(true);
    try {
      const { first, last } = splitFullName(formData.name);
      const res = await apiServices.users.invite({
        email: formData.email.trim(),
        first_name: first,
        last_name: last,
        role: formData.role,
        site: formData.siteId || null,
        job_title: formData.function.trim(),
      });
      if (res.invitation_email_sent === false) {
        window.alert(
          "Compte créé, mais l’e-mail d’invitation n’a pas pu être envoyé. " +
            "Vérifiez la configuration SMTP (Paramètres) ou la console du serveur Django en développement.",
        );
      }
      navigate('/users');
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

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="p-2 hover:bg-surface-container rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-primary tracking-tight font-headline">Inviter un collaborateur</h2>
            <p className="text-on-surface-variant text-sm">Ajoutez un nouvel utilisateur et définissez ses droits d&apos;accès.</p>
          </div>
        </div>
      </div>

      {loadSitesError && (
        <p className="text-sm text-error bg-error/5 border border-error/20 rounded-xl px-4 py-3">{loadSitesError}</p>
      )}
      {submitError && (
        <p className="text-sm text-error bg-error/5 border border-error/20 rounded-xl px-4 py-3">{submitError}</p>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-[1.05fr_1.35fr] gap-8">
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-surface-container-high space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-surface-dim/10">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Info className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-headline font-bold text-lg text-primary">Profil utilisateur</h3>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Nom complet</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Jean Dossou"
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Adresse e-mail professionnelle</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input
                    type="email"
                    required
                    placeholder="Ex: j.dossou@batirpro.bj"
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Rôle système</label>
                  <div className="relative group">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <select
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all appearance-none"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserProfileRole })}
                      disabled={loading}
                    >
                      {ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Site de rattachement</label>
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <select
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all appearance-none"
                      value={formData.siteId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          siteId: (e.target.value || '') as '' | UUID,
                        })
                      }
                      disabled={loading}
                    >
                      <option value="">— Tous les sites / aucun —</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Fonction exacte</label>
                <input
                  type="text"
                  placeholder="Ex: Responsable logistique"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                  value={formData.function}
                  onChange={(e) => setFormData({ ...formData, function: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-2xl text-primary">Inviter un utilisateur</h3>
                    <p className="text-sm text-slate-500">Un e-mail d&apos;invitation avec un lien pour définir le mot de passe sera envoyé.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/users')}
                  className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                  aria-label="Fermer"
                  disabled={loading}
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="mt-6">
                <div className="grid grid-cols-3 items-center text-[11px] font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Collaborateur</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Rôle & accès</span>
                  </div>
                  <div className="flex items-center gap-2 text-primary justify-end">
                    <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] inline-flex items-center justify-center">3</span>
                    <span>Révision</span>
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-r from-emerald-500 via-emerald-500 to-primary rounded-full" />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 bg-white">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-primary font-bold">Prochaine étape</p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-1">
                    Après envoi, la personne reçoit un message avec le rôle, le site et un bouton pour choisir son mot de passe (même principe qu&apos;une réinitialisation).
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Eye className="w-4 h-4" />
                    <p className="text-xs font-bold uppercase tracking-widest">Résumé de l&apos;invitation</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Collaborateur</p>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-primary flex items-center justify-center text-xs font-bold">
                          {formData.name
                            ? formData.name
                                .split(/\s+/)
                                .map((p) => p[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()
                            : '·'}
                        </div>
                        <div>
                          <p className="font-semibold text-primary">{formData.name || '—'}</p>
                          <p className="text-sm text-slate-500">{formData.email || '—'}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Rôle</p>
                      <p className="mt-2 text-sm font-semibold text-primary">
                        {ROLE_OPTIONS.find((r) => r.value === formData.role)?.label ?? formData.role}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Fonction</p>
                      <p className="mt-2 text-slate-700">{formData.function || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Site</p>
                      <p className="mt-2 text-primary font-semibold">
                        {formData.siteId
                          ? (sites.find((s) => s.id === formData.siteId)?.name ?? '—')
                          : 'Aucun (tous sites)'}
                      </p>
                    </div>
                  </div>

                  <p className={cn('text-xs font-semibold', formData.email ? 'text-emerald-600' : 'text-slate-400')}>
                    {formData.email
                      ? "Notification d'invitation : e-mail prêt à l'envoi"
                      : 'Saisissez un e-mail pour inviter'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <MailCheck className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-slate-600">
                  {formData.name || 'Le collaborateur'} recevra un e-mail contenant un lien sécurisé pour définir son mot de passe.
                </p>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 bg-white">
              <button
                type="button"
                onClick={() => navigate('/users')}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-primary transition-colors order-2 sm:order-1"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/25 order-1 sm:order-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {loading ? "Envoi…" : "Envoyer l'invitation"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
