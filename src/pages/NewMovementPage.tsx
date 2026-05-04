import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  X,
  ChevronDown,
  Search,
  Warehouse,
  MapPin,
  Construction,
  Bot,
  Lightbulb,
  ArrowRight,
  QrCode,
  Save,
  Package,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { apiServices, extractDrfErrorMessage } from '@/lib/api';
import type {
  CreateInput,
  Item,
  Project,
  StockBalance,
  StockMovement,
  StockMovementType,
  StorageLocation,
} from '@/types/api';

function qtyAtMovementZone(balances: StockBalance[], locationId: string): number {
  return balances
    .filter(
      (b) =>
        b.storage_location === locationId && (b.zone_label ?? '').trim() === '',
    )
    .reduce((sum, b) => sum + Number.parseFloat(b.quantity || '0'), 0);
}

function fmtQty(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(n);
}

export default function NewMovementPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetItemId = searchParams.get('itemId');
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [itemBalances, setItemBalances] = useState<StockBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    movementType: 'transfert' as StockMovementType,
    quantity: '',
    itemId: '',
    sourceLocationId: '',
    destinationLocationId: '',
    projectId: '',
    comment: '',
  });

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      apiServices.items.list({ page_size: 500 }),
      apiServices.storageLocations.list({ page_size: 500 }),
      apiServices.projects.list({ page_size: 500 }),
    ])
      .then(([itemsData, locationsData, projectsData]) => {
        if (!isMounted) return;
        setItems(itemsData);
        setLocations(locationsData);
        setProjects(projectsData);
        const itemInitial =
          presetItemId && itemsData.some((i) => i.id === presetItemId)
            ? presetItemId
            : itemsData[0]?.id ?? '';
        setFormData((prev) => ({
          ...prev,
          itemId: itemInitial,
          sourceLocationId: locationsData[0]?.id ?? '',
          destinationLocationId: locationsData[1]?.id ?? locationsData[0]?.id ?? '',
          projectId: projectsData[0]?.id ?? '',
        }));
      })
      .catch((error) => {
        console.error('Failed to load movement dependencies:', error);
      });
    return () => {
      isMounted = false;
    };
  }, [presetItemId]);

  useEffect(() => {
    if (!formData.itemId) {
      setItemBalances([]);
      return;
    }
    let isMounted = true;
    setBalancesLoading(true);
    apiServices.stockBalances
      .list({ item: formData.itemId, page_size: 500 })
      .then((rows) => {
        if (!isMounted) return;
        setItemBalances(rows);
      })
      .catch((error) => {
        console.error('Failed to load stock balances for item:', error);
        if (isMounted) setItemBalances([]);
      })
      .finally(() => {
        if (isMounted) setBalancesLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [formData.itemId]);

  const movementRequiresSource = useMemo(
    () => formData.movementType !== 'entree',
    [formData.movementType],
  );
  const movementRequiresDestination = useMemo(
    () => formData.movementType !== 'sortie',
    [formData.movementType],
  );

  const selectedItem = useMemo(
    () => items.find((i) => i.id === formData.itemId),
    [items, formData.itemId],
  );

  const quantityDelta = useMemo(() => {
    const raw = formData.quantity.trim().replace(',', '.');
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [formData.quantity]);

  const locationById = useMemo(
    () => new Map(locations.map((l) => [l.id, l.name])),
    [locations],
  );

  const sourceStock = useMemo(
    () =>
      movementRequiresSource && formData.sourceLocationId
        ? qtyAtMovementZone(itemBalances, formData.sourceLocationId)
        : null,
    [movementRequiresSource, formData.sourceLocationId, itemBalances],
  );

  const destinationStock = useMemo(
    () =>
      movementRequiresDestination && formData.destinationLocationId
        ? qtyAtMovementZone(itemBalances, formData.destinationLocationId)
        : null,
    [movementRequiresDestination, formData.destinationLocationId, itemBalances],
  );

  const projectedSource =
    sourceStock !== null && quantityDelta > 0 ? sourceStock - quantityDelta : null;
  const projectedDestination =
    destinationStock !== null && quantityDelta > 0
      ? destinationStock + quantityDelta
      : null;

  const unitLabel = selectedItem?.unit_name?.trim() || 'unités';

  const movementTypeLabel: Record<StockMovementType, string> = {
    entree: 'Entrée',
    sortie: 'Sortie',
    transfert: 'Transfert',
    retour: 'Retour',
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.itemId || !formData.quantity) {
      setSubmitError("Article et quantité sont requis.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    const payload: CreateInput<StockMovement> = {
      movement_type: formData.movementType,
      item: formData.itemId,
      quantity: formData.quantity,
      source_storage_location:
        movementRequiresSource && formData.sourceLocationId
          ? formData.sourceLocationId
          : null,
      destination_storage_location:
        movementRequiresDestination && formData.destinationLocationId
          ? formData.destinationLocationId
          : null,
      project: formData.projectId ? formData.projectId : null,
      comment: formData.comment,
    };
    try {
      await apiServices.stockMovements.create(payload);
    } catch (error) {
      console.error('Failed to save movement:', error);
      const apiMsg = extractDrfErrorMessage(error);
      setSubmitError(apiMsg ?? "Impossible d'enregistrer ce mouvement.");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    navigate('/inventory');
  };

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

            <form className="space-y-10" onSubmit={handleSubmit}>
              {submitError ? (
                <div className="rounded-xl border border-error/20 bg-error-container/20 px-4 py-3 text-sm text-error">
                  {submitError}
                </div>
              ) : null}
              {/* Section 1: Type & Quantity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block font-label text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Type de mouvement</label>
                  <div className="relative group">
                    <select
                      value={formData.movementType}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          movementType: e.target.value as StockMovementType,
                        }))
                      }
                      className="w-full h-16 pl-6 pr-12 bg-white border border-slate-100 rounded-2xl text-primary font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary appearance-none transition-all shadow-sm group-hover:border-slate-200"
                    >
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
                    min="0"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, quantity: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Section 2: Article Search */}
              <div className="space-y-3">
                <label className="block font-label text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Article / Matériel</label>
                <div className="relative group">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-hover:text-primary transition-colors" />
                  <select
                    className="w-full h-16 pl-14 pr-24 bg-white border border-slate-100 rounded-2xl text-primary font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm hover:border-slate-200 appearance-none"
                    value={formData.itemId}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, itemId: e.target.value }))
                    }
                  >
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.sku})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-400 uppercase tracking-tighter">CMD + K</div>
                </div>
              </div>

              {/* Section 3: Logistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block font-label text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Lieu Source</label>
                  <div className="relative group">
                    <select
                      className="w-full h-16 pl-6 pr-12 bg-white border border-slate-100 rounded-2xl text-primary font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary appearance-none transition-all shadow-sm group-hover:border-slate-200"
                      value={formData.sourceLocationId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          sourceLocationId: e.target.value,
                        }))
                      }
                      disabled={!movementRequiresSource}
                    >
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                    <Warehouse className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 w-5 h-5" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block font-label text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Lieu Destination</label>
                  <div className="relative group">
                    <select
                      className="w-full h-16 pl-6 pr-12 bg-white border border-slate-100 rounded-2xl text-primary font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary appearance-none transition-all shadow-sm group-hover:border-slate-200"
                      value={formData.destinationLocationId}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          destinationLocationId: e.target.value,
                        }))
                      }
                      disabled={!movementRequiresDestination}
                    >
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                    <MapPin className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Section 4: Project Assignment */}
              <div className="space-y-3">
                <label className="block font-label text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Chantier Associé</label>
                <div className="relative group">
                  <select
                    className="w-full h-16 pl-6 pr-12 bg-white border border-slate-100 rounded-2xl text-primary font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary appearance-none transition-all shadow-sm group-hover:border-slate-200"
                    value={formData.projectId}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, projectId: e.target.value }))
                    }
                  >
                    <option value="">Non assigné</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
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
                  value={formData.comment}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, comment: e.target.value }))
                  }
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
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-12 py-4 font-bold text-white bg-primary shadow-xl shadow-primary/20 hover:bg-primary-container hover:scale-[1.02] active:scale-[0.98] transition-all rounded-2xl flex items-center justify-center gap-3" 
                  type="submit"
                >
                  <Save className="w-5 h-5" />
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>

          {/* Contextual Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-8">
              <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
                <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-headline font-bold text-2xl text-primary tracking-tight">
                    Récapitulatif
                  </h3>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {movementTypeLabel[formData.movementType]}
                  </span>
                </div>
                <div className="space-y-8">
                  <div className="flex gap-5">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-2">
                      {selectedItem?.image_url?.trim() ? (
                        <img
                          alt={selectedItem.name}
                          className="h-full w-full object-contain"
                          src={selectedItem.image_url}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-slate-300" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Article sélectionné
                      </p>
                      {selectedItem ? (
                        <>
                          <p className="text-lg font-bold leading-tight text-primary">{selectedItem.name}</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            Réf. {selectedItem.sku || '—'}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">
                          {items.length === 0 ? 'Aucun article dans le catalogue.' : '—'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6 border-t border-slate-50 pt-8">
                    {balancesLoading ? (
                      <p className="text-center text-xs font-medium text-slate-400">Chargement des stocks…</p>
                    ) : null}

                    {movementRequiresSource && formData.sourceLocationId ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Lieu source
                        </p>
                        <p className="text-sm font-semibold text-primary">
                          {locationById.get(formData.sourceLocationId) ?? '—'}
                        </p>
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="text-slate-500">Stock actuel</span>
                          <span className="font-bold text-primary">
                            {fmtQty(sourceStock ?? 0)} {unitLabel}
                          </span>
                        </div>
                        {quantityDelta > 0 ? (
                          <div className="flex justify-between gap-3 text-sm">
                            <span className="text-slate-500">Après mouvement</span>
                            <span
                              className={cn(
                                'font-bold',
                                projectedSource !== null && projectedSource < 0
                                  ? 'text-error'
                                  : 'text-primary',
                              )}
                            >
                              {fmtQty(projectedSource ?? sourceStock ?? 0)} {unitLabel}
                            </span>
                          </div>
                        ) : null}
                        {projectedSource !== null && projectedSource < 0 ? (
                          <p className="text-[11px] font-medium text-error">
                            Quantité insuffisante sur cette ligne de stock (zone par défaut).
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {movementRequiresDestination && formData.destinationLocationId ? (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Lieu destination
                        </p>
                        <p className="text-sm font-semibold text-primary">
                          {locationById.get(formData.destinationLocationId) ?? '—'}
                        </p>
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="text-slate-500">Stock actuel</span>
                          <span className="font-bold text-primary">
                            {fmtQty(destinationStock ?? 0)} {unitLabel}
                          </span>
                        </div>
                        {quantityDelta > 0 ? (
                          <div className="flex justify-between gap-3 text-sm">
                            <span className="text-slate-500">Après mouvement</span>
                            <span className="font-bold text-primary">
                              {fmtQty(projectedDestination ?? destinationStock ?? 0)} {unitLabel}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {!balancesLoading &&
                    selectedItem &&
                    (movementRequiresSource || movementRequiresDestination) &&
                    quantityDelta <= 0 ? (
                      <p className="text-[11px] text-slate-400">
                        Indiquez une quantité pour voir l&apos;impact sur les stocks (zones sans étiquette
                        uniquement, comme lors de l&apos;enregistrement du mouvement).
                      </p>
                    ) : null}
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
