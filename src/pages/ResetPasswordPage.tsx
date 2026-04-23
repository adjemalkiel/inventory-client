import React, { useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  HardHat,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  UserCircle,
  CheckCircle2,
  Circle,
} from 'lucide-react';

import { authApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const glassCard = 'shadow-[0_20px_40px_rgba(9,20,38,0.05)]';

function parseDetail(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const d = err.response.data as { detail?: string };
    if (typeof d.detail === 'string') {
      return d.detail;
    }
  }
  return fallback;
}

function usePasswordRules(pw: string) {
  return useMemo(
    () => ({
      minLen: pw.length >= 8,
      hasUpper: /[A-Z]/.test(pw),
      hasLower: /[a-z]/.test(pw),
      hasDigit: /\d/.test(pw),
      hasSpecial: /[^A-Za-z0-9]/.test(pw),
    }),
    [pw],
  );
}

function RuleRow({
  met,
  label,
}: {
  met: boolean;
  label: string;
}) {
  return (
    <li className="flex items-center gap-3 text-sm text-on-surface-variant">
      {met ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden />
      ) : (
        <Circle className="w-5 h-5 text-outline shrink-0 opacity-50" aria-hidden />
      )}
      <span className={met ? 'text-on-surface' : 'text-on-surface-variant'}>
        {label}
      </span>
    </li>
  );
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid = searchParams.get('uid')?.trim() ?? '';
  const token = searchParams.get('token')?.trim() ?? '';
  const emailParam = searchParams.get('email')?.trim() ?? '';

  const canSubmit = useMemo(
    () => Boolean(uid && token),
    [uid, token],
  );

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rules = usePasswordRules(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword !== confirm) {
      setError('La confirmation ne correspond pas.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Le mot de passe doit respecter les exigences de sécurité (8 caractères minimum).');
      return;
    }
    if (!canSubmit) {
      setError('Lien invalide. Demandez un nouveau e-mail de réinitialisation.');
      return;
    }
    setSaving(true);
    try {
      const res = await authApi.confirmPasswordReset({
        uid,
        token,
        new_password: newPassword,
      });
      setSuccess(res.detail);
      setTimeout(() => navigate('/login', { replace: true }), 2200);
    } catch (err) {
      setError(parseDetail(err, 'Impossible de mettre à jour le mot de passe.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen text-on-surface bg-surface">
      <header className="bg-surface flex justify-between items-center w-full px-6 md:px-10 py-6 border-b border-slate-200/30">
        <div className="flex items-center gap-2 text-primary">
          <HardHat className="w-7 h-7 shrink-0" />
          <span className="text-xl md:text-2xl font-headline font-bold tracking-tight">
            Bâtir Pro
          </span>
        </div>
        <Link
          to="/login"
          className="text-slate-600 font-sans text-sm font-medium hover:text-primary transition-colors"
        >
          Se connecter
        </Link>
      </header>

      <main className="flex-grow flex items-center justify-center px-6 py-12 md:py-20">
        <div className="w-full max-w-[520px]">
          <div
            className={cn(
              'bg-white rounded-xl overflow-hidden border border-slate-100',
              glassCard,
            )}
          >
            <div className="p-8 md:p-12">
              <div className="mb-8 md:mb-10">
                <h1 className="text-primary font-headline text-[1.75rem] font-bold leading-tight mb-3">
                  Définir un nouveau mot de passe
                </h1>
                <p className="text-on-surface-variant font-sans leading-relaxed mb-6 text-sm md:text-base">
                  Choisissez un mot de passe robuste pour sécuriser votre compte.
                </p>
                <div className="bg-surface-container-low px-4 py-3 rounded-lg flex items-center gap-3 min-w-0">
                  <UserCircle
                    className="text-on-secondary-container w-5 h-5 shrink-0"
                    aria-hidden
                  />
                  <span className="text-[11px] md:text-xs font-sans font-medium uppercase tracking-wider text-on-secondary-container truncate">
                    Compte :{' '}
                    {emailParam ||
                      (canSubmit
                        ? 'lié à votre e-mail Bâtir Pro'
                        : 'lien requis — demandez un nouvel e-mail')}
                  </span>
                </div>
              </div>

              {!canSubmit && (
                <p className="text-sm text-error mb-6" role="alert">
                  Lien incomplet ou expiré. Ouvrez le lien reçu par e-mail ou
                  retournez à la connexion pour en demander un nouveau.
                </p>
              )}

              {error && (
                <p
                  className="text-sm text-error bg-error-container/20 border border-error/20 rounded-lg px-4 py-3 mb-6"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {success && (
                <p
                  className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3 mb-6"
                  role="status"
                >
                  {success} Redirection…
                </p>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label
                    className="block text-xs font-sans font-bold uppercase tracking-widest text-on-surface-variant"
                    htmlFor="reset-pw-new"
                  >
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="reset-pw-new"
                      type={showNew ? 'text' : 'password'}
                      autoComplete="new-password"
                      disabled={saving}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-surface-container-highest border-none rounded-lg pl-4 pr-12 py-4 text-primary placeholder:text-outline text-sm focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors p-0.5"
                      aria-label={showNew ? 'Masquer' : 'Afficher le mot de passe'}
                    >
                      {showNew ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    className="block text-xs font-sans font-bold uppercase tracking-widest text-on-surface-variant"
                    htmlFor="reset-pw-confirm"
                  >
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="reset-pw-confirm"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      disabled={saving}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full bg-surface-container-highest border-none rounded-lg pl-4 pr-12 py-4 text-primary placeholder:text-outline text-sm focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors p-0.5"
                      aria-label={
                        showConfirm ? 'Masquer' : 'Afficher la confirmation'
                      }
                    >
                      {showConfirm ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-surface-container-low p-6 rounded-xl space-y-4">
                  <h3 className="text-primary font-headline font-semibold text-sm uppercase tracking-wide">
                    Exigences de sécurité
                  </h3>
                  <ul className="space-y-3">
                    <RuleRow met={rules.minLen} label="Au moins 8 caractères" />
                    <RuleRow met={rules.hasUpper} label="Une majuscule" />
                    <RuleRow met={rules.hasLower} label="Une minuscule" />
                    <RuleRow met={rules.hasDigit} label="Un chiffre" />
                    <RuleRow
                      met={rules.hasSpecial}
                      label="Un caractère spécial"
                    />
                  </ul>
                </div>

                <div className="pt-2 space-y-4">
                  <button
                    type="submit"
                    disabled={saving || !canSubmit}
                    className="w-full bg-primary hover:opacity-95 text-white font-headline font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Mettre à jour le mot de passe
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <Link
                    to="/login"
                    className="w-full block text-center text-primary font-headline font-semibold py-4 px-6 border-2 border-primary/10 hover:border-primary/25 rounded-xl transition-all"
                  >
                    Retour à la connexion
                  </Link>
                </div>
              </form>

              <div className="mt-10 text-center">
                <a
                  className="text-sm text-on-surface-variant hover:text-primary transition-colors underline underline-offset-4 decoration-outline-variant"
                  href="mailto:support@batirpro.bj"
                >
                  Contacter le support
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-surface border-t border-slate-200/20 flex flex-col md:flex-row justify-between items-center w-full px-6 md:px-10 py-8 gap-4">
        <div className="text-slate-500 font-sans uppercase tracking-widest text-[0.6875rem] text-center md:text-left">
          © 2026 Bâtir Pro. L&apos;excellence structurelle.
        </div>
        <div className="flex flex-wrap justify-center gap-6 md:gap-8">
          <a
            className="text-slate-500 font-sans uppercase tracking-widest text-[0.6875rem] hover:text-primary transition-colors"
            href="mailto:support@batirpro.bj"
          >
            Assistance
          </a>
          <a
            className="text-slate-500 font-sans uppercase tracking-widest text-[0.6875rem] hover:text-primary transition-colors"
            href="https://batirpro.bj/confidentialite"
            target="_blank"
            rel="noreferrer"
          >
            Confidentialité
          </a>
          <a
            className="text-slate-500 font-sans uppercase tracking-widest text-[0.6875rem] hover:text-primary transition-colors"
            href="https://batirpro.bj/conditions"
            target="_blank"
            rel="noreferrer"
          >
            Conditions
          </a>
        </div>
      </footer>
    </div>
  );
}
