import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  Upload,
  Plus,
  Search,
  AlertTriangle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Hammer,
  Package as PackageIcon,
  Palette,
  HardHat,
  TrendingUp,
  BarChart3,
  Bell,
  History,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { apiServices } from '@/lib/api';
import type { Category, DashboardSummary, Item, StorageLocation, StockValuationReport, Supplier } from '@/types/api';

function TableSkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td colSpan={cols} className="px-6 py-4">
            <div className="h-10 bg-surface-container-high rounded-lg w-full" />
          </td>
        </tr>
      ))}
    </>
  );
}

function BottomKpiSkeleton() {
  return (
    <div className="bg-white p-6 rounded-2xl animate-pulse border border-surface-container-high space-y-3">
      <div className="h-3 w-28 bg-surface-container-high rounded" />
      <div className="h-9 w-32 bg-surface-container-high rounded" />
      <div className="h-3 w-full bg-surface-container rounded" />
    </div>
  );
}

function pickIcon(item: Item) {
  const hay = `${item.category_name ?? ''} ${item.subcategory_label ?? ''} ${item.name}`.toLowerCase();
  if (hay.includes('ciment') || hay.includes('peint')) return Palette;
  if (hay.includes('épi') || hay.includes('epi') || hay.includes('gant')) return HardHat;
  if (hay.includes('outil')) return Hammer;
  return PackageIcon;
}

function fmtQty(q?: string) {
  const n = q != null && q !== '' ? Number(q) : NaN;
  return Number.isFinite(n) ? new Intl.NumberFormat('fr-FR').format(n) : '—';
}

