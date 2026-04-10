import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  MailCheck
} from 'lucide-react';

export default function NewUserPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Magasinier',
    site: 'Dépôt Cotonou',
    function: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Inviting new user:', formData);
    navigate('/users');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/users')}
            className="p-2 hover:bg-surface-container rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-primary tracking-tight font-headline">Inviter un collaborateur</h2>
            <p className="text-on-surface-variant text-sm">Ajoutez un nouvel utilisateur et définissez ses droits d'accès.</p>
          </div>
        </div>
      </div>

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
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Adresse email professionnelle</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="email"
                    required
                    placeholder="Ex: j.dossou@batirpro.bj"
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                    >
                      <option>Administrateur</option>
                      <option>Magasinier</option>
                      <option>Chef de chantier</option>
                      <option>Consultant</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Site de rattachement</label>
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <select 
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all appearance-none"
                      value={formData.site}
                      onChange={(e) => setFormData({...formData, site: e.target.value})}
                    >
                      <option>Dépôt Cotonou</option>
                      <option>Dépôt Parakou</option>
                      <option>Chantier Porto-Novo</option>
                      <option>Dépôt Bohicon</option>
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
                  onChange={(e) => setFormData({...formData, function: e.target.value})}
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
                    <p className="text-sm text-slate-500">Ajoutez un collaborateur et définissez son périmètre d'accès.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/users')}
                  className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                  aria-label="Fermer"
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
                  <p className="text-primary font-bold">Analyse de cohérence IA terminée</p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-1">
                    Toutes les informations sont cohérentes. Le rôle est aligné avec le périmètre choisi.
                  </p>
                  <p className="mt-2 text-xs font-semibold text-emerald-600">Prêt pour l'envoi</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Eye className="w-4 h-4" />
                    <p className="text-xs font-bold uppercase tracking-widest">Résumé de l'invitation</p>
                  </div>
                  <button type="button" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                    Modifier
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Collaborateur</p>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-primary flex items-center justify-center text-xs font-bold">
                          {formData.name ? formData.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() : 'CK'}
                        </div>
                        <div>
                          <p className="font-semibold text-primary">{formData.name || 'Clarisse Kouton'}</p>
                          <p className="text-sm text-slate-500">{formData.email || 'clarisse.kouton@batirpro-bj.com'}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Coordonnées</p>
                      <p className="mt-3 text-sm font-semibold text-primary">+229 01 90 00 00 00</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Rôle & fonction</p>
                      <p className="mt-2 text-primary font-semibold">{formData.role || 'Magasinier principal'}</p>
                      <p className="text-sm text-slate-500">{formData.function || 'Service : Logistique chantier'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Site & périmètre</p>
                      <p className="mt-2 text-primary font-semibold">{formData.site || 'Dépôt principal'}</p>
                      <p className="text-sm text-slate-500">Accès complet à l'inventaire site</p>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-emerald-600">Notification d'invitation prête</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <MailCheck className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-slate-600">
                  {formData.name || 'Ce collaborateur'} recevra un e-mail contenant un lien sécurisé pour activer son compte.
                </p>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-primary transition-colors"
              >
                Précédent
              </button>
              <button 
                type="submit"
                className="px-6 py-3 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/25"
              >
                <span>Envoyer l'invitation</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
