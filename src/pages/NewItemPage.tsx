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
  BarChart3,
  ChevronDown,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiServices } from '@/lib/api';
import SupplierPickerModal from '@/components/SupplierPickerModal';
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

export default function NewItemPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    ref: '',
    category: '',
    location: '',
    minStock: '',
    currentStock: '',
    unit: '',
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
    let isMounted = true;
    Promise.all([
      apiServices.categories.list({ page_size: 500 }),
      apiServices.unitsOfMeasure.list({ page_size: 500 }),
      apiServices.storageLocations.list({ page_size: 500 }),
      apiServices.suppliers.list({ page_size: 500 }),
    ])
      .then(([categoriesData, unitsData, locationsData, suppliersData]) => {
        if (!isMounted) return;
        setCategories(categoriesData);
        setUnits(unitsData);
        setLocations(locationsData);
        setSuppliers(suppliersData);
        setFormData((prev) => ({
          ...prev,
          category: categoriesData[0]?.id ?? '',
          unit: unitsData[0]?.id ?? '',
          location: locationsData[0]?.id ?? '',
        }));
      })
      .catch((error) => {
        console.error('Failed to load item form dependencies:', error);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);
  const locationById = useMemo(() => new Map(locations.map((l) => [l.id, l.name])), [locations]);
  const supplierById = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  const unitPriceMissing = !formData.unitPrice.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const categoryId = formData.category;
    const unitId = formData.unit;
    const locationId = formData.location;
    if (!categoryId || !unitId || !locationId) {
      setSubmitError('Catégorie, unité et lieu doivent être sélectionnés depuis les données API.');
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
      supplier: formData.supplierId || null,
      unit: unitId,
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

    let createdId: string;
    try {
      const item = await apiServices.items.create(itemPayload);
      createdId = item.id;
      const stockPayload: CreateInput<StockBalance> = {
        item: item.id,
        storage_location: locationId,
        zone_label: '',
        quantity: formData.currentStock || '0',
      };
      await apiServices.stockBalances.create(stockPayload);
      if (formData.photoFile) {
        await apiServices.items.uploadImage(item.id, formData.photoFile);
      }
    } catch (error) {
      console.error('Failed to save item:', error);
      setSubmitError("Impossible d'enregistrer cet article pour le moment.");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    navigate(`/inventory/${createdId}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="p-2 hover:bg-surface-container rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-primary tracking-tight font-headline">
              Ajouter un nouvel article
            </h2>
            <p className="text-on-surface-variant text-sm">
              Enregistrez un nouveau matériel ou consommable dans le parc.
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

          {unitPriceMissing ? (
            <div
              className={cn(
                'rounded-xl border px-4 py-3 text-sm',
                'border-amber-200 bg-amber-50 text-amber-900',
              )}
            >
              Sans prix unitaire, les coûts chantier ne seront pas calculés.
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
                    placeholder="Ex: Poutrelles Acier HEB 200"
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
                      placeholder="Ex: REF-8401"
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
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {categories.length > 0 ? (
                        categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))
                      ) : (
                        <option value="">—</option>
                      )}
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
                  placeholder="Détails techniques, dimensions, usage spécifique..."
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
                    placeholder="0"
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                    Fournisseur
                  </label>
                  <button
                    type="button"
                    onClick={() => setSupplierModalOpen(true)}
                    aria-haspopup="dialog"
                    aria-expanded={supplierModalOpen}
                    className="flex w-full items-center justify-between gap-3 rounded-xl bg-surface-container-low px-4 py-3 text-left text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <Truck className="h-5 w-5 shrink-0 text-slate-400" />
                      <span className="truncate font-medium text-primary">
                        {formData.supplierId
                          ? (supplierById.get(formData.supplierId) ?? '—')
                          : '—'}
                      </span>
                    </span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                  </button>
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
                    Photo (après création)
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
              <h3 className="font-headline font-bold text-lg text-primary">Gestion du stock</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                  Stock initial
                </label>
                <input
                  type="number"
                  required
                  placeholder="0"
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
                    placeholder="5"
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
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                >
                  {units.length > 0 ? (
                    units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))
                  ) : (
                    <option value="">—</option>
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                  Lieu de stockage
                </label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <select
                    required
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all appearance-none"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  >
                    {locations.length > 0 ? (
                      locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))
                    ) : (
                      <option value="">—</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-primary p-8 rounded-2xl text-white shadow-xl shadow-primary/20">
            <h3 className="font-headline font-bold text-lg mb-4">Finaliser l&apos;ajout</h3>
            <p className="text-primary-fixed text-sm mb-8 leading-relaxed">
              Une fois l&apos;article créé, il sera immédiatement disponible pour les mouvements de stock et les audits.
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
            <h4 className="font-bold text-primary text-sm mb-3">Récapitulatif</h4>
            <dl className="text-xs text-slate-600 space-y-2">
              <div className="flex justify-between gap-2">
                <dt>Catégorie</dt>
                <dd className="font-semibold text-primary">{categoryById.get(formData.category) ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Unité</dt>
                <dd className="font-semibold text-primary">{unitById.get(formData.unit) ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Lieu</dt>
                <dd className="font-semibold text-primary">{locationById.get(formData.location) ?? '—'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </form>

      <SupplierPickerModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        suppliers={suppliers}
        selectedId={formData.supplierId}
        onSelect={(supplierId) => setFormData((prev) => ({ ...prev, supplierId }))}
        onSupplierCreated={(supplier) => {
          setSuppliers((prev) =>
            [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
          );
        }}
      />
    </div>
  );
}
