import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Rocket, 
  Info, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Clock, 
  ArrowRight, 
  Bot, 
  ClipboardCheck, 
  Package,
  Truck,
  HardHat,
  ChevronDown,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: 'Résidence Les Alizés - Phase 2',
    reference: 'REF-2024-001',
    type: 'Résidentiel Collectif',
    client: '',
    status: 'En cours de création',
    priority: 'Haute',
    description: '',
    address: '15 Avenue des Artisans',
    city: 'Cotonou',
    startDate: '',
    endDate: '2023-12-01',
    center: 'Agence Littoral Nord',
    manager: 'Marc Vasseur',
    budget: '1250000',
    maxStaff: '45',
    criticality: 'Standard',
    trackingMode: 'progress'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Saving new project:', formData);
    navigate('/projects');
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-16">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-4xl md:text-[3.5rem] font-extrabold text-primary tracking-tight leading-none mb-4 font-headline">Nouveau Projet</h1>
          <p className="text-on-primary-container max-w-2xl text-lg">
            Créez un nouveau chantier et définissez ses informations principales, ses responsables et ses paramètres de suivi.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 mb-2">
          <button 
            onClick={() => navigate('/projects')}
            className="px-6 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-all"
          >
            Annuler
          </button>
          <button className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-white transition-all shadow-sm">
            Enregistrer comme brouillon
          </button>
          <button 
            onClick={handleSubmit}
            className="px-8 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-container transition-all shadow-lg flex items-center gap-2"
          >
            <span>Créer le projet</span>
            <Rocket className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Form */}
        <div className="lg:col-span-9 space-y-10">
          {/* Section 1: General */}
          <section className="bg-white p-8 rounded-2xl shadow-[0_20px_40px_rgba(9,20,38,0.02)] border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <span className="w-1.5 h-6 bg-primary rounded-full"></span>
              <h2 className="text-xl font-bold text-primary font-headline">Informations générales</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Nom du projet</label>
                <input 
                  className="w-full bg-surface-container-highest/50 border-none rounded-xl p-4 text-primary focus:ring-2 focus:ring-primary transition-all" 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
                <p className="text-error text-[10px] mt-2 flex items-center gap-1 font-bold">
                  <Info className="w-3 h-3" />
                  Le nom est requis pour la validation du dossier.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Référence</label>
                <input 
                  className="w-full bg-surface-container-highest/50 border-none rounded-xl p-4 text-primary focus:ring-2 focus:ring-primary transition-all" 
                  placeholder="REF-2024-001" 
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({...formData, reference: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Type de chantier</label>
                <div className="relative">
                  <select 
                    className="w-full bg-surface-container-highest/50 border-none rounded-xl p-4 text-primary focus:ring-2 focus:ring-primary transition-all appearance-none"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option>Résidentiel Collectif</option>
                    <option>Tertiaire / Bureaux</option>
                    <option>Infrastructure Publique</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Client</label>
                <input 
                  className="w-full bg-surface-container-highest/50 border-none rounded-xl p-4 text-primary focus:ring-2 focus:ring-primary transition-all" 
                  placeholder="Nom du maître d'ouvrage" 
                  type="text"
                  value={formData.client}
                  onChange={(e) => setFormData({...formData, client: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Statut</label>
                  <div className="px-4 py-2 rounded-full bg-secondary-fixed text-on-secondary-container text-[10px] font-bold w-fit uppercase tracking-wider">
                    {formData.status}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Priorité</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-surface-container-highest/50 border-none rounded-xl p-4 py-2 text-sm text-primary focus:ring-2 focus:ring-primary transition-all appearance-none"
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    >
                      <option>Haute</option>
                      <option>Moyenne</option>
                      <option>Basse</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Description du projet</label>
                <textarea 
                  className="w-full bg-surface-container-highest/50 border-none rounded-xl p-4 text-primary focus:ring-2 focus:ring-primary transition-all resize-none" 
                  placeholder="Détails techniques, contraintes spécifiques..." 
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>
            </div>
          </section>

          {/* Section 2: Location & Planning */}
          <section className="bg-white p-8 rounded-2xl shadow-[0_20px_40px_rgba(9,20,38,0.02)] border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <span className="w-1.5 h-6 bg-primary rounded-full"></span>
              <h2 className="text-xl font-bold text-primary font-headline">Localisation et planification</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Adresse du site</label>
                <input 
                  className="w-full bg-surface-container-highest/50 border-none rounded-xl p-4 text-primary focus:ring-2 focus:ring-primary transition-all" 
                  placeholder="15 Avenue des Artisans" 
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Ville / Zone</label>
                <input 
                  className="w-full bg-surface-container-highest/50 border-none rounded-xl p-4 text-primary focus:ring-2 focus:ring-primary transition-all" 
                  placeholder="Cotonou" 
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Date début</label>
                <div className="relative">
                  <input 
                    className="w-full bg-surface-container-highest/50 border-none rounded-xl p-4 text-primary focus:ring-2 focus:ring-primary transition-all" 
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Date fin prévue</label>
                <div className="relative">
                  <input 
                    className="w-full bg-surface-container-highest/50 border-2 border-error/20 rounded-xl p-4 text-primary focus:ring-2 focus:ring-primary transition-all" 
                    type="date" 
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-error text-[10px] mt-2 flex items-center gap-1 font-bold">
                  <AlertTriangle className="w-3 h-3" />
                  Date de fin invalide par rapport au planning.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Centre de rattachement</label>
                <div className="relative">
                  <select 
                    className="w-full bg-surface-container-highest/50 border-none rounded-xl p-4 text-primary focus:ring-2 focus:ring-primary transition-all appearance-none"
                    value={formData.center}
                    onChange={(e) => setFormData({...formData, center: e.target.value})}
                  >
                    <option>Agence Littoral Nord</option>
                    <option>Agence Atlantique Sud</option>
                    <option>Agence Borgou</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Responsable Projet</label>
                <div className="flex items-center gap-3 bg-surface-container-highest/50 rounded-xl p-2 pr-4 border border-slate-100">
                  <img 
                    className="w-10 h-10 rounded-full object-cover" 
                    src="https://picsum.photos/seed/manager/100/100" 
                    alt="Marc Vasseur" 
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-sm font-bold text-primary">Marc Vasseur</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Conducteur de travaux</label>
                <input 
                  className="w-full bg-surface-container-highest/50 border-none rounded-xl p-4 text-primary focus:ring-2 focus:ring-primary transition-all" 
                  placeholder="Rechercher un collaborateur..." 
                  type="text"
                />
              </div>
            </div>
          </section>

          {/* Section 3: Budget */}
          <section className="bg-white p-8 rounded-2xl shadow-[0_20px_40px_rgba(9,20,38,0.02)] border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <span className="w-1.5 h-6 bg-primary rounded-full"></span>
              <h2 className="text-xl font-bold text-primary font-headline">Cadrage budgétaire</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Budget Prévisionnel</label>
                <div className="relative">
                  <input 
                    className="w-full bg-surface-container-highest/50 border-none rounded-xl p-4 text-primary font-bold text-lg focus:ring-2 focus:ring-primary transition-all" 
                    placeholder="1 250 000" 
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({...formData, budget: e.target.value})}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">FCFA</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Effectif max</label>
                <input 
                  className="w-full bg-surface-container-highest/50 border-none rounded-xl p-4 text-primary focus:ring-2 focus:ring-primary transition-all" 
                  placeholder="45" 
                  type="number"
                  value={formData.maxStaff}
                  onChange={(e) => setFormData({...formData, maxStaff: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Criticité</label>
                <div className="relative">
                  <select 
                    className="w-full bg-surface-container-highest/50 border-none rounded-xl p-4 text-primary focus:ring-2 focus:ring-primary transition-all appearance-none"
                    value={formData.criticality}
                    onChange={(e) => setFormData({...formData, criticality: e.target.value})}
                  >
                    <option>Standard</option>
                    <option>Sensible</option>
                    <option>Critique</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Mode de suivi analytique</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, trackingMode: 'progress'})}
                    className={cn(
                      "p-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
                      formData.trackingMode === 'progress' 
                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                        : "bg-surface-container-highest/50 text-slate-600 hover:bg-surface-container-highest"
                    )}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Avancement %
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, trackingMode: 'hours'})}
                    className={cn(
                      "p-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
                      formData.trackingMode === 'hours' 
                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                        : "bg-surface-container-highest/50 text-slate-600 hover:bg-surface-container-highest"
                    )}
                  >
                    <Clock className="w-4 h-4" />
                    Heures réelles
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Resources */}
          <section className="bg-white p-8 rounded-2xl shadow-[0_20px_40px_rgba(9,20,38,0.02)] border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                <h2 className="text-xl font-bold text-primary font-headline">Ressources initiales</h2>
              </div>
              <button className="flex items-center gap-2 text-primary font-bold text-xs bg-primary-fixed/50 px-4 py-2 rounded-xl hover:bg-primary hover:text-white transition-all">
                <Plus className="w-4 h-4" />
                Ajouter une ressource
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-surface-container-low/50 rounded-xl border border-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <Truck className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-primary">Grue à tour G20</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Matériel lourd</div>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary">Dispo : 12/05</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Planning validé</div>
                  </div>
                  <button className="p-2 text-slate-300 hover:text-error hover:bg-error/5 rounded-lg transition-all">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-container-low/50 rounded-xl border border-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <HardHat className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-primary">Équipe Coffrage Pro</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Sous-traitance</div>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary">8 pers.</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Contrat signé</div>
                  </div>
                  <button className="p-2 text-slate-300 hover:text-error hover:bg-error/5 rounded-lg transition-all">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Settings */}
          <section className="bg-white p-8 rounded-2xl shadow-[0_20px_40px_rgba(9,20,38,0.02)] border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <span className="w-1.5 h-6 bg-primary rounded-full"></span>
              <h2 className="text-xl font-bold text-primary font-headline">Paramètres de suivi</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex items-start gap-4 p-5 rounded-2xl border border-slate-50 hover:bg-surface-container-low/50 transition-all cursor-pointer group">
                <div className="relative flex items-center">
                  <input defaultChecked className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary transition-all" type="checkbox" />
                </div>
                <div>
                  <div className="font-bold text-primary">Alertes automatiques</div>
                  <p className="text-xs text-slate-500 leading-relaxed">Notifications push pour les retards critiques et dépassements budget.</p>
                </div>
              </label>
              <label className="flex items-start gap-4 p-5 rounded-2xl border border-slate-50 hover:bg-surface-container-low/50 transition-all cursor-pointer group">
                <div className="relative flex items-center">
                  <input defaultChecked className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary transition-all" type="checkbox" />
                </div>
                <div>
                  <div className="font-bold text-primary">Mouvements de stocks</div>
                  <p className="text-xs text-slate-500 leading-relaxed">Générer un bordereau pour chaque entrée/sortie de matériel.</p>
                </div>
              </label>
              <label className="flex items-start gap-4 p-5 rounded-2xl border border-slate-50 hover:bg-surface-container-low/50 transition-all cursor-pointer group">
                <div className="relative flex items-center">
                  <input className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary transition-all" type="checkbox" />
                </div>
                <div>
                  <div className="font-bold text-primary">Suivi matériel RFID</div>
                  <p className="text-xs text-slate-500 leading-relaxed">Synchroniser les données avec les balises actives sur site.</p>
                </div>
              </label>
              <label className="flex items-start gap-4 p-5 rounded-2xl bg-primary-fixed/20 border border-primary/5 transition-all cursor-pointer group">
                <div className="relative flex items-center">
                  <input defaultChecked className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary transition-all" type="checkbox" />
                </div>
                <div>
                  <div className="font-bold text-primary flex items-center gap-2">
                    Assistance IA Pro
                    <span className="text-[8px] bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-tighter font-black">Premium</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">Prédire les goulots d'étranglement basés sur l'historique.</p>
                </div>
              </label>
            </div>
          </section>

          <div className="flex justify-end gap-4 pt-10">
            <button 
              onClick={() => navigate('/projects')}
              className="px-8 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-white transition-all shadow-sm"
            >
              Annuler
            </button>
            <button 
              onClick={handleSubmit}
              className="px-12 py-3 rounded-xl bg-primary text-white font-black hover:bg-primary-container transition-all shadow-[0_10px_20px_rgba(9,20,38,0.2)] flex items-center gap-3"
            >
              <span>CRÉER LE PROJET</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right: Side Panel */}
        <aside className="lg:col-span-3 space-y-8 sticky top-24">
          {/* IA Suggestion Card */}
          <div className="bg-primary-container text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight font-headline">Suggestion IA</h3>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Analyse prédictive</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                <p className="text-xs text-white/80 leading-relaxed italic">
                  "D'après le descriptif, ce projet s'apparente à la catégorie <span className="text-primary-fixed font-black">Gros œuvre</span>."
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Risque initial :</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-black uppercase tracking-wider">Faible</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Optimisation :</span>
                  <span className="font-bold text-white/90">Conseillée</span>
                </div>
              </div>
              <button className="w-full py-3 bg-white text-primary rounded-xl font-black text-xs hover:bg-primary-fixed transition-all shadow-lg">
                Appliquer les paramètres IA
              </button>
            </div>
          </div>

          {/* Dynamic Summary Card */}
          <div className="bg-white p-8 rounded-3xl shadow-[0_20px_40px_rgba(9,20,38,0.05)] border border-slate-50">
            <h3 className="font-bold text-primary mb-8 flex items-center gap-3 font-headline">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              Résumé du projet
            </h3>
            <div className="space-y-8">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Responsable</span>
                <span className="text-sm font-bold text-primary">{formData.manager}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Budget global</span>
                <span className="text-2xl font-black text-primary">{Number(formData.budget).toLocaleString()} FCFA</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Période</span>
                <span className="text-sm font-bold text-primary">Jan 2024 - Déc 2024</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Lieu</span>
                <span className="text-sm font-bold text-primary">{formData.city}, Bénin</span>
              </div>
            </div>
            <div className="mt-10 pt-8 border-t border-slate-50">
              <div className="flex items-center gap-3 text-slate-400">
                <Package className="w-4 h-4" />
                <span className="text-xs font-medium italic">2 ressources assignées</span>
              </div>
            </div>
          </div>

          {/* Mini Visual Map */}
          <div className="h-56 w-full rounded-3xl relative overflow-hidden shadow-2xl group">
            <img 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800" 
              alt="Plan Google Maps Cotonou" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <p className="text-white text-xs font-black leading-tight mb-1">Zone d'intervention : Cotonou</p>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Identifié par GPS</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