function fmtMoney(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  return `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
}

function stockStatusUi(status?: Item['stock_status']) {
  switch (status) {
    case 'available':
      return {
        label: 'Disponible',
        statusColor: 'text-green-700 bg-green-50 border-green-100',
        dotColor: 'bg-green-500',
      };
    case 'low':
      return {
        label: 'Stock faible',
        statusColor: 'text-orange-700 bg-orange-50 border-orange-100',
        dotColor: 'bg-orange-500',
      };
    case 'stockout':
    default:
      return {
        label: 'Rupture',
        statusColor: 'text-red-700 bg-red-50 border-red-100',
        dotColor: 'bg-red-500',
      };
  }
}

type SortField = 'name' | 'sku' | 'unit_price' | 'min_stock' | 'created_at';

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [categoryId, setCategoryId] = useState('');
  const [storageLocationId, setStorageLocationId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [stockStatus, setStockStatus] = useState<
    '' | 'available' | 'low' | 'stockout' | 'critical'
  >('');
  const [criticalOnly, setCriticalOnly] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDesc, setSortDesc] = useState(false);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Inventaire valorisé
  const [valuationOpen, setValuationOpen] = useState(false);
  const [valuation, setValuation] = useState<StockValuationReport | null>(null);
  const [valuationLoading, setValuationLoading] = useState(false);
  const [valuationError, setValuationError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let live = true;
    Promise.all([
      apiServices.categories.list({ page_size: 500 }),
      apiServices.storageLocations.list({ page_size: 500 }),
      apiServices.suppliers.list({ page_size: 500 }),
    ])
      .then(([c, l, s]) => {
        if (!live) return;
        setCategories(c);
        setLocations(l);
        setSuppliers(s);
      })
      .catch(() => {
        /* déjà signalé par chargements principaux */
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let live = true;
    setSummaryLoading(true);
    apiServices.dashboard
      .summary()
      .then((s) => {
        if (!live) return;
        setSummary(s);
      })
      .catch(() => {
        if (!live) return;
        setSummary(null);
      })
      .finally(() => {
        if (live) setSummaryLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const ordering = useMemo(() => {
    const prefix = sortDesc ? '-' : '';
    return `${prefix}${sortField}`;
  }, [sortField, sortDesc]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const effectiveStatus = criticalOnly ? 'critical' : stockStatus || undefined;
    apiServices.inventory
      .list({
        page,
        category: categoryId || undefined,
        storage_location: storageLocationId || undefined,
        supplier: supplierId || undefined,
        stock_status: effectiveStatus || undefined,
        search: debouncedSearch || undefined,
        ordering,
      })
      .then((data) => {
        if (cancelled) return;
        setItems(data.results);
        setTotal(data.count);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) {
          setError("Impossible de charger l'inventaire.");
          setItems([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    page,
    categoryId,
    storageLocationId,
    supplierId,
    stockStatus,
    criticalOnly,
    debouncedSearch,
    ordering,
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  const toggleSort = useCallback((field: SortField) => {
    setPage(1);
    setSortField((prev) => {
      if (prev === field) {
        setSortDesc((d) => !d);
        return prev;
      }
      setSortDesc(false);
      return field;
    });
  }, []);

  const loadValuation = useCallback(async () => {
    if (valuationOpen) {
      setValuationOpen(false);
      return;
    }
    setValuationOpen(true);
    if (valuation) return; // déjà chargé
    setValuationLoading(true);
    setValuationError(null);
    try {
      const report = await apiServices.items.stockValuation();
      setValuation(report);
    } catch {
      setValuationError("Impossible de charger l'inventaire valorisé.");
    }
    setValuationLoading(false);
  }, [valuationOpen, valuation]);

  const METHOD_LABELS: Record<string, string> = {
    last_price: "Dernier prix d'achat connu",
    wac: 'Coût moyen pondéré (CUMP)',
    fifo: 'FIFO / PEPS (Premier entré, premier sorti)',
  };

  return (
    <div className="space-y-10">
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight font-headline">
            Inventaire du Chantier
          </h2>
          <p className="text-on-surface-variant mt-2 max-w-2xl text-sm md:text-base">
            Gérez l&apos;ensemble de votre parc matériel et consommables. Visualisez l&apos;état des stocks en temps réel sur tous les dépôts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 text-primary bg-white border border-outline-variant/30 rounded-xl font-semibold text-sm hover:bg-surface-container-low transition-all duration-400"
          >
            <Download className="w-4 h-4 md:w-5 md:h-5" />
            <span>Exporter</span>
          </button>
          <button
            type="button"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 text-primary bg-white border border-outline-variant/30 rounded-xl font-semibold text-sm hover:bg-surface-container-low transition-all duration-400"
          >
            <Upload className="w-4 h-4 md:w-5 md:h-5" />
            <span>Importer</span>
          </button>
          <button
            type="button"
            onClick={loadValuation}
            className={cn(
              'flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-400',
              valuationOpen
                ? 'bg-primary text-white shadow-md'
                : 'text-primary bg-white border border-outline-variant/30 hover:bg-surface-container-low',
            )}
          >
            <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />
            <span>Inventaire valorisé</span>
          </button>
          <Link
            to="/inventory/new"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-semibold text-sm shadow-xl shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-400"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter un article</span>
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 md:gap-6 bg-surface-container-low/50 p-4 md:p-6 rounded-2xl">
        <div className="space-y-2 xl:col-span-1">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">
            Catégorie
          </label>
          <select
            className="w-full bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-fixed shadow-sm"
            value={categoryId}
            onChange={(e) => {
              setPage(1);
              setCategoryId(e.target.value);
            }}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 xl:col-span-1">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">
            Lieu de stockage
          </label>
          <select
            className="w-full bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-fixed shadow-sm"
            value={storageLocationId}
            onChange={(e) => {
              setPage(1);
              setStorageLocationId(e.target.value);
            }}
          >
            <option value="">Tous les lieux</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 xl:col-span-1">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">
            Fournisseur
          </label>
          <select
            className="w-full bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-fixed shadow-sm"
            value={supplierId}
            onChange={(e) => {
              setPage(1);
              setSupplierId(e.target.value);
            }}
          >
            <option value="">Tous</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 xl:col-span-1">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">
            Statut de stock
          </label>
          <select
            className="w-full bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-fixed shadow-sm"
            value={stockStatus}
            onChange={(e) => {
              setPage(1);
              setCriticalOnly(false);
              setStockStatus(e.target.value as typeof stockStatus);
            }}
          >
            <option value="">Tous les statuts</option>
            <option value="available">Disponible</option>
            <option value="low">Stock faible</option>
            <option value="stockout">Rupture</option>
          </select>
        </div>
        <div className="flex items-end xl:col-span-1">
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setStockStatus('');
              setCriticalOnly((v) => !v);
            }}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-tighter transition-colors',
              criticalOnly
                ? 'bg-error text-white shadow-md'
                : 'bg-error-container text-on-error-container hover:bg-error/10',
            )}
          >
            <AlertTriangle className="w-4 h-4" />
            Stock critique
          </button>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            placeholder="Rechercher articles (réf., nom, code-barres…)"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-outline-variant/20 bg-white text-sm focus:ring-2 focus:ring-primary"
            value={searchInput}
            onChange={(e) => {
              setPage(1);
              setSearchInput(e.target.value);
            }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-surface-container-high">
        {error ? (
          <div className="p-6 text-sm text-error">{error}</div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-surface-container-high/40">
                <th className="px-6 py-4 text-[10px] font-bold text-on-primary-fixed-variant uppercase tracking-widest">
                  Référence
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-primary-fixed-variant uppercase tracking-widest">
                  <button type="button" className="hover:text-primary" onClick={() => toggleSort('name')}>
                    Article {sortField === 'name' ? (sortDesc ? '↓' : '↑') : ''}
                  </button>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-primary-fixed-variant uppercase tracking-widest">
                  Catégorie
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-primary-fixed-variant uppercase tracking-widest">
                  Lieu
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-primary-fixed-variant uppercase tracking-widest text-right">
                  Quantité
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-primary-fixed-variant uppercase tracking-widest text-right">
                  <button type="button" className="hover:text-primary" onClick={() => toggleSort('min_stock')}>
                    Seuil {sortField === 'min_stock' ? (sortDesc ? '↓' : '↑') : ''}
                  </button>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-primary-fixed-variant uppercase tracking-widest text-center">
                  Statut
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-primary-fixed-variant uppercase tracking-widest">
                  Valeur stock
                </th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-dim/10">
              {loading ? (
                <TableSkeletonRows cols={9} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-500 text-sm">
                    Aucun article ne correspond à ces critères.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const Icon = pickIcon(item);
                  const ui = stockStatusUi(item.stock_status);
                  return (
                    <tr key={item.id} className="hover:bg-surface-container-low transition-colors duration-200 group">
                      <td className="px-6 py-5">
                        <button type="button" className="font-mono text-xs font-semibold text-slate-500">
                          {item.sku}
                        </button>
                      </td>
                      <td className="px-6 py-5">
                        <Link to={`/inventory/${item.id}`} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-primary group-hover:underline">{item.name}</p>
                            <p className="text-[11px] text-slate-400">
                              {item.description?.trim() ? item.description.slice(0, 80) : 'Sans description'}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-2 py-1 bg-surface-container-high rounded-full text-[10px] font-bold text-slate-600 uppercase">
                          {item.category_name ?? '—'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500">Multi-dépôts</td>
                      <td className="px-6 py-5 text-right font-headline font-bold text-primary">
                        {fmtQty(item.total_stock)}
                      </td>
                      <td className="px-6 py-5 text-right text-sm text-slate-400">{fmtQty(item.min_stock)}</td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center">
                          <span
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter border',
                              ui.statusColor,
                            )}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full', ui.dotColor)} />
                            {ui.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-600 font-mono">{fmtMoney(Number(item.stock_value))}</td>
                      <td className="px-6 py-5 text-right">
                        <Link to={`/inventory/${item.id}`} className="p-2 inline-flex hover:bg-white rounded-lg text-slate-400 hover:text-primary transition-all">
                          <MoreVertical className="w-5 h-5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-low/30 border-t border-surface-dim/10">
          <p className="text-xs text-slate-500 font-medium">
            Affichage de{' '}
            <span className="font-bold text-primary">
              {rangeStart}-{rangeEnd}
            </span>{' '}
            sur <span className="font-bold text-primary">{fmtQty(String(total))}</span> articles
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-1 text-slate-400 hover:text-primary disabled:opacity-30"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs text-slate-600 px-2">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              className="p-1 text-slate-400 hover:text-primary disabled:opacity-30"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Inventaire valorisé (GAP-03) */}
      {valuationOpen ? (
        <section className="space-y-4">
          {valuationLoading ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm text-center text-sm text-slate-400">
              Chargement de l'inventaire valorisé…
            </div>
          ) : valuationError ? (
            <div className="bg-white p-6 rounded-2xl border border-error/20 text-sm text-error">
              {valuationError}
            </div>
          ) : valuation ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* En-tête */}
              <div className="px-6 py-5 bg-primary/5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-headline font-bold text-primary text-lg">
                    Inventaire valorisé
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Méthode active :{' '}
                    <span className="font-semibold">
                      {METHOD_LABELS[valuation.method] ?? valuation.method}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                    Valeur totale du stock
                  </p>
                  <p className="text-2xl font-headline font-extrabold text-primary">
                    {Number(valuation.grand_total).toLocaleString('fr-FR')} XOF
                  </p>
                </div>
              </div>

              {/* Tableau */}
              <div className="overflow-x-auto">
                {valuation.items.length === 0 ? (
                  <p className="p-8 text-center text-sm text-slate-400">
                    Aucun stock valorisé.
                  </p>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-container-low/50 text-[10px] uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-bold">Article</th>
                        <th className="px-5 py-3 font-bold">SKU</th>
                        <th className="px-5 py-3 font-bold">Catégorie</th>
                        <th className="px-5 py-3 font-bold text-right">
                          Quantité
                        </th>
                        <th className="px-5 py-3 font-bold text-right">
                          Coût unitaire
                        </th>
                        <th className="px-5 py-3 font-bold text-right">
                          Valeur
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {valuation.items
                        .slice()
                        .sort(
                          (a, b) =>
                            parseFloat(b.value) - parseFloat(a.value),
                        )
                        .map((item) => (
                          <tr
                            key={item.item_id}
                            className="hover:bg-slate-50/50"
                          >
                            <td className="px-5 py-3 font-semibold text-primary">
                              <Link
                                to={`/inventory/${item.item_id}`}
                                className="hover:underline"
                              >
                                {item.name}
                              </Link>
                            </td>
                            <td className="px-5 py-3 font-mono text-xs text-slate-500">
                              {item.sku}
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-600">
                              {item.category_name ?? '—'}
                            </td>
                            <td className="px-5 py-3 text-right font-semibold">
                              {fmtQty(item.total_quantity)}
                            </td>
                            <td className="px-5 py-3 text-right text-slate-500">
                              {Number(item.unit_cost).toLocaleString(
                                'fr-FR',
                              )}{' '}
                              FCFA
                            </td>
                            <td className="px-5 py-3 text-right font-bold text-primary">
                              {Number(item.value).toLocaleString('fr-FR')} FCFA
                            </td>
                          </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-surface-container-low/50 font-bold">
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-3 text-sm uppercase tracking-widest text-primary"
                        >
                          Total
                        </td>
                        <td className="px-5 py-3 text-right text-primary">
                          {Number(valuation.grand_total).toLocaleString(
                            'fr-FR',
                          )}{' '}
                          FCFA
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {summaryLoading ? (
          <>
            <BottomKpiSkeleton />
            <BottomKpiSkeleton />
            <BottomKpiSkeleton />
          </>
        ) : (
          <>
            <div className="bg-primary p-6 rounded-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-on-primary-container text-[11px] font-bold uppercase tracking-[0.2em] mb-2">
                  Valeur totale stock
                </p>
                <h3 className="text-2xl md:text-3xl font-extrabold text-white font-headline">
                  {fmtMoney(summary?.total_stock_value != null ? Number(summary.total_stock_value) : null)}
                </h3>
                <p className="text-white/60 text-xs mt-2 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  Indicateur disponible en Section 7 (coûts)
                </p>
              </div>
              <History className="absolute -right-4 -bottom-4 text-9xl text-white/5 w-24 md:w-32 h-24 md:h-32" />
            </div>
            <div className="bg-white p-6 rounded-2xl border border-surface-container-high relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Articles en alerte</p>
                <h3 className="text-2xl md:text-3xl font-extrabold text-error font-headline">
                  {summary?.critical_stock_count != null ? `${summary.critical_stock_count} articles` : '—'}
                </h3>
                <p className="text-slate-400 text-xs mt-2 flex items-center gap-1">
                  <Bell className="w-4 h-4" />
                  Sous le seuil minimal configuré
                </p>
              </div>
              <AlertTriangle className="absolute -right-4 -bottom-4 text-9xl text-error/5 w-24 md:w-32 h-24 md:h-32" />
            </div>
            <div className="bg-white p-6 rounded-2xl border border-surface-container-high relative overflow-hidden group sm:col-span-2 lg:col-span-1">
              <div className="relative z-10">
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Activité (24h)</p>
                <h3 className="text-2xl md:text-3xl font-extrabold text-primary font-headline">
                  {summary?.movements_today != null ? `${summary.movements_today} mvts` : '—'}
                </h3>
                <p className="text-slate-400 text-xs mt-2 flex items-center gap-1">
                  <History className="w-4 h-4 text-secondary" />
                  Mouvements enregistrés aujourd&apos;hui
                </p>
              </div>
              <TrendingUp className="absolute -right-4 -bottom-4 text-9xl text-primary/5 w-24 md:w-32 h-24 md:h-32" />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
