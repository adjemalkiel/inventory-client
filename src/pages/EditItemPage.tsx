import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Package,
  Tag,
  MapPin,
  AlertTriangle,
  Info,
  Layers,
  BarChart3,
} from 'lucide-react';
import { apiServices } from '@/lib/api';
import type {
  Category,
  CreateInput,
  Item,
  ItemCondition,
  StockBalance,
  StorageLocation,
  Supplier,
  UnitOfMeasure,
} from '@/types/api';

const CONDITIONS: { value: ItemCondition; label: string }[] = [
  { value: '', label: 'Non renseigné' },
  { value: 'neuf', label: 'Neuf' },
  { value: 'bon', label: 'Bon état' },
  { value: 'use', label: 'Usé' },
  { value: 'hors_service', label: 'Hors service' },
];

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [initialBalanceId, setInitialBalanceId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    ref: '',
    categoryId: '',
    locationId: '',
    minStock: '',
    currentStock: '',
    unitId: '',
    description: '',
    unitPrice: '',
    supplierId: '',
    barcode: '',
    serialNumber: '',
    condition: '' as ItemCondition,
    isConsumable: true,
    isRented: false,
    rentalDailyCost: '',
    photoFile: null as File | null,
  });

  useEffect(() => {
    let live = true;
    Promise.all([
      apiServices.categories.list({ page_size: 500 }),
      apiServices.unitsOfMeasure.list({ page_size: 500 }),
      apiServices.storageLocations.list({ page_size: 500 }),
      apiServices.suppliers.list({ page_size: 500 }),
    ])
      .then(([c, u, l, s]) => {
        if (!live) return;
        setCategories(c);
        setUnits(u);
        setLocations(l);
        setSuppliers(s);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    let live = true;
    setLoadError(null);
    Promise.all([
      apiServices.items.get(id),
      apiServices.stockBalances.list({ item: id, page_size: 100 }),
    ])
      .then(([item, balances]) => {
        if (!live) return;
        const primary = balances[0];
        setInitialBalanceId(primary?.id ?? null);
        setFormData({
          name: item.name,
          ref: item.sku,
          categoryId: item.category,
          locationId: primary?.storage_location ?? '',
          minStock: item.min_stock ?? '0',
          currentStock: primary?.quantity ?? '0',
          unitId: item.unit,
          description: item.description ?? '',
          unitPrice: item.unit_price ?? '',
          supplierId: item.supplier ?? '',
          barcode: item.barcode ?? '',
          serialNumber: item.serial_number ?? '',
          condition: (item.condition ?? '') as ItemCondition,
          isConsumable: item.is_consumable,
          isRented: item.is_rented,
          rentalDailyCost: item.rental_daily_cost ?? '',
          photoFile: null,
        });
      })
      .catch(() => {
        if (!live) return;
        setLoadError('Article introuvable ou accès refusé.');
      });
    return () => {
      live = false;
    };
  }, [id]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!formData.categoryId || !formData.unitId) {
      setSubmitError('Catégorie et unité doivent être sélectionnées.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payload: Partial<CreateInput<Item>> = {
      name: formData.name,
      sku: formData.ref,
      category: formData.categoryId,
      description: formData.description,
      subcategory_label: '',
      brand: '',
      image_url: '',
      purchase_date: null,
      warranty_label: '',
      supplier_name: '',
      supplier: formData.supplierId || null,
      unit: formData.unitId,
      min_stock: formData.minStock || '0',
      is_active: true,
      unit_price: formData.unitPrice.trim() ? formData.unitPrice : null,
      currency: 'FCFA',
      barcode: formData.barcode,
      serial_number: formData.serialNumber,
      condition: formData.condition || '',
      is_consumable: formData.isConsumable,
      is_rented: formData.isRented,
      rental_daily_cost: formData.rentalDailyCost.trim() ? formData.rentalDailyCost : null,
    };

    try {
      await apiServices.items.update(id, payload as CreateInput<Item>);
      if (formData.locationId && initialBalanceId) {
        await apiServices.stockBalances.patch(initialBalanceId, {
          storage_location: formData.locationId,
          quantity: formData.currentStock || '0',
        });
      }
      if (formData.photoFile) {
        await apiServices.items.uploadImage(id, formData.photoFile);
      }
    } catch (error) {
      console.error(error);
      setSubmitError("Impossible d'enregistrer les modifications.");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    navigate(`/inventory/${id}`);
  };

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-error text-sm">{loadError}</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-surface-container rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-primary tracking-tight font-headline">
              Modifier l&apos;article
            </h2>
            <p className="text-on-surface-variant text-sm">
              {formData.name ? formData.name : '…'} ({categoryById.get(formData.categoryId) ?? '—'})
            </p>
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
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                  Nom de l&apos;article
                </label>
                <div className="relative group">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                    Référence / SKU
                  </label>
                  <div className="relative group">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      required
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                      value={formData.ref}
                      onChange={(e) => setFormData({ ...formData, ref: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                    Catégorie
                  </label>
                  <div className="relative group">
                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <select
                      required
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all appearance-none"
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    >
                      <option value="">—</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                    Prix unitaire (FCFA)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                    Fournisseur
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all appearance-none"
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  >
                    <option value="">—</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                    Code-barres / QR
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  />
                </div>
                {!formData.isConsumable ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                      Numéro de série
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    />
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                    État
                  </label>
                  <select
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all appearance-none"
                    value={formData.condition}
                    onChange={(e) =>
                      setFormData({ ...formData, condition: e.target.value as ItemCondition })
                    }
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c.value || 'none'} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                    Photo (upload)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full text-sm"
                    onChange={(e) =>
                      setFormData({ ...formData, photoFile: e.target.files?.[0] ?? null })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-6 items-center">
                <label className="flex items-center gap-2 text-sm font-medium text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isConsumable}
                    onChange={(e) => setFormData({ ...formData, isConsumable: e.target.checked })}
                  />
                  Consommable
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-primary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRented}
                    onChange={(e) => setFormData({ ...formData, isRented: e.target.checked })}
                  />
                  Article en location
                </label>
              </div>

              {formData.isRented ? (
                <div className="space-y-2 max-w-xs">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                    Coût journalier location
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                    value={formData.rentalDailyCost}
                    onChange={(e) => setFormData({ ...formData, rentalDailyCost: e.target.value })}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-surface-container-high space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-surface-dim/10">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-headline font-bold text-lg text-primary">Stock</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                  Quantité (premier solde)
                </label>
                <input
                  type="number"
                  required
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                  value={formData.currentStock}
                  onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                  Seuil d&apos;alerte (Min)
                </label>
                <div className="relative group">
                  <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
                  <input
                    type="number"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                  Unité de mesure
                </label>
                <select
                  required
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all appearance-none"
                  value={formData.unitId}
                  onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                >
                  <option value="">—</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                  Lieu de stockage (premier solde)
                </label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <select
                    required
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all appearance-none"
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  >
                    <option value="">—</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-primary p-8 rounded-2xl text-white shadow-xl shadow-primary/20">
            <h3 className="font-headline font-bold text-lg mb-4">Enregistrer</h3>
            <p className="text-primary-fixed text-sm mb-8 leading-relaxed">
              Les changements sont appliqués immédiatement côté catalog et stocks liés.
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-white text-primary font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95 shadow-lg"
            >
              <Save className="w-5 h-5" />
              <span>{isSubmitting ? 'Enregistrement…' : 'Mettre à jour'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
