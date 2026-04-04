import React from 'react';
import { 
  Settings, 
  Search, 
  HelpCircle, 
  LayoutGrid, 
  BellRing, 
  Ruler, 
  MapPin, 
  Cloud, 
  Network, 
  Database, 
  Plus, 
  History,
  ShieldCheck,
  HardHat,
  Warehouse,
  Construction,
  Shield,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
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

          {/* Integrations */}
          <section className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-headline font-bold text-primary">Intégrations</h4>
              <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">2 CONNECTÉES</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="aspect-square bg-slate-50 rounded-xl flex items-center justify-center grayscale hover:grayscale-0 cursor-pointer transition-all border border-slate-100">
                <Cloud className="w-5 h-5 text-slate-400" />
              </div>
              <div className="aspect-square bg-primary-container flex items-center justify-center rounded-xl cursor-pointer shadow-sm">
                <Network className="w-5 h-5 text-white" />
              </div>
              <div className="aspect-square bg-slate-50 rounded-xl flex items-center justify-center grayscale hover:grayscale-0 cursor-pointer transition-all border border-slate-100">
                <Database className="w-5 h-5 text-slate-400" />
              </div>
              <div className="aspect-square bg-white rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 cursor-pointer hover:border-primary transition-colors">
                <Plus className="w-5 h-5" />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Action Footer */}
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
