import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Package, 
  Tag, 
  MapPin, 
  AlertTriangle,
  Info,
  Layers,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiServices } from '@/lib/api';
import type {
  Category,
  CreateInput,
  Item,
  StockBalance,
  StorageLocation,
  UnitOfMeasure,
} from '@/types/api';

export default function NewItemPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    ref: '',
    category: 'Outillage',
    location: 'Dépôt Cotonou',
    minStock: '',
    currentStock: '',
    unit: 'Unités',
    description: ''
  });

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      apiServices.categories.list(),
      apiServices.unitsOfMeasure.list(),
      apiServices.storageLocations.list(),
    ])
      .then(([categoriesData, unitsData, locationsData]) => {
        if (!isMounted) return;
        setCategories(categoriesData);
        setUnits(unitsData);
        setLocations(locationsData);
        if (categoriesData.length > 0) {
          setFormData((prev) => ({ ...prev, category: categoriesData[0].name }));
        }
        if (unitsData.length > 0) {
          setFormData((prev) => ({ ...prev, unit: unitsData[0].name }));
        }
        if (locationsData.length > 0) {
          setFormData((prev) => ({ ...prev, location: locationsData[0].name }));
        }
      })
      .catch((error) => {
        console.error('Failed to load item form dependencies:', error);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const categoryByName = useMemo(() => {
    return new Map(categories.map((category) => [category.name, category.id]));
  }, [categories]);
  const unitByName = useMemo(() => {
    return new Map(units.map((unit) => [unit.name, unit.id]));
  }, [units]);
  const locationByName = useMemo(() => {
    return new Map(locations.map((location) => [location.name, location.id]));
  }, [locations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const categoryId = categoryByName.get(formData.category);
    const unitId = unitByName.get(formData.unit);
    const locationId = locationByName.get(formData.location);
    if (!categoryId || !unitId || !locationId) {
      setSubmitError(
        'Catégorie, unité et lieu doivent être sélectionnés depuis les données API.',
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    const itemPayload: CreateInput<Item> = {
      name: formData.name,
      sku: formData.ref,
      category: categoryId,
      description: formData.description,
      subcategory_label: '',
      brand: '',
      image_url: '',
      purchase_date: null,
      warranty_label: '',
      supplier_name: '',
      unit: unitId,
      min_stock: formData.minStock || '0',
      is_active: true,
    };
    try {
      const item = await apiServices.items.create(itemPayload);
      const stockPayload: CreateInput<StockBalance> = {
        item: item.id,
        storage_location: locationId,
        zone_label: '',
        quantity: formData.currentStock || '0',
      };
      await apiServices.stockBalances.create(stockPayload);
    } catch (error) {
      console.error('Failed to save item:', error);
      setSubmitError("Impossible d'enregistrer cet article pour le moment.");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    navigate('/inventory');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/inventory')}
            className="p-2 hover:bg-surface-container rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-primary tracking-tight font-headline">Ajouter un nouvel article</h2>
            <p className="text-on-surface-variant text-sm">Enregistrez un nouveau matériel ou consommable dans le parc.</p>
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
              <h3 className="font-headline font-bold text-lg text-primary">Informations générales</h3>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Nom de l'article</label>
                <div className="relative group">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Poutrelles Acier HEB 200"
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Référence / SKU</label>
                  <div className="relative group">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text"
                      required
                      placeholder="Ex: REF-8401"
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                      value={formData.ref}
                      onChange={(e) => setFormData({...formData, ref: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Catégorie</label>
                  <div className="relative group">
                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <select 
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all appearance-none"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      {categories.length > 0 ? (
                        categories.map((category) => (
                          <option key={category.id}>{category.name}</option>
                        ))
                      ) : (
                        <option>Outillage</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Description</label>
                <textarea 
                  rows={4}
                  placeholder="Détails techniques, dimensions, usage spécifique..."
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-surface-container-high space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-surface-dim/10">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-headline font-bold text-lg text-primary">Gestion du stock</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Stock initial</label>
                <input 
                  type="number"
                  required
                  placeholder="0"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                  value={formData.currentStock}
                  onChange={(e) => setFormData({...formData, currentStock: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Seuil d'alerte (Min)</label>
                <div className="relative group">
                  <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
                  <input 
                    type="number"
                    required
                    placeholder="5"
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                    value={formData.minStock}
                    onChange={(e) => setFormData({...formData, minStock: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Unité de mesure</label>
                <select 
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all appearance-none"
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                >
                  {units.length > 0 ? (
                    units.map((unit) => (
                      <option key={unit.id}>{unit.name}</option>
                    ))
                  ) : (
                    <option>Unités</option>
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Lieu de stockage</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <select 
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all appearance-none"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  >
                    {locations.length > 0 ? (
                      locations.map((location) => (
                        <option key={location.id}>{location.name}</option>
                      ))
                    ) : (
                      <option>Dépôt Cotonou</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-primary p-8 rounded-2xl text-white shadow-xl shadow-primary/20">
            <h3 className="font-headline font-bold text-lg mb-4">Finaliser l'ajout</h3>
            <p className="text-primary-fixed text-sm mb-8 leading-relaxed">
              Une fois l'article créé, il sera immédiatement disponible pour les mouvements de stock et les audits.
            </p>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-white text-primary font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95 shadow-lg"
            >
              <Save className="w-5 h-5" />
              <span>{isSubmitting ? 'Enregistrement...' : "Enregistrer l'article"}</span>
            </button>
          </div>

          <div className="bg-surface-container-low p-6 rounded-2xl border border-surface-container-high">
            <h4 className="font-bold text-primary text-sm mb-3">Conseils IA</h4>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <p className="text-xs text-slate-600 leading-relaxed">Utilisez des références standardisées pour faciliter la recherche.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <p className="text-xs text-slate-600 leading-relaxed">Définissez un seuil d'alerte réaliste pour éviter les ruptures de stock.</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
