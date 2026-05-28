import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  X,
  ChevronDown,
  Search,
  Warehouse,
  MapPin,
  Construction,
  Save,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiServices, extractDrfErrorMessage } from '@/lib/api';
import type {
  Item,
  Project,
  StockBalance,
  StockMovementLossReason,
  StockMovementCreatePayload,
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

function fmtMoneyAmount(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

type AdjustmentSense = 'decrease' | 'increase';

export default function NewMovementPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetItemId = searchParams.get('itemId');
  const duplicateFromId = searchParams.get('duplicateFrom');

  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [itemBalances, setItemBalances] = useState<StockBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [approvalHint, setApprovalHint] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    movementType: 'transfert' as StockMovementType,
    adjustmentSense: 'decrease' as AdjustmentSense,
    quantity: '',
    itemId: '',
    sourceLocationId: '',
    destinationLocationId: '',
    projectId: '',
    comment: '',
    unitPriceAtMovement: '',
    lossReason: '' as StockMovementLossReason | '',
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
    if (!duplicateFromId) return;
    let isMounted = true;
    apiServices.stockMovements
      .get(duplicateFromId)
      .then((m) => {
        if (!isMounted) return;
        const adjustmentSense: AdjustmentSense = m.source_storage_location ? 'decrease' : 'increase';
        setFormData((prev) => ({
          ...prev,
          movementType: m.movement_type,
          quantity: String(m.quantity ?? ''),
          itemId: m.item,
          sourceLocationId: m.source_storage_location ?? '',
          destinationLocationId: m.destination_storage_location ?? '',
          projectId: m.project ?? '',
          comment: m.comment ?? '',
          unitPriceAtMovement:
            (m.unit_price_at_movement?.trim?.() ?? '') ||
            prev.unitPriceAtMovement,
          adjustmentSense,
          lossReason: (m.loss_reason ?? '') as StockMovementLossReason | '',
        }));
      })
      .catch((e) => console.error(e));
    return () => {
      isMounted = false;
    };
  }, [duplicateFromId]);

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

  const selectedItem = useMemo(
    () => items.find((i) => i.id === formData.itemId),
    [items, formData.itemId],
  );

  useEffect(() => {
    if (!selectedItem?.unit_price) return;
    setFormData((prev) =>
      prev.unitPriceAtMovement.trim()
        ? prev
        : { ...prev, unitPriceAtMovement: selectedItem.unit_price ?? '' },
    );
  }, [selectedItem]);

  const movementRequiresSource = useMemo(() => {
    const t = formData.movementType;
    if (t === 'entree') return false;
    if (t === 'sortie') return true;
    if (t === 'transfert') return true;
    if (t === 'retour') return false;
    if (t === 'ajustement') return formData.adjustmentSense === 'decrease';
    return false;
  }, [formData.movementType, formData.adjustmentSense]);

  const movementRequiresDestination = useMemo(() => {
    const t = formData.movementType;
    if (t === 'entree') return true;
    if (t === 'sortie') return false;
    if (t === 'transfert') return true;
    if (t === 'retour') return true;
    if (t === 'ajustement') return formData.adjustmentSense === 'increase';
    return false;
  }, [formData.movementType, formData.adjustmentSense]);

  const quantityDelta = useMemo(() => {
    const raw = formData.quantity.trim().replace(',', '.');
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [formData.quantity]);

  const unitPriceNum = useMemo(() => {
    const raw = formData.unitPriceAtMovement.trim().replace(',', '.');
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [formData.unitPriceAtMovement]);

  const totalCostDisplay = quantityDelta > 0 && unitPriceNum > 0 ? quantityDelta * unitPriceNum : null;

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
    ajustement: 'Ajustement',
  };

  useEffect(() => {
    const t = formData.movementType;
    if (!['sortie', 'transfert', 'ajustement'].includes(t)) {
      setApprovalHint(null);
      return;
    }
    let ok = true;
    const total = quantityDelta > 0 && unitPriceNum > 0 ? quantityDelta * unitPriceNum : 0;
    const params: Record<string, string | number | boolean> = {
      movement_type: t,
      threshold_lte_cost: total,
      is_active: true,
      page_size: 25,
    };
    if (formData.projectId.trim()) {
      params.project = formData.projectId;
    }
    apiServices.approvalRules
      .list(params)
      .then((rules) => {
        if (!ok || rules.length === 0) {
          setApprovalHint(null);
          return;
        }
        const roles = [...new Set(rules.map((r) => r.approver_role_name ?? r.approver_role_code).filter(Boolean))];
        const label =
          roles.length > 0
            ? `Ce mouvement pourra être soumis en validation (${roles.join(', ')} selon les règles actives).`
            : null;
        setApprovalHint(label);
      })
      .catch(() => {
        if (ok) setApprovalHint(null);
      });
    return () => {
      ok = false;
    };
  }, [formData.movementType, formData.projectId, quantityDelta, unitPriceNum]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.itemId || !formData.quantity) {
      setSubmitError('Article et quantité sont requis.');
      return;
    }
    if (formData.movementType === 'sortie' && !formData.projectId) {
      setSubmitError('Un chantier est requis pour une sortie.');
      return;
    }
    if (formData.movementType === 'ajustement' && movementRequiresSource && !formData.lossReason.trim()) {
      setSubmitError('Sélectionnez un motif pour un ajustement diminuant le stock.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    const payload: StockMovementCreatePayload = {
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
      unit_price_at_movement:
        formData.movementType === 'entree' || formData.movementType === 'retour'
          ? formData.unitPriceAtMovement.trim()
            ? formData.unitPriceAtMovement.trim().replace(',', '.')
            : null
          : null,
      loss_reason: formData.lossReason.trim()
        ? (formData.lossReason as StockMovementLossReason)
        : '',
    };

    try {
      await apiServices.stockMovements.createWithOptionalAttachment(
        payload,
        attachmentFile ?? undefined,
      );
    } catch (error) {
      console.error('Failed to save movement:', error);
      const apiMsg = extractDrfErrorMessage(error);
      setSubmitError(apiMsg ?? "Impossible d'enregistrer ce mouvement.");
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    navigate('/movements');
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-100 bg-surface/80 px-6 py-6 backdrop-blur-md md:px-10">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
            <Construction className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-headline text-xl font-extrabold uppercase tracking-tight text-primary">
              Bâtir Pro
            </h1>
            <p className="font-label text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Nouveau mouvement
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition-all hover:bg-slate-100 hover:text-primary"
        >
          <X className="h-5 w-5" />
          <span className="hidden sm:inline">Annuler</span>
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-32 pt-8 md:px-10">
        {approvalHint ? (
          <div className="mb-8 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            <p>{approvalHint}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="mb-12">
              <h2 className="font-headline mb-3 text-4xl font-bold tracking-tight text-primary">
                Enregistrer un nouveau mouvement
              </h2>
              <p className="text-lg text-slate-500">
                Renseignez le flux réel avec les validations métier nécessaires.
              </p>
            </div>

            <form className="space-y-10" onSubmit={(e) => void handleSubmit(e)}>
              {submitError ? (
                <div className="rounded-xl border border-error/20 bg-error-container/20 px-4 py-3 text-sm text-error">
                  {submitError}
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="font-label mb-4 ml-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Type de mouvement
                  </label>
                  <div className="group relative">
                    <select
                      value={formData.movementType}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          movementType: e.target.value as StockMovementType,
                        }))
                      }
                      className="h-16 w-full appearance-none rounded-2xl border border-slate-100 bg-white pl-6 pr-12 font-bold text-primary shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 group-hover:border-slate-200"
                    >
                      <option value="entree">Entrée (Réception Fournisseur)</option>
                      <option value="sortie">Sortie (Usage Chantier)</option>
                      <option value="transfert">Transfert Inter-Sites</option>
                      <option value="retour">Retour de Chantier</option>
                      <option value="ajustement">Ajustement / Correction</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="font-label mb-4 ml-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Quantité
                  </label>
                  <input
                    className="h-16 w-full rounded-2xl border border-slate-100 bg-white px-6 font-bold text-primary shadow-sm transition-all hover:border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5"
                    placeholder="0.00"
                    type="number"
                    min="0"
                    step="any"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, quantity: e.target.value }))
                    }
                  />
                </div>
              </div>

              {formData.movementType === 'ajustement' ? (
                <div className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/50 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-violet-800">
                    Ajustement du stock (un seul emplacement)
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                      <input
                        type="radio"
                        name="adjSense"
                        checked={formData.adjustmentSense === 'decrease'}
                        onChange={() =>
                          setFormData((p) => ({ ...p, adjustmentSense: 'decrease' }))
                        }
                      />
                      Diminution (lieu source)
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                      <input
                        type="radio"
                        name="adjSense"
                        checked={formData.adjustmentSense === 'increase'}
                        onChange={() =>
                          setFormData((p) => ({ ...p, adjustmentSense: 'increase' }))
                        }
                      />
                      Surplus retrouvé (lieu destination)
                    </label>
                  </div>
                  {movementRequiresSource && (
                    <div className="space-y-2">
                      <label className="font-label ml-1 text-[11px] font-bold uppercase text-slate-500">
                        Motif (obligatoire)
                      </label>
                      <select
                        value={formData.lossReason}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            lossReason: e.target.value as StockMovementLossReason | '',
                          }))
                        }
                        className="h-12 w-full max-w-md rounded-xl border border-slate-100 bg-white px-4 font-semibold text-primary"
                      >
                        <option value="">Choisir…</option>
                        <option value="perte">Perte</option>
                        <option value="casse">Casse / Détérioration</option>
                        <option value="vol">Vol</option>
                        <option value="peremption">Péremption</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="space-y-3">
                <label className="font-label mb-4 ml-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Article / Matériel
                </label>
                <div className="group relative">
                  <Search className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-hover:text-primary" />
                  <select
                    className="h-16 w-full appearance-none rounded-2xl border border-slate-100 bg-white pl-14 pr-24 font-bold text-primary shadow-sm transition-all hover:border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5"
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
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="font-label mb-4 ml-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Lieu source
                  </label>
                  <div className="group relative">
                    <select
                      className="h-16 w-full appearance-none rounded-2xl border border-slate-100 bg-white pl-6 pr-12 font-bold text-primary shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 group-hover:border-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <Warehouse className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="font-label mb-4 ml-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Lieu destination
                  </label>
                  <div className="group relative">
                    <select
                      className="h-16 w-full appearance-none rounded-2xl border border-slate-100 bg-white pl-6 pr-12 font-bold text-primary shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 group-hover:border-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <MapPin className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="font-label mb-4 ml-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Chantier associé
                </label>
                <div className="group relative">
                  <select
                    className="h-16 w-full appearance-none rounded-2xl border border-slate-100 bg-white pl-6 pr-12 font-bold text-primary shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/5 group-hover:border-slate-200"
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
                  <Construction className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="font-label mb-4 ml-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    {formData.movementType === 'entree'
                      ? "Prix unitaire d'achat (figé pour ce mouvement)"
                      : 'Prix unitaire'}
                  </label>
                  {formData.movementType === 'entree' || formData.movementType === 'retour' ? (
                    <input
                      className="h-16 w-full rounded-2xl border border-slate-100 bg-white px-6 font-bold text-primary shadow-sm"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.unitPriceAtMovement}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, unitPriceAtMovement: e.target.value }))
                      }
                    />
                  ) : (
                    <div className="flex h-16 w-full items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-sm font-semibold text-slate-500">
                      Coût calculé automatiquement à la validation
                      <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        méthode de valorisation
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <label className="font-label mb-4 ml-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Pièce jointe (Bon de livraison, photo…)
                  </label>
                  <input
                    type="file"
                    className="w-full rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm font-medium text-primary"
                    onChange={(e) =>
                      setAttachmentFile(e.target.files?.[0] ?? null)
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="font-label mb-4 ml-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Commentaire / Note
                </label>
                <textarea
                  className="w-full resize-none rounded-2xl border border-slate-100 bg-white p-6 font-bold text-primary shadow-sm transition-all hover:border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/5"
                  placeholder="Instructions opérationnelles, nom du destinataire, etc."
                  rows={4}
                  value={formData.comment}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, comment: e.target.value }))
                  }
                />
              </div>

              <div className="flex flex-col items-center justify-end gap-4 border-t border-slate-100 pt-12 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="w-full rounded-2xl px-8 py-4 font-bold text-slate-400 transition-all hover:bg-slate-50 hover:text-primary sm:w-auto"
                >
                  Annuler
                </button>
                <button
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary px-12 py-4 font-bold text-white shadow-xl shadow-primary/20 transition-all hover:bg-primary-container hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 sm:w-auto"
                  type="submit"
                >
                  <Save className="h-5 w-5" />
                  {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-8">
              <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50">
                <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
                  <h3 className="font-headline text-2xl font-bold tracking-tight text-primary">
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
                          <p className="text-lg font-bold leading-tight text-primary">
                            {selectedItem.name}
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            Réf. {selectedItem.sku || '—'}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">
                          {items.length === 0
                            ? 'Aucun article dans le catalogue.'
                            : '—'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-50 pt-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Coût total estimé</span>
                      <span className="font-bold text-primary">
                        {totalCostDisplay != null
                          ? `${fmtMoneyAmount(totalCostDisplay)} ${selectedItem?.currency?.trim() || 'FCFA'}`
                          : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-6 border-t border-slate-50 pt-8">
                    {balancesLoading ? (
                      <p className="text-center text-xs font-medium text-slate-400">
                        Chargement des stocks…
                      </p>
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
                        Indiquez une quantité pour voir l&apos;impact sur les stocks (zones sans
                        étiquette uniquement, comme lors de l&apos;enregistrement du mouvement).
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
