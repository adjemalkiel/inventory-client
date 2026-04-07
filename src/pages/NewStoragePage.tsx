import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  MapPin, 
  User, 
  Warehouse,
  Info,
  ShieldCheck
} from 'lucide-react';
import { apiServices } from '@/lib/api';
import type { CreateInput, StorageLocation, StorageType } from '@/types/api';

export default function NewStoragePage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Dépôt Principal',
    location: '',
    manager: '',
    capacity: '',
    description: ''
  });

  const storageTypeMap: Record<string, StorageType> = {
    'Dépôt Principal': 'depot_principal',
    'Magasin Chantier': 'magasin_chantier',
    'Zone Temporaire': 'zone_temporaire',
    'Conteneur Mobile': 'conteneur_mobile',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    const payload: CreateInput<StorageLocation> = {
      name: formData.name,
      storage_type: storageTypeMap[formData.type] ?? 'depot_principal',
      address: formData.location,
      manager_name: formData.manager,
      manager_user: null,
      capacity_m2: formData.capacity ? formData.capacity : null,
      notes: formData.description,
      is_active: true,
    };
    try {
      await apiServices.storageLocations.create(payload);
    } catch (error) {
      console.error('Failed to save storage location:', error);
      setSubmitError("Impossible d'enregistrer ce lieu pour le moment.");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    navigate('/storage');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/storage')}
            className="p-2 hover:bg-surface-container rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-primary tracking-tight font-headline">Ajouter un nouveau lieu de stockage</h2>
            <p className="text-on-surface-variant text-sm">Configurez un nouveau dépôt, magasin ou zone de stockage temporaire.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {submitError ? (
            <div className="rounded-xl border border-error/20 bg-error-container/20 px-4 py-3 text-sm text-error">
              {submitError}
            </div>
          ) : null}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-surface-container-high space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-surface-dim/10">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Info className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-headline font-bold text-lg text-primary">Configuration du lieu</h3>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Nom du lieu</label>
                <div className="relative group">
                  <Warehouse className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Dépôt Cotonou - Zone Nord"
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Type de stockage</label>
                  <select 
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all appearance-none"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option>Dépôt Principal</option>
                    <option>Magasin Chantier</option>
                    <option>Zone Temporaire</option>
                    <option>Conteneur Mobile</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Responsable</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text"
                      required
                      placeholder="Ex: Jean Dossou"
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                      value={formData.manager}
                      onChange={(e) => setFormData({...formData, manager: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Adresse / Localisation précise</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Zone Industrielle, Sèmè-Podji"
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Capacité de stockage (m²)</label>
                <input 
                  type="number"
                  placeholder="Ex: 500"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Notes / Instructions d'accès</label>
                <textarea 
                  rows={3}
                  placeholder="Codes d'accès, horaires, contraintes de déchargement..."
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-primary p-8 rounded-2xl text-white shadow-xl shadow-primary/20">
            <h3 className="font-headline font-bold text-lg mb-4">Activer le lieu</h3>
            <p className="text-primary-fixed text-sm mb-8 leading-relaxed">
              Une fois activé, ce lieu pourra recevoir des transferts de stock et sera inclus dans les rapports de valorisation.
            </p>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-white text-primary font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95 shadow-lg"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer le lieu'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
