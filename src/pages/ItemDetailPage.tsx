import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  AlertTriangle,
  History,
  MapPin,
  Info,
  ChevronRight,
  ExternalLink,
  FileText,
  Building2,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiServices } from '@/lib/api';
import type {
  ItemDetailResponse,
  StockMovement,
  StockMovementType,
} from '@/types/api';

function PanelSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-100 bg-white animate-pulse space-y-4 p-8',
        tall ? 'min-h-[280px]' : 'min-h-[200px]',
      )}
    >
      <div className="h-3 w-32 bg-slate-100 rounded" />
      <div className="h-8 w-24 bg-slate-100 rounded" />
      <div className="h-20 bg-slate-50 rounded-xl" />
    </div>
  );
}

const MOV_LABEL: Record<StockMovementType, string> = {
  entree: 'Entrée',
  sortie: 'Sortie',
  transfert: 'Transfert',
  retour: 'Retour',
};

function movementBadgeClass(t: StockMovementType): string {
  switch (t) {
    case 'entree':
      return 'bg-primary-fixed text-primary';
    case 'sortie':
      return 'bg-error-container text-on-error-container';
    case 'transfert':
      return 'bg-secondary-container text-on-secondary-container';
    case 'retour':
    default:
      return 'bg-primary-container text-on-primary-container';
  }
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function fmtQty(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n);
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<ItemDetailResponse | null>(null);

  useEffect(() => {
    if (!id) return;
    let live = true;
    setDetailLoading(true);
    setDetailError(null);

    const load = async () => {
      const [detailRes] = await Promise.allSettled([apiServices.items.detailBundle(id)]);
      if (!live) return;
      if (detailRes.status === 'fulfilled') {
        setBundle(detailRes.value);
      } else {
        setDetailError('Impossible de charger la fiche article.');
        setBundle(null);
      }
      setDetailLoading(false);
    };
    void load();
    return () => {
      live = false;
    };
  }, [id]);

  const item = bundle?.item;
  const balances = bundle?.balances ?? [];
  const movements = bundle?.movements ?? [];
  const assignments = bundle?.assignments ?? [];

  const totalStock = useMemo(
    () => balances.reduce((acc, b) => acc + Number(b.quantity || 0), 0),
    [balances],
  );

  const predictiveText = useMemo(() => {
    if (totalStock <= 0) return null;
    const sortieVol = movements
      .filter((m) => m.movement_type === 'sortie')
      .reduce((s, m) => s + Number(m.quantity || 0), 0);
    const n = Math.max(1, movements.length);
    const avgDaily = sortieVol / n;
    if (avgDaily <= 0) return 'Pas assez de sorties récentes pour estimer la consommation.';
    const days = totalStock / avgDaily;
    return `Estimation grossière : environ ${fmtQty(Math.round(days))} jours de stock au rythme observé sur les derniers mouvements affichés (non projeté chantier).`;
  }, [totalStock, movements]);

  const imageSrc = item?.image_url?.trim() ? item.image_url : undefined;

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
            <Link to="/inventory" className="hover:text-primary transition-colors">
              Inventaire
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary">Détail article</span>
          </nav>
          {detailLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-10 w-64 bg-slate-100 rounded-lg" />
              <div className="h-4 w-96 bg-slate-50 rounded" />
            </div>
          ) : (
            <>
              <h2 className="text-4xl font-headline font-extrabold text-primary tracking-tight">
                {item?.name ?? 'Article'}
              </h2>
              <p className="text-slate-500 mt-1 font-medium">
                {item?.sku ?? '—'} • {item?.description?.trim() ? item.description : 'Sans description'}
              </p>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!id}
            onClick={() => id && navigate(`/inventory/${id}/edit`)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-primary font-bold rounded-xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all disabled:opacity-40"
          >
            Modifier
          </button>
          <button
            type="button"
            disabled={!id}
            onClick={() => id && navigate(`/inventory/new-movement?itemId=${encodeURIComponent(id)}`)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-container transition-all active:scale-95 disabled:opacity-40"
          >
            <ArrowLeftRight className="w-5 h-5" />
            Enregistrer un mouvement
          </button>
          <button
            type="button"
            className="flex items-center justify-center w-12 h-12 text-error bg-error-container/10 border border-error/10 hover:bg-error-container/20 rounded-xl transition-all"
            title="Déclarer une perte"
          >
            <AlertTriangle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {detailError ? (
        <div className="rounded-xl border border-error/20 bg-error-container/10 px-4 py-3 text-sm text-error">
          {detailError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-8">
          {detailLoading ? (
            <PanelSkeleton tall />
          ) : (
            <div className="bg-white rounded-2xl overflow-hidden aspect-square flex items-center justify-center shadow-sm border border-slate-100 p-12">
              {imageSrc ? (
                <img
                  className="w-full h-full object-contain"
                  src={imageSrc}
                  alt={item?.name ?? ''}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-slate-400 text-sm">Aucune image</span>
              )}
            </div>
          )}

          {detailLoading ? (
            <PanelSkeleton />
          ) : (
            <div className="bg-primary text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <Sparkles className="w-5 h-5 text-primary-fixed" />
                </div>
                <h3 className="font-headline font-bold text-lg">Indicateur simple</h3>
              </div>
              <div className="space-y-4 relative z-10">
                <div className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary-fixed mb-1">
                    Stock total
                  </p>
                  <p className="text-sm font-medium leading-relaxed">{fmtQty(totalStock)} unités sur tous les lieux.</p>
                </div>
                <div className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary-fixed mb-1">
                    Projection indicative
                  </p>
                  <p className="text-sm font-medium leading-relaxed">{predictiveText ?? '—'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {detailLoading ? (
              <>
                <PanelSkeleton tall />
                <PanelSkeleton tall />
              </>
            ) : (
              <>
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-primary">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Stock par lieu
                  </h3>
                  <div className="space-y-6">
                    {balances.length === 0 ? (
                      <p className="text-sm text-slate-500">Aucune ligne de stock.</p>
                    ) : (
                      balances.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-end justify-between border-b border-slate-50 pb-4 last:border-0"
                        >
                          <div>
                            <p className="font-headline font-bold text-primary">
                              {b.storage_location_name ?? '—'}
                            </p>
                            <p className="text-xs text-slate-500 font-medium">
                              {b.zone_label?.trim() ? b.zone_label : 'Zone principale'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-headline font-extrabold text-primary">
                              {fmtQty(Number(b.quantity || 0))}
                            </p>
                            <p className="text-[10px] font-bold uppercase text-slate-400">Unités</p>
                          </div>
                        </div>
                      ))
                    )}
                    <div className="pt-4 flex items-baseline gap-2">
                      <span className="text-3xl font-headline font-extrabold text-primary">
                        {fmtQty(totalStock)}
                      </span>
                      <span className="text-sm font-bold text-slate-400">Total disponible</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Informations générales
                  </h3>
                  <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Catégorie</p>
                      <p className="text-sm font-bold text-primary">{item?.category_name ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Marque</p>
                      <p className="text-sm font-bold text-primary">{item?.brand?.trim() ? item.brand : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Prix unitaire</p>
                      <p className="text-sm font-bold text-primary">
                        {item?.unit_price != null && item.unit_price !== ''
                          ? `${fmtQty(Number(item.unit_price))} ${item.currency ?? 'FCFA'}`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Condition</p>
                      <p className="text-sm font-bold text-primary">{item?.condition?.trim() ? item.condition : '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Fournisseur</p>
                      <p className="text-sm font-bold text-primary">
                        {item?.supplier_display?.trim()
                          ? item.supplier_display
                          : item?.supplier_name?.trim()
                            ? item.supplier_name
                            : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 border-b border-slate-100">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <History className="w-4 h-4" />
                Historique des mouvements (10 derniers)
              </h3>
              <Link
                to="/movements"
                className="text-primary text-xs font-bold hover:underline flex items-center gap-1"
              >
                Voir tout l&apos;historique
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            {detailLoading ? (
              <div className="p-8">
                <PanelSkeleton />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-50">
                      <th className="px-8 py-4 text-[10px] font-bold uppercase text-slate-400">Date</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase text-slate-400">Type</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase text-slate-400">De</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase text-slate-400">Vers</th>
                      <th className="px-8 py-4 text-[10px] font-bold uppercase text-slate-400 text-right">
                        Qté
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-8 text-sm text-slate-500 text-center">
                          Aucun mouvement enregistré.
                        </td>
                      </tr>
                    ) : (
                      movements.map((mv: StockMovement) => {
                        const qty = Number(mv.quantity || 0);
                        const signed =
                          mv.movement_type === 'sortie' ? -Math.abs(qty) : Math.abs(qty);
                        return (
                          <tr key={mv.id} className="hover:bg-slate-50 transition-colors duration-200">
                            <td className="px-8 py-4 text-sm font-bold text-primary">
                              {fmtDate(mv.created_at)}
                            </td>
                            <td className="px-8 py-4">
                              <span
                                className={cn(
                                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase',
                                  movementBadgeClass(mv.movement_type),
                                )}
                              >
                                {MOV_LABEL[mv.movement_type]}
                              </span>
                            </td>
                            <td className="px-8 py-4 text-sm text-slate-500 font-medium">
                              {mv.source_storage_location_name ?? '—'}
                            </td>
                            <td className="px-8 py-4 text-sm text-slate-500 font-medium">
                              {mv.destination_storage_location_name ?? '—'}
                            </td>
                            <td
                              className={cn(
                                'px-8 py-4 text-sm font-extrabold text-right font-mono',
                                signed < 0 ? 'text-error' : 'text-emerald-600',
                              )}
                            >
                              {signed > 0 ? `+${fmtQty(signed)}` : fmtQty(signed)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Affectations chantier
            </h3>
            {detailLoading ? (
              <PanelSkeleton />
            ) : (
              <div className="flex flex-wrap gap-4">
                {assignments.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune affectation active.</p>
                ) : (
                  assignments.map((as) => (
                    <Link
                      key={as.id}
                      to={`/projects/${as.project}`}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 min-w-[240px] hover:border-primary transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">{as.project_name ?? 'Chantier'}</p>
                        <p className="text-xs text-slate-500 font-medium">
                          {as.project_reference ? `${as.project_reference} · ` : ''}
                          Affecté le {as.assigned_at ?? '—'}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
                <button
                  type="button"
                  className="flex items-center gap-3 p-4 border-2 border-slate-100 border-dashed rounded-xl min-w-[240px] justify-center text-slate-400 hover:text-primary hover:border-primary hover:bg-slate-50 transition-all group"
                >
                  <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold">Affecter à un chantier</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
