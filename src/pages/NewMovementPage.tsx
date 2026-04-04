import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  ChevronDown, 
  Search, 
  Warehouse, 
  MapPin, 
  Construction, 
  Bot, 
  Sparkles, 
  Lightbulb, 
  ArrowRight, 
  QrCode,
  Save,
  PlusCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export default function NewMovementPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      {/* Focus Mode Header */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md px-6 md:px-10 py-6 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-lg shadow-lg shadow-primary/20">
            <Construction className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-headline font-extrabold text-xl tracking-tight text-primary uppercase">Bâtir Pro</h1>
            <p className="font-label text-slate-400 text-[10px] font-bold tracking-widest uppercase">Nouveau mouvement</p>
          </div>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-primary hover:bg-slate-100 transition-all rounded-xl font-bold text-sm"
        >
          <X className="w-5 h-5" />
          <span className="hidden sm:inline">Annuler</span>
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-10 pt-8 pb-32">
        {/* AI Suggestion Banner */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex flex-col sm:flex-row items-center gap-4 p-5 bg-primary/5 rounded-2xl border-l-4 border-primary shadow-sm"
        >
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Assistant IA : Suggestion de flux</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Mouvement habituel détecté pour ce type de matériel sur le chantier <span className="font-bold text-primary italic">Porto-Novo</span>. Souhaitez-vous pré-remplir les destinations ?
            </p>
          </div>
          <button className="w-full sm:w-auto px-6 py-2 bg-white text-primary text-xs font-bold rounded-xl shadow-sm hover:shadow-md hover:bg-slate-50 transition-all border border-slate-100">
            Appliquer
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Form Section */}
          <div className="lg:col-span-8">
            <div className="mb-12">
              <h2 className="font-headline font-bold text-4xl text-primary mb-3 tracking-tight">Enregistrer un nouveau mouvement</h2>
              <p className="text-slate-500 text-lg">Veuillez renseigner les détails du transfert de stock ou de matériel.</p>
            </div>

            <form className="space-y-10">
              {/* Section 1: Type & Quantity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block font-label text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Type de mouvement</label>
                  <div className="relative group">
                    <select defaultValue="transfert" className="w-full h-16 pl-6 pr-12 bg-white border border-slate-100 rounded-2xl text-primary font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary appearance-none transition-all shadow-sm group-hover:border-slate-200">
                      <option value="entree">Entrée (Stockage)</option>
                      <option value="sortie">Sortie (Usage Chantier)</option>
                      <option value="transfert">Transfert Inter-Sites</option>
                      <option value="retour">Retour de Chantier</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 w-5 h-5" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block font-label text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Quantité</label>
                  <input 
                    className="w-full h-16 px-6 bg-white border border-slate-100 rounded-2xl text-primary font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm hover:border-slate-200" 
                    placeholder="0.00" 
                    type="number"
                  />
                </div>
              </div>

              {/* Section 2: Article Search */}
              <div className="space-y-3">
                <label className="block font-label text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Article / Matériel</label>
                <div className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-hover:text-primary transition-colors" />
                  <input 
                    className="w-full h-16 pl-14 pr-24 bg-white border border-slate-100 rounded-2xl text-primary font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm hover:border-slate-200" 
                    placeholder="Rechercher par nom, référence ou SKU..." 
                    type="text"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-400 uppercase tracking-tighter">CMD + K</div>
                </div>
              </div>

              {/* Section 3: Logistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block font-label text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Lieu Source</label>
                  <div className="relative group">
                    <select className="w-full h-16 pl-6 pr-12 bg-white border border-slate-100 rounded-2xl text-primary font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary appearance-none transition-all shadow-sm group-hover:border-slate-200">
                      <option>Entrepôt Central A</option>
                      <option>Dépôt Nord</option>
                      <option>Zone d'Achat Direct</option>
                    </select>
                    <Warehouse className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 w-5 h-5" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block font-label text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Lieu Destination</label>
                  <div className="relative group">
                    <select className="w-full h-16 pl-6 pr-12 bg-white border border-slate-100 rounded-2xl text-primary font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary appearance-none transition-all shadow-sm group-hover:border-slate-200">
                      <option>Chantier Horizon</option>
                      <option>Résidence Belle Vue</option>
                      <option>Entrepôt Central B</option>
                    </select>
                    <MapPin className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Section 4: Project Assignment */}
              <div className="space-y-3">
                <label className="block font-label text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Chantier Associé</label>
                <div className="relative group">
                  <select className="w-full h-16 pl-6 pr-12 bg-white border border-slate-100 rounded-2xl text-primary font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary appearance-none transition-all shadow-sm group-hover:border-slate-200">
                    <option>Horizon - Lot 4 (Rénovation)</option>
                    <option>Tour Altair - Fondations</option>
                    <option>Non assigné</option>
                  </select>
                  <Construction className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 w-5 h-5" />
                </div>
              </div>

              {/* Section 5: Comments */}
              <div className="space-y-3">
                <label className="block font-label text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Commentaire / Note</label>
                <textarea 
                  className="w-full p-6 bg-white border border-slate-100 rounded-2xl text-primary font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm hover:border-slate-200 resize-none" 
                  placeholder="Précisez la raison du mouvement ou des instructions spécifiques..." 
                  rows={4}
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-12 flex flex-col sm:flex-row items-center justify-end gap-4 border-t border-slate-100">
                <button 
                  onClick={() => navigate(-1)}
                  className="w-full sm:w-auto px-8 py-4 font-bold text-slate-400 hover:text-primary hover:bg-slate-50 transition-all rounded-2xl" 
                  type="button"
                >
                  Annuler
                </button>
                <button 
                  className="w-full sm:w-auto px-8 py-4 font-bold text-primary bg-slate-100 hover:bg-slate-200 transition-all rounded-2xl border border-slate-200 shadow-sm" 
                  type="button"
                >
                  Enregistrer et créer un autre
                </button>
                <button 
                  onClick={(e) => { e.preventDefault(); navigate('/inventory'); }}
                  className="w-full sm:w-auto px-12 py-4 font-bold text-white bg-primary shadow-xl shadow-primary/20 hover:bg-primary-container hover:scale-[1.02] active:scale-[0.98] transition-all rounded-2xl flex items-center justify-center gap-3" 
                  type="submit"
                >
                  <Save className="w-5 h-5" />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>

          {/* Contextual Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-8">
              <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                <h3 className="font-headline font-bold text-2xl text-primary mb-8 tracking-tight">Récapitulatif</h3>
                <div className="space-y-8">
                  <div className="flex gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100 p-2">
                      <img 
                        alt="Poutres en acier" 
                        className="w-full h-full object-contain" 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcODcJ62bhlfeFhXjquVPJEoHp9XnVK6HujPhZFPSp1nQu_m03Gvc4EnNc193m15YrTl1UIlgp24jkW_ijCuEqo-cwT8Mzw6xaWsejx_dbmx7i9WQAxY-n6dnjBZvkwUF3h1BB_RhYbloEiUKKPp9PH54qEG-3ICDkZDPISp45J7imucIYkcjbaR9Xkd5bT0ZcofOpcALSss4OiyiKL1XbLsi115p6LM9DOKyndlPh0Q_RoHJFqm8-XHXrZd6gxute0qOChw1mL5fh"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dernier Article Sélectionné</p>
                      <p className="font-bold text-primary text-lg leading-tight">IPN 200 - Acier Galvanisé</p>
                      <p className="text-xs text-slate-500 font-medium mt-1">Réf: STL-IPN200-88</p>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-50 space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-500">Stock Actuel (Source)</span>
                      <span className="font-bold text-primary">124 unités</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-500">Stock Prévu (Destination)</span>
                      <span className="font-bold text-primary italic flex items-center gap-1">
                        <PlusCircle className="w-4 h-4 text-primary" />
                        Nouveau
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '65%' }}
                          className="h-full bg-primary"
                        />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest">
                        Capacité de stockage à 65% sur le lieu destination
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Helpful Tip Card */}
              <div className="p-8 bg-primary text-white rounded-3xl relative overflow-hidden group shadow-xl shadow-primary/20">
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-md">
                    <Lightbulb className="w-5 h-5 text-primary-fixed" />
                  </div>
                  <h4 className="font-headline font-bold text-xl mb-3 tracking-tight">Conseil d'expert</h4>
                  <p className="text-slate-300 text-sm leading-relaxed mb-8">
                    Saviez-vous que vous pouvez scanner le QR Code de l'article directement depuis l'application mobile pour gagner du temps ?
                  </p>
                  <button className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase hover:text-primary-fixed transition-colors group/btn">
                    En savoir plus
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
                {/* Abstract Background Pattern */}
                <div className="absolute -right-8 -bottom-8 opacity-10 transform rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                  <QrCode className="w-48 h-48" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
