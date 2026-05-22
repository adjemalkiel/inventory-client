import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  ArrowRightLeft,
  History,
  FileText,
  Package as PackageIcon,
  Undo2,
  Minus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { apiServices } from '@/lib/api';
import type { DjangoUser, StockMovement, StockMovementStatus, StockMovementType } from '@/types/api';
import { isPaginatedResponse } from '@/types/common';

const PAGE_SIZE = 25;

const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  entree: 'Entrée',
  sortie: 'Sortie',
  transfert: 'Transfert',
  retour: 'Retour',
  ajustement: 'Ajustement',
};

const MOVEMENT_STYLES: Record<
  StockMovementType,
  { pill: string; Icon: typeof LogIn }
> = {
  entree: { pill: 'bg-green-100 text-green-700', Icon: LogIn },
  sortie: { pill: 'bg-red-100 text-red-700', Icon: LogOut },
  transfert: { pill: 'bg-blue-100 text-blue-700', Icon: ArrowRightLeft },
  retour: { pill: 'bg-amber-100 text-amber-800', Icon: Undo2 },
  ajustement: { pill: 'bg-violet-100 text-violet-800', Icon: Minus },
};

function fmtQty(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(n);
}

function formatQtyDisplay(type: StockMovementType, qtyRaw: string, m?: StockMovement): { text: string; className: string } {
  const n = Number.parseFloat(qtyRaw || '0');
  const q = fmtQty(Number.isFinite(n) ? n : 0);
  if (type === 'entree') return { text: `+${q}`, className: 'text-green-600' };
  if (type === 'sortie') return { text: `−${q}`, className: 'text-red-600' };
  if (type === 'ajustement' && m?.source_storage_location != null) {
    return { text: `−${q}`, className: 'text-red-600' };
  }
  if (type === 'ajustement') {
    return { text: `+${q}`, className: 'text-green-600' };
  }
  return { text: q, className: 'text-primary' };
}

function userInitials(name: string | null | undefined, userId: number | null): string {
  const n = (name || '').trim();
  if (!n) return userId != null ? String(userId).slice(-2) : '?';
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  }
  return n.slice(0, 2).toUpperCase();
}

function shortUserLabel(name: string | null | undefined, userId: number | null): string {
  const n = (name || '').trim();
  if (n) return n;
  return userId != null ? `Utilisateur #${userId}` : '—';
}

function sourceDestLabels(m: StockMovement): { source: string; dest: string } {
  const srcName = m.source_storage_location_name?.trim();
  const dstName = m.destination_storage_location_name?.trim();
  let source = srcName || '—';
  let dest = dstName || '—';
  if (m.movement_type === 'entree' && !srcName) {
    source = 'Extérieur / réception';
  }
  if (m.movement_type === 'sortie' && !dstName) {
    dest = 'Sortie / affectation';
  }
  if (m.movement_type === 'ajustement' && !srcName && !dstName) {
    source = '—';
    dest = '—';
  }
  return { source, dest };
}

function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** Clé calendaire locale (alignée sur les buckets du graphique). */
function calendarKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function last7DayMeta(): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    out.push({
      key: calendarKeyLocal(d),
      label: new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d),
    });
  }
  return out;
}

type TypeFilter = 'all' | StockMovementType;

const STATUS_BADGES: Record<
  StockMovementStatus,
  { label: string; className: string }
> = {
  draft: { label: 'Brouillon', className: 'bg-slate-100 text-slate-700' },
  pending: {
    label: 'En attente',
    className: 'border border-amber-200 bg-amber-50 text-amber-900',
  },
  approved: { label: 'Validé', className: 'border border-green-200 bg-green-50 text-green-800' },
  rejected: { label: 'Rejeté', className: 'border border-red-200 bg-red-50 text-red-800' },
  completed: { label: 'Exécuté', className: 'border border-green-200 bg-green-50 text-green-900' },
};

