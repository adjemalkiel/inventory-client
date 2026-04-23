import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  HardHat,
  Mail,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Headphones,
  CheckCircle2,
} from 'lucide-react';

import { authApi } from '@/lib/api';

const FORGOT_HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC5jUHLs8WbFc4D1GYTr_vYqbYw6wiltrafIIeK46Cql3bArMbBnMNiTg7scAxT7mYH_J5xAbl-UIU9ymNiGDsPsviNDuGLqALbDew0ZcYY9WJXIq13P-ioP7pk9He_ZadwSVPWyn5vPCOG7k1j_yj5vC00UJJacaub3fbhz4xcymTTTgk0K9mVuPO2awapgiuVcZrdCAoZydZxonkGy4ZHTmSeFoUAgtXcqefZkrtCqTWZGwsVOdubvGTBYexACQPmyWQMY_EOAMF5';

function parseApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data) {
    const d = err.response.data as { detail?: string | string[] };
    if (typeof d.detail === 'string') {
      return d.detail;
    }
  }
  return fallback;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      const res = await authApi.requestPasswordReset({ email: email.trim() });
      setSuccessMessage(res.detail);
      setSuccess(true);
    } catch (err) {
      setError(
        parseApiError(
          err,
          'Envoi impossible. Vérifiez votre connexion et réessayez.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-surface text-on-surface antialiased">
      {/* Left — architectural panel */}
      <section
        className="md:w-5/12 min-h-[320px] md:min-h-screen text-white p-10 md:p-20 flex flex-col justify-between relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(9, 20, 38, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%), url(${FORGOT_HERO_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12 md:mb-24">
            <div className="w-10 h-10 bg-white flex items-center justify-center rounded-xl">
              <HardHat className="text-primary w-6 h-6" />
            </div>
            <span className="font-headline font-bold text-2xl tracking-tight">
              Bâtir Pro
            </span>
          </div>
          <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-6 text-white">
            Récupération d&apos;accès sécurisée
          </h1>
          <p className="text-on-primary-container text-base md:text-lg max-w-md leading-relaxed mb-10 md:mb-12">
            Recevez un lien de réinitialisation pour retrouver l&apos;accès à
            votre espace de gestion de chantier.
          </p>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="font-headline font-semibold text-white">Sécurité</p>
                <p className="text-on-primary-container text-sm">
                  Vérification et lien à usage limité pour protéger vos données.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="mt-1 shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="font-headline font-semibold text-white">Rapidité</p>
                <p className="text-on-primary-container text-sm">
                  Réinitialisation complète en quelques instants, une fois le
                  lien reçu.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative z-10 pt-8 md:pt-20">
          <p className="text-xs font-sans uppercase tracking-widest text-on-primary-container">
            Bâtir Pro — Récupération d&apos;accès
          </p>
        </div>
      </section>

      {/* Right — form (template) */}
      <section className="md:w-7/12 flex flex-col justify-center items-center p-6 md:p-20">
        <div className="w-full max-w-md">
          <header className="mb-8 md:mb-10">
            <h2 className="font-headline text-2xl md:text-3xl font-bold text-primary mb-3">
              Réinitialiser votre mot de passe
            </h2>
            <p className="text-on-surface-variant leading-relaxed text-sm md:text-base">
              Saisissez votre adresse e-mail professionnelle. Nous vous enverrons
              un lien sécurisé lorsque le service e-mail est configuré.
            </p>
          </header>

          {success && successMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800 leading-snug">
                {successMessage}
              </p>
            </div>
          )}

          {error && (
            <div
              className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <div className="flex justify-between items-center gap-2">
                <label
                  className="font-sans text-xs font-bold uppercase tracking-wider text-on-surface-variant"
                  htmlFor="forgot-email"
                >
                  E-mail professionnel
                </label>
              </div>
              <div className="relative group">
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={submitting || success}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-5 pr-12 py-4 bg-surface-container-highest rounded-xl text-primary font-medium placeholder:text-outline border-none focus:ring-2 focus:ring-primary focus:bg-white transition-all duration-300 outline-none text-sm md:text-base"
                  placeholder="nom@entreprise.bj"
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary" />
              </div>
              <p className="text-xs text-on-surface-variant/80 italic">
                Utilisez l&apos;adresse associée à votre compte Bâtir Pro.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || success}
              className="w-full py-4 md:py-5 architectural-gradient text-white font-headline font-bold rounded-xl shadow-lg shadow-primary/10 hover:shadow-xl active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:pointer-events-none"
            >
              <span>
                {submitting
                  ? 'Envoi en cours…'
                  : 'Envoyer le lien de réinitialisation'}
              </span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <nav className="mt-8 md:mt-10 flex flex-col items-center gap-4 border-t border-surface-container-highest pt-8">
            <Link
              to="/login"
              className="flex items-center gap-2 text-primary font-semibold hover:opacity-90 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
            <a
              className="text-sm text-on-surface-variant hover:text-primary transition-colors underline underline-offset-4 decoration-outline-variant"
              href="mailto:support@batirpro.bj"
            >
              Contacter le support
            </a>
          </nav>

          <footer className="mt-16 md:mt-20 text-center space-y-4">
            <p className="text-xs text-outline font-sans">
              © 2026 Bâtir Pro. Tous droits réservés.
            </p>
            <div className="flex justify-center gap-6">
              <a
                className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
                href="#"
              >
                Support
              </a>
              <a
                className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
                href="#"
              >
                Confidentialité
              </a>
            </div>
          </footer>
        </div>
      </section>

      <div className="fixed bottom-8 right-8 hidden md:block z-20">
        <a
          href="mailto:support@batirpro.bj"
          className="bg-white shadow-[0_20px_40px_rgba(9,20,38,0.1)] w-14 h-14 rounded-full flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-300 border border-surface-container-high"
          aria-label="Contacter le support"
        >
          <Headphones className="w-6 h-6" />
        </a>
      </div>
    </div>
  );
}
