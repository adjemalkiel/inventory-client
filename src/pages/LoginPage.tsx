import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardHat, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-10 bg-surface">
      <div className="w-full max-w-[1200px] grid grid-cols-1 md:grid-cols-2 bg-white rounded-xl overflow-hidden shadow-2xl min-h-[700px]">
        {/* Illustration Side */}
        <div className="hidden md:flex flex-col justify-between p-16 architectural-gradient relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center">
                <HardHat className="text-white w-6 h-6" />
              </div>
              <span className="font-headline font-bold text-2xl text-white tracking-tight">Bâtir Pro</span>
            </div>
            <h1 className="font-headline text-4xl lg:text-5xl font-semibold text-white leading-tight mb-8">
              L'excellence structurelle pour vos chantiers.
            </h1>
            <p className="text-on-primary-container text-lg leading-relaxed max-w-md">
              Gestion centralisée des stocks, équipements et mouvements pour les professionnels exigeants de la construction.
            </p>
          </div>
          
          <div className="relative z-10 grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <span className="font-sans text-[10px] font-bold text-white/50 tracking-widest uppercase">Précision</span>
              <p className="text-white font-medium">Inventaire en temps réel</p>
            </div>
            <div className="space-y-2">
              <span className="font-sans text-[10px] font-bold text-white/50 tracking-widest uppercase">Fluidité</span>
              <p className="text-white font-medium">Suivi des mouvements</p>
            </div>
          </div>

          <div 
            className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none"
            style={{ 
              backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCZFreANsSqal8jYNCnXkfI-3JC_xKGDJdlg3uCvlFjVQgxb1ETTFWd8G3fevCFP_RTQfldIisiDQ3tnsm6J66QVijOf0rv4WWv7LXjHcLxZi1WARBWmpv2tbyB1F3pwc1DENDgT66y9Djg7CN_H2u-uNe3ilEDPX_zN2Qi0Fxo2ovhn8na2SNZYbbvjd16VQGAjNiLH7nZvVdPzRZEqKzPAdvgvo4uKPIKTBwwnFaSr_qEjF9ePUU8uAk4iwuoLa0UXNtdeiFcIsaK')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              mixBlendMode: 'overlay'
            }}
          />
        </div>

        {/* Form Side */}
        <div className="flex flex-col justify-center p-6 md:p-16 lg:p-24 bg-white">
          <div className="mb-8 md:mb-12">
            <div className="md:hidden flex items-center gap-2 mb-6">
              <HardHat className="text-primary w-6 h-6" />
              <span className="font-headline font-bold text-xl text-primary tracking-tight">Bâtir Pro</span>
            </div>
            <h2 className="font-headline text-2xl md:text-3xl font-bold text-primary mb-3">Se connecter à Bâtir Pro</h2>
            <p className="text-on-surface-variant text-sm md:text-base">Accédez à votre espace de gestion d'inventaire</p>
          </div>

          <form className="space-y-6 md:space-y-8" onSubmit={handleLogin}>
            <div className="relative group">
              <label className="font-sans text-[10px] font-bold text-outline tracking-wider uppercase mb-2 block transition-colors group-focus-within:text-primary" htmlFor="email">
                E-mail professionnel
              </label>
              <div className="relative">
                <input 
                  className="w-full bg-surface-container-highest border-none rounded-lg py-3 md:py-4 px-10 md:px-12 text-on-surface placeholder:text-outline-variant focus:bg-white focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all duration-300 text-sm md:text-base"
                  id="email"
                  type="email"
                  placeholder="nom@entreprise.bj"
                  required
                />
                <Mail className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors w-4 h-4 md:w-5 md:h-5" />
              </div>
            </div>

            <div className="relative group">
              <div className="flex justify-between items-center mb-2">
                <label className="font-sans text-[10px] font-bold text-outline tracking-wider uppercase transition-colors group-focus-within:text-primary" htmlFor="password">
                  Mot de passe
                </label>
                <a className="text-xs md:text-sm font-medium text-primary hover:underline underline-offset-4 transition-all" href="#">
                  Oublié ?
                </a>
              </div>
              <div className="relative">
                <input 
                  className="w-full bg-surface-container-highest border-none rounded-lg py-3 md:py-4 px-10 md:px-12 text-on-surface placeholder:text-outline-variant focus:bg-white focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all duration-300 text-sm md:text-base"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors w-4 h-4 md:w-5 md:h-5" />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 md:w-5 md:h-5 rounded-md border-outline-variant bg-surface-container-highest text-primary focus:ring-primary/20 transition-all" />
                <span className="ml-3 text-xs md:text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">Rester connecté</span>
              </label>
            </div>

            <button 
              type="submit"
              className="w-full architectural-gradient text-white font-semibold py-3 md:py-4 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-400 flex items-center justify-center gap-2"
            >
              <span>Se connecter</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="mt-8 md:mt-12 pt-6 md:pt-8 border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-outline text-center sm:text-left">© 2026 Bâtir Pro. Tous droits réservés.</p>
            <div className="flex items-center gap-4 md:gap-6">
              <a className="text-xs text-outline hover:text-primary transition-colors" href="#">Support</a>
              <a className="text-xs text-outline hover:text-primary transition-colors" href="#">Confidentialité</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