export default function MovementsPage() {
  const navigate = useNavigate();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [creatorUsers, setCreatorUsers] = useState<DjangoUser[]>([]);

  const [movementsToday, setMovementsToday] = useState<number | null>(null);

  const [weekBars, setWeekBars] = useState<
    {
      label: string;
      entree: number;
      sortie: number;
      transfert: number;
      retour: number;
      ajustement: number;
    }[]
  >([]);
  const [weekTruncated, setWeekTruncated] = useState(false);

  useEffect(() => {
    apiServices.users
      .list({ page_size: 500 })
      .then(setCreatorUsers)
      .catch(() => setCreatorUsers([]));
  }, []);

  useEffect(() => {
    apiServices.dashboard
      .summary()
      .then((d) => setMovementsToday(d.movements_today))
      .catch(() => setMovementsToday(null));
  }, []);

  useEffect(() => {
    const meta = last7DayMeta();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    apiServices.stockMovements
      .rawList({
        page_size: 500,
        ordering: '-created_at',
        created_at_after: start.toISOString(),
      })
      .then((resp) => {
        const list = isPaginatedResponse(resp) ? resp.results : resp;
        const total = isPaginatedResponse(resp) ? resp.count : list.length;
        setWeekTruncated(total > list.length);

        const bucket: Record<
          string,
          {
            entree: number;
            sortie: number;
            transfert: number;
            retour: number;
            ajustement: number;
          }
        > = {};
        for (const { key } of meta) {
          bucket[key] = { entree: 0, sortie: 0, transfert: 0, retour: 0, ajustement: 0 };
        }
        for (const m of list) {
          const k = localDateKey(m.created_at);
          if (!bucket[k]) continue;
          const t = m.movement_type;
          if (
            t === 'entree' ||
            t === 'sortie' ||
            t === 'transfert' ||
            t === 'retour' ||
            t === 'ajustement'
          ) {
            bucket[k][t] += 1;
          }
        }
        setWeekBars(
          meta.map(({ key, label }) => ({
            label,
            ...bucket[key],
          })),
        );
      })
      .catch(() =>
        setWeekBars(
          meta.map(({ label }) => ({
            label,
            entree: 0,
            sortie: 0,
            transfert: 0,
            retour: 0,
            ajustement: 0,
          })),
        ),
      );
  }, []);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const params: Record<string, string | number> = {
      page,
      page_size: PAGE_SIZE,
      ordering: '-created_at',
    };
    if (dateFrom.trim()) params.date_from = dateFrom.trim();
    if (dateTo.trim()) params.date_to = dateTo.trim();
    if (userFilter.trim()) params.created_by = Number.parseInt(userFilter.trim(), 10);
    if (statusFilter.trim()) params.status = statusFilter.trim();
    if (typeFilter !== 'all') params.movement_type = typeFilter;
    const q = searchQuery.trim();
    if (q) params.search = q;

    try {
      const resp = await apiServices.stockMovements.rawList(params);
      if (isPaginatedResponse(resp)) {
        setMovements(resp.results);
        setTotalCount(resp.count);
      } else {
        setMovements(resp);
        setTotalCount(resp.length);
      }
    } catch (e) {
      console.error(e);
      setLoadError('Impossible de charger les mouvements.');
      setMovements([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo, userFilter, typeFilter, statusFilter, searchQuery]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageTo = Math.min(page * PAGE_SIZE, totalCount);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, userFilter, typeFilter, statusFilter, searchQuery]);

  const maxWeekDayTotal = useMemo(() => {
    let m = 1;
    for (const d of weekBars) {
      const s =
        d.entree + d.sortie + d.transfert + d.retour + d.ajustement;
      if (s > m) m = s;
    }
    return m;
  }, [weekBars]);

  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setUserFilter('');
    setTypeFilter('all');
    setStatusFilter('');
    setSearchQuery('');
    setPage(1);
  };

  const typeTabs: { id: TypeFilter; label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'entree', label: 'Entrée' },
    { id: 'sortie', label: 'Sortie' },
    { id: 'transfert', label: 'Transfert' },
    { id: 'retour', label: 'Retour' },
    { id: 'ajustement', label: 'Ajustement' },
  ];

  const pageNumbers = useMemo(() => {
    const maxBtn = 5;
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= maxBtn + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    let start = Math.max(2, page - 1);
    let end = Math.min(totalPages - 1, page + 1);
    if (page <= 3) {
      start = 2;
      end = 4;
    }
    if (page >= totalPages - 2) {
      start = totalPages - 3;
      end = totalPages - 1;
    }
    if (start > 2) pages.push('ellipsis');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  const exportCurrentPageCsv = () => {
    if (movements.length === 0) return;
    const sep = ';';
    const headers = [
      'Date',
      'Heure',
      'Référence',
      'Type',
      'Article',
      'SKU',
      'Quantité',
      'Source',
      'Destination',
      'Chantier',
      'Statut',
      'Utilisateur',
    ];
    const escapeCell = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = movements.map((m) => {
      const when = new Date(m.created_at);
      const dateStr = new Intl.DateTimeFormat('fr-FR').format(when);
      const timeStr = new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(when);
      const { source, dest } = sourceDestLabels(m);
      return [
        dateStr,
        timeStr,
        (m.reference_number ?? '').trim(),
        MOVEMENT_LABELS[m.movement_type],
        m.item_name ?? '',
        m.item_sku ?? '',
        m.quantity,
        source,
        dest,
        m.project_name ?? '',
        STATUS_BADGES[m.status]?.label ?? m.status,
        m.created_by_name ?? '',
      ]
        .map((c) => escapeCell(String(c)))
        .join(sep);
    });
    const csv = '\uFEFF' + [headers.join(sep), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mouvements-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-primary-container">
            Logistique et Flux
          </span>
          <h2 className="font-headline text-3xl font-bold text-primary">Mouvements de stock</h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/inventory/new-movement')}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-headline text-sm font-semibold text-white shadow-xl transition-all duration-400 hover:shadow-primary/20 active:scale-95"
        >
          <Plus className="h-5 w-5" />
          <span>Nouveau mouvement</span>
        </button>
      </div>

      <div className="grid grid-cols-12 items-start gap-8">
        <div className="col-span-12 space-y-6 lg:col-span-3">
          <div className="space-y-6 rounded-xl border border-surface-container-high bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-primary">
              <Filter className="h-4 w-4" />
              <span className="font-headline text-sm font-bold uppercase tracking-wide">
                Filtres Avancés
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Période
                </label>
                <div className="space-y-2">
                  <input
                    className="w-full rounded-lg border-none bg-surface-container-low px-3 py-2 text-sm text-slate-700 focus:ring-1 focus:ring-primary-container"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                  <input
                    className="w-full rounded-lg border-none bg-surface-container-low px-3 py-2 text-sm text-slate-700 focus:ring-1 focus:ring-primary-container"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Utilisateur
                </label>
                <select
                  className="w-full appearance-none rounded-lg border-none bg-surface-container-low px-3 py-2 text-sm text-slate-700 focus:ring-1 focus:ring-primary-container"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                >
                  <option value="">Tous les utilisateurs</option>
                  {creatorUsers.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Statut
                </label>
                <select
                  className="w-full appearance-none rounded-lg border-none bg-surface-container-low px-3 py-2 text-sm text-slate-700 focus:ring-1 focus:ring-primary-container"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="completed">Exécuté</option>
                  <option value="rejected">Rejeté</option>
                  <option value="draft">Brouillon</option>
                  <option value="approved">Validé</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
                  <Search className="h-3 w-3" />
                  Recherche
                </label>
                <input
                  type="search"
                  className="w-full rounded-lg border-none bg-surface-container-low px-3 py-2 text-sm text-slate-700 focus:ring-1 focus:ring-primary-container"
                  placeholder="Référence, article, commentaire…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full rounded-lg border border-primary/20 py-2 text-xs font-bold text-primary transition-all duration-400 hover:bg-primary hover:text-white"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-primary p-6 shadow-lg">
            <div className="relative z-10">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/60">
                Mouvements aujourd’hui
              </p>
              <p className="font-headline text-3xl font-extrabold tracking-tight text-white">
                {movementsToday !== null ? fmtQty(movementsToday) : '—'}
              </p>
              <div className="mt-4 text-[10px] font-bold uppercase text-white/70">
                Synthèse tableau de bord
              </div>
            </div>
            <History className="absolute -bottom-4 -right-4 text-8xl text-white/10 transition-transform duration-700 group-hover:scale-110" />
          </div>
        </div>

        <div className="col-span-12 space-y-6 lg:col-span-9">
          <div className="flex w-fit flex-wrap items-center gap-1 rounded-xl bg-surface-container p-1">
            {typeTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id)}
                className={cn(
                  'rounded-lg px-5 py-2.5 text-sm transition-all duration-400',
                  typeFilter === t.id
                    ? 'bg-white font-semibold text-primary shadow-sm'
                    : 'font-medium text-slate-500 hover:text-primary',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loadError ? (
            <div className="rounded-xl border border-error/20 bg-error-container/20 px-4 py-3 text-sm text-error">
              {loadError}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-surface-container-high bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-high/40">
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Date
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Réf.
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Type
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Article
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Qté
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Source
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Destination
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Chantier
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Statut
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Utilisateur
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-sm text-slate-500">
                        Chargement…
                      </td>
                    </tr>
                  ) : movements.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-sm text-slate-500">
                        Aucun mouvement pour ces critères.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => {
                      const { pill, Icon } = MOVEMENT_STYLES[m.movement_type];
                      const qtyFmt = formatQtyDisplay(m.movement_type, m.quantity, m);
                      const { source, dest } = sourceDestLabels(m);
                      const when = new Date(m.created_at);
                      const dateStr = new Intl.DateTimeFormat('fr-FR', {
                        dateStyle: 'medium',
                      }).format(when);
                      const timeStr = new Intl.DateTimeFormat('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(when);
                      const itemTitle = m.item_name?.trim() || 'Article';
                      const st =
                        STATUS_BADGES[(m.status ?? 'completed') as StockMovementStatus] ??
                        STATUS_BADGES.completed;

                      return (
                        <tr
                          key={m.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate(`/movements/${m.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              navigate(`/movements/${m.id}`);
                            }
                          }}
                          className="group cursor-pointer transition-colors duration-200 hover:bg-surface-container-low"
                        >
                          <td className="whitespace-nowrap px-4 py-5">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-primary">{dateStr}</span>
                              <span className="text-[11px] text-slate-400">{timeStr}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-5">
                            <span className="font-mono text-xs font-semibold text-primary">
                              {m.reference_number?.trim()
                                ? m.reference_number
                                : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-5">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase',
                                pill,
                              )}
                            >
                              <Icon className="h-3 w-3" />
                              {MOVEMENT_LABELS[m.movement_type]}
                            </span>
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container">
                                <PackageIcon className="h-5 w-5 text-primary-container" />
                              </div>
                              <div className="flex min-w-0 flex-col">
                                <span className="text-sm font-semibold text-primary">{itemTitle}</span>
                                {m.item_sku?.trim() ? (
                                  <span className="text-[11px] text-slate-400">
                                    Réf: {m.item_sku}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-5">
                            <span className={cn('text-sm font-bold', qtyFmt.className)}>
                              {qtyFmt.text}
                            </span>
                          </td>
                          <td className="max-w-[160px] px-4 py-5">
                            <span className="text-sm text-slate-600">{source}</span>
                          </td>
                          <td className="max-w-[160px] px-4 py-5">
                            <span className="text-sm font-medium text-slate-600">{dest}</span>
                          </td>
                          <td className="max-w-[140px] px-4 py-5">
                            <span className="line-clamp-2 text-sm text-slate-600">
                              {m.project_name?.trim() ? m.project_name : '—'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-5">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                                st.className,
                              )}
                            >
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold">
                                {userInitials(m.created_by_name, m.created_by)}
                              </div>
                              <span className="text-sm text-slate-600">
                                {shortUserLabel(m.created_by_name, m.created_by)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-4 border-t border-surface-dim/10 bg-surface-container-low/30 px-6 py-4 sm:flex-row">
              <span className="text-xs font-medium text-slate-500">
                {totalCount === 0
                  ? 'Aucun résultat'
                  : `Affichage de ${pageFrom} à ${pageTo} sur ${fmtQty(totalCount)} mouvements`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded border border-surface-container-high bg-white text-slate-400 shadow-sm transition-all hover:text-primary disabled:opacity-40"
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {pageNumbers.map((pn, idx) =>
                  pn === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="px-1 text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={pn}
                      type="button"
                      disabled={loading}
                      onClick={() => setPage(pn)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded text-xs font-bold transition-all',
                        page === pn
                          ? 'bg-primary text-white'
                          : 'border border-surface-container-high bg-white text-slate-600 hover:bg-surface-container-high',
                      )}
                    >
                      {pn}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex h-8 w-8 items-center justify-center rounded border border-surface-container-high bg-white text-slate-400 shadow-sm transition-all hover:text-primary disabled:opacity-40"
                  aria-label="Page suivante"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-12 gap-8">
        <div className="relative col-span-12 rounded-2xl border border-surface-container-high bg-white p-8 shadow-sm md:col-span-8">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row">
            <div>
              <h3 className="font-headline text-lg font-bold text-primary">
                Activité sur 7 jours
              </h3>
              <p className="text-xs text-slate-400">Nombre de mouvements par type et par jour</p>
              {weekTruncated ? (
                <p className="mt-2 text-[11px] font-medium text-amber-700">
                  Aperçu limité aux 500 derniers mouvements de la période.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-tighter">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" /> Entrées
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Sorties
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Transferts
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Retours
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-500" /> Ajustements
              </div>
            </div>
          </div>

          <div className="flex h-48 items-end gap-2 px-2 sm:gap-4">
            {weekBars.length === 0 ? (
              <div className="flex w-full items-center justify-center text-sm text-slate-400">
                Chargement du graphique…
              </div>
            ) : (
              weekBars.map((d) => (
                <div key={d.label} className="group flex h-full flex-1 flex-col gap-1">
                  <div className="flex flex-1 items-end gap-0.5 sm:gap-1">
                    <div
                      className="w-full rounded-t-sm bg-green-500 transition-all group-hover:bg-green-600"
                      style={{
                        height: `${Math.max(8, (d.entree / maxWeekDayTotal) * 100)}%`,
                      }}
                      title={`Entrées : ${d.entree}`}
                    />
                    <div
                      className="w-full rounded-t-sm bg-red-500 transition-all group-hover:bg-red-600"
                      style={{
                        height: `${Math.max(8, (d.sortie / maxWeekDayTotal) * 100)}%`,
                      }}
                      title={`Sorties : ${d.sortie}`}
                    />
                    <div
                      className="w-full rounded-t-sm bg-blue-500 transition-all group-hover:bg-blue-600"
                      style={{
                        height: `${Math.max(8, (d.transfert / maxWeekDayTotal) * 100)}%`,
                      }}
                      title={`Transferts : ${d.transfert}`}
                    />
                    <div
                      className="w-full rounded-t-sm bg-amber-500 transition-all group-hover:bg-amber-600"
                      style={{
                        height: `${Math.max(8, (d.retour / maxWeekDayTotal) * 100)}%`,
                      }}
                      title={`Retours : ${d.retour}`}
                    />
                    <div
                      className="w-full rounded-t-sm bg-violet-500 transition-all group-hover:bg-violet-600"
                      style={{
                        height: `${Math.max(8, (d.ajustement / maxWeekDayTotal) * 100)}%`,
                      }}
                      title={`Ajustements : ${d.ajustement}`}
                    />
                  </div>
                  <span className="mt-2 text-center text-[10px] font-bold capitalize text-slate-400">
                    {d.label}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="relative col-span-12 flex flex-col justify-between overflow-hidden rounded-2xl bg-primary-container p-8 text-white shadow-lg md:col-span-4">
          <div className="relative z-10">
            <h3 className="font-headline mb-2 text-lg font-bold">Export de données</h3>
            <p className="mb-6 text-sm leading-relaxed text-slate-400">
              Téléchargez les lignes affichées dans le tableau (page courante).
            </p>
            <button
              type="button"
              disabled={movements.length === 0}
              onClick={exportCurrentPageCsv}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-bold text-primary transition-all hover:bg-slate-100 active:scale-95 disabled:opacity-40"
            >
              <Download className="h-5 w-5" />
              <span>Exporter la page courante</span>
            </button>
          </div>
          <FileText className="absolute -bottom-10 -right-10 h-40 w-40 rotate-12 transform text-white/10" />
        </div>
      </section>
    </div>
  );
}
