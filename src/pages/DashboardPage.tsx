import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  ArrowLeftRight,
  Building2,
  Warehouse,
  Sparkles,
  ChevronRight,
  PlusCircle,
  MinusCircle,
  MoveUp,
  ClipboardList,
  Loader2,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { apiServices } from '@/lib/api';
import { useCurrentUser } from '@/context/CurrentUserContext';
import type { UserProfileRole } from '@/types/api';

type PeriodPreset = 'today' | 'week' | 'month';

function formatLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfIsoWeekLocal(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + delta);
  return x;
}

function startOfMonthLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function periodQueryParams(
  preset: PeriodPreset,
  now: Date,
): { date_from?: string; date_to?: string } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = formatLocalISODate(today);
  if (preset === 'today') {
    return { date_from: to, date_to: to };
  }
  if (preset === 'week') {
    return { date_from: formatLocalISODate(startOfIsoWeekLocal(today)), date_to: to };
  }
  return { date_from: formatLocalISODate(startOfMonthLocal(today)), date_to: to };
}

function formatNum(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('fr-FR').format(n);
}

const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: "Aujourd'hui",
  week: 'Cette semaine',
  month: 'Ce mois',
};

/** Date du jour + sélecteur de période fusionnés (menu déroulant). */
function PeriodDateDropdown({
  periodPreset,
  onPeriodChange,
}: {
  periodPreset: PeriodPreset;
  onPeriodChange: (p: PeriodPreset) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const dateStr = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="relative w-full sm:w-auto" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full sm:min-w-[200px] items-center justify-between gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-surface-container-high text-left transition-colors hover:border-primary/30"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Période : ${PERIOD_LABELS[periodPreset]}. ${dateStr}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="text-primary w-4 h-4 shrink-0" aria-hidden />
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-medium text-primary leading-tight truncate">{dateStr}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant truncate">
              {PERIOD_LABELS[periodPreset]}
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 shrink-0 text-on-surface-variant transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-surface-container-high bg-white py-1 shadow-lg sm:left-auto sm:right-auto sm:min-w-[220px]"
          role="listbox"
        >
          {(['today', 'week', 'month'] as const).map((p) => (
            <li key={p} role="option" aria-selected={periodPreset === p}>
              <button
                type="button"
                className={cn(
                  'w-full px-4 py-2.5 text-left text-sm font-medium transition-colors',
                  periodPreset === p ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-container-low',
                )}
                onClick={() => {
                  onPeriodChange(p);
                  setOpen(false);
                }}
              >
                {PERIOD_LABELS[p]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function movementLabelFr(type: string): string {
  const map: Record<string, string> = {
    entree: 'ENTRÉE',
    sortie: 'SORTIE',
    transfert: 'TRANSFERT',
    retour: 'RETOUR',
  };
  return map[type.toLowerCase()] ?? type.toUpperCase();
}

/** Liens rapides par rôle (spec §2.3.5). */
function quickActionsForRole(role: UserProfileRole | undefined) {
  const all = (
    <>
      <Link
        to="/inventory/new-movement"
        className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed"
      >
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
            <PlusCircle className="text-primary w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-on-primary-fixed">Enregistrer une entrée</span>
        </div>
        <ChevronRight className="text-outline-variant w-4 h-4" />
      </Link>
      <Link
        to="/inventory/new-movement"
        className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed"
      >
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
            <MinusCircle className="text-primary w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-on-primary-fixed">Enregistrer une sortie</span>
        </div>
        <ChevronRight className="text-outline-variant w-4 h-4" />
      </Link>
      <Link
        to="/inventory/new-movement"
        className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed"
      >
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
            <MoveUp className="text-primary w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-on-primary-fixed">Transférer un article</span>
        </div>
        <ChevronRight className="text-outline-variant w-4 h-4" />
      </Link>
      <Link
        to="/audits"
        className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed"
      >
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
            <ClipboardList className="text-primary w-5 h-5" />
          </div>
          <span className="text-sm font-semibold text-on-primary-fixed">Lancer un inventaire</span>
        </div>
        <ChevronRight className="text-outline-variant w-4 h-4" />
      </Link>
    </>
  );

  if (!role || role === 'administrateur') return all;

  if (role === 'magasinier') {
    return (
      <>
        <Link
          to="/inventory/new-movement"
          className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
              <PlusCircle className="text-primary w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-on-primary-fixed">Enregistrer une entrée</span>
          </div>
          <ChevronRight className="text-outline-variant w-4 h-4" />
        </Link>
        <Link
          to="/inventory/new-movement"
          className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
              <MinusCircle className="text-primary w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-on-primary-fixed">Enregistrer une sortie</span>
          </div>
          <ChevronRight className="text-outline-variant w-4 h-4" />
        </Link>
        <Link
          to="/audits"
          className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
              <ClipboardList className="text-primary w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-on-primary-fixed">Lancer un inventaire</span>
          </div>
          <ChevronRight className="text-outline-variant w-4 h-4" />
        </Link>
      </>
    );
  }

  if (role === 'chef_chantier') {
    return (
      <>
        <Link
          to="/inventory/new-movement"
          className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
              <PlusCircle className="text-primary w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-on-primary-fixed">Demander du matériel</span>
          </div>
          <ChevronRight className="text-outline-variant w-4 h-4" />
        </Link>
        <Link
          to="/inventory/new-movement"
          className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
              <MinusCircle className="text-primary w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-on-primary-fixed">Signaler une perte</span>
          </div>
          <ChevronRight className="text-outline-variant w-4 h-4" />
        </Link>
        <Link
          to="/projects"
          className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
              <Warehouse className="text-primary w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-on-primary-fixed">Stock de mon chantier</span>
          </div>
          <ChevronRight className="text-outline-variant w-4 h-4" />
        </Link>
      </>
    );
  }

  if (role === 'comptable' || role === 'controleur_gestion') {
    return (
      <>
        <Link
          to="/movements"
          className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
              <TrendingUp className="text-primary w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-on-primary-fixed">Rapports financiers</span>
          </div>
          <ChevronRight className="text-outline-variant w-4 h-4" />
        </Link>
        <Link
          to="/projects"
          className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
              <Building2 className="text-primary w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-on-primary-fixed">Coûts par chantier</span>
          </div>
          <ChevronRight className="text-outline-variant w-4 h-4" />
        </Link>
      </>
    );
  }

  if (role === 'ouvrier_technicien') {
    return (
      <>
        <Link
          to="/inventory/new-movement"
          className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
              <PlusCircle className="text-primary w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-on-primary-fixed">Demander du matériel</span>
          </div>
          <ChevronRight className="text-outline-variant w-4 h-4" />
        </Link>
        <Link
          to="/inventory/new-movement"
          className="flex items-center justify-between p-4 bg-white hover:bg-primary-fixed/30 rounded-xl transition-all duration-300 group border border-transparent hover:border-primary-fixed"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center group-hover:bg-white transition-colors">
              <MinusCircle className="text-primary w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-on-primary-fixed">Signaler une perte</span>
          </div>
          <ChevronRight className="text-outline-variant w-4 h-4" />
        </Link>
      </>
    );
  }

  return all;
}

function KpiSkeleton() {
  return (
    <div className="bg-white p-4 md:p-6 rounded-xl animate-pulse border border-surface-container-high space-y-3">
      <div className="h-3 w-24 bg-surface-container-high rounded" />
      <div className="h-8 w-20 bg-surface-container-high rounded" />
      <div className="h-3 w-full bg-surface-container rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const { me } = useCurrentUser();
  const role = me?.profile.role;

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('week');

  const [summary, setSummary] = useState<Awaited<ReturnType<typeof apiServices.dashboard.summary>> | null>(
    null,
  );
  const [distribution, setDistribution] = useState<Awaited<
    ReturnType<typeof apiServices.dashboard.stockDistribution>
  > | null>(null);
  const [movementsRows, setMovementsRows] = useState<
    Awaited<ReturnType<typeof apiServices.dashboard.recentMovements>>['movements']
  >([]);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingDist, setLoadingDist] = useState(true);
  const [loadingMv, setLoadingMv] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chartMode, setChartMode] = useState<'count' | 'value'>('count');

  const periodParams = useMemo(
    () => periodQueryParams(periodPreset, new Date()),
    [periodPreset],
  );

  const load = useCallback(async () => {
    setError(null);
    setLoadingSummary(true);
    setLoadingDist(true);
    setLoadingMv(true);

    const errMsg = 'Impossible de charger le tableau de bord. Réessayez.';

    const p = apiServices.dashboard;
    await Promise.allSettled([
      p.summary(periodParams).then((d) => {
        setSummary(d);
      }),
      p.stockDistribution().then((d) => {
        setDistribution(d);
      }),
      p.recentMovements(periodParams).then((d) => {
        setMovementsRows(d.movements);
      }),
    ]).then((results) => {
      const failed = results.some((r) => r.status === 'rejected');
      if (failed) {
        setError(errMsg);
        results.forEach((r) => {
          if (import.meta.env.DEV && r.status === 'rejected') {
            console.error(r.reason);
          }
        });
      }
    });

    setLoadingSummary(false);
    setLoadingDist(false);
    setLoadingMv(false);
  }, [periodParams]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => {
    if (!summary) return null;
    return [
      {
        label: 'Articles suivis',
        value: formatNum(summary.items_tracked),
        trend: `Ruptures : ${formatNum(summary.stockout_count)} réf.`,
        icon: TrendingUp,
        color: 'bg-primary-fixed',
        trendColor: 'text-emerald-600',
      },
      {
        label: 'Stock critique',
        value: formatNum(summary.critical_stock_count),
        trend: 'Articles sous le seuil minimal',
        icon: AlertTriangle,
        color: 'bg-error',
        trendColor: 'text-error',
      },
      {
        label: periodPreset === 'today' ? 'Mouvements (jour terminant la fenêtre)' : 'Mouvements jour / période',
        value: formatNum(summary.movements_today),
        trend: `${formatNum(summary.movements_week)} sur la fenêtre (${periodPreset === 'today' ? 'jour' : periodPreset === 'week' ? 'semaine' : 'mois'})`,
        icon: ArrowLeftRight,
        color: 'bg-secondary-fixed',
        trendColor: 'text-on-surface-variant',
      },
      {
        label: 'Chantiers actifs',
        value: formatNum(summary.active_projects),
        trend: 'Projets non brouillon',
        icon: Building2,
        color: 'bg-primary',
        trendColor: 'text-on-surface-variant',
      },
      {
        label: 'Ruptures de stock',
        value: formatNum(summary.stockout_count),
        trend: 'Articles à quantité nulle',
        icon: Warehouse,
        color: 'bg-orange-400',
        trendColor: 'text-orange-600',
      },
    ];
  }, [summary, periodPreset]);

  const narrative = useMemo(() => {
    if (!summary) return '';
    const parts: string[] = [];
    if (summary.critical_stock_count > 0) {
      parts.push(
        `${formatNum(summary.critical_stock_count)} référence(s) sous le seuil critique de stock.`,
      );
      if (summary.most_critical_item_name) {
        parts.push(`La priorité va à « ${summary.most_critical_item_name} ».`);
      }
    }
    if (summary.busiest_project_last_7_days) {
      parts.push(
        `Les 7 derniers jours : le chantier le plus mouvementé est « ${summary.busiest_project_last_7_days} ».`,
      );
    }
    parts.push(`${formatNum(summary.movements_week)} mouvements sur la période sélectionnée.`);
    return parts.join(' ');
  }, [summary]);

  const bars = distribution?.locations ?? [];
  const maxFill = bars.reduce((acc, b) => Math.max(acc, b.fill_percent), 0);

  return (
    <div className="space-y-10">
      {error && (
        <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline text-2xl md:text-3xl font-bold text-primary tracking-tight">
            Tableau de bord exécutive
          </h2>
          <p className="text-on-surface-variant mt-2 text-sm md:text-base">
            Vue d&apos;ensemble de vos actifs et opérations en temps réel.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <PeriodDateDropdown periodPreset={periodPreset} onPeriodChange={setPeriodPreset} />
          <button
            type="button"
            className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-container transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-primary/10 active:scale-[0.98] opacity-70"
            title="Export à brancher (hors périmètre Section 2)"
            disabled
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Exporter le rapport</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {loadingSummary || !kpis
          ? Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)
          : kpis.map((kpi, i) => (
              <div
                key={kpi.label}
                className={cn(
                  'bg-white p-4 md:p-6 rounded-xl relative overflow-hidden group shadow-sm border border-surface-container-high',
                  i === kpis.length - 1 && 'col-span-2 sm:col-span-1',
                )}
              >
                <div className={cn('absolute left-0 top-0 bottom-0 w-1', kpi.color)} />
                <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em] mb-2 md:mb-4">
                  {kpi.label}
                </p>
                <div className="flex items-baseline space-x-2">
                  <span className="font-headline text-2xl md:text-3xl font-bold text-primary">{kpi.value}</span>
                  <kpi.icon className={cn('w-3 h-3 md:w-4 md:h-4', kpi.trendColor)} />
                </div>
                <div className={cn('mt-2 md:mt-4 flex items-center text-[10px] md:text-[11px] font-medium', kpi.trendColor)}>
                  {kpi.trend}
                </div>
              </div>
            ))}
      </div>

      <div className="grid grid-cols-12 gap-6 md:gap-8">
        <div className="col-span-12 lg:col-span-4 space-y-6 md:space-y-8">
          <div className="bg-primary text-white p-6 md:p-8 rounded-2xl relative overflow-hidden group shadow-2xl shadow-primary/20">
            <div className="absolute -right-4 -top-4 opacity-10">
              <Sparkles className="w-24 md:w-32 h-24 md:h-32" />
            </div>
            <div className="flex items-center space-x-3 mb-4 md:mb-6">
              <div className="w-8 h-8 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
                <Sparkles className="text-primary-fixed w-5 h-5" />
              </div>
              <h3 className="font-headline font-bold text-lg tracking-tight">Résumé automatique</h3>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-5 backdrop-blur-sm min-h-[96px]">
              {loadingSummary ? (
                <div className="flex items-center gap-2 text-primary-fixed/80">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Chargement…</span>
                </div>
              ) : narrative ? (
                <p className="text-primary-fixed text-sm leading-relaxed">{narrative}</p>
              ) : (
                <p className="text-primary-fixed text-sm leading-relaxed">Aucune alerte mise en évidence.</p>
              )}
            </div>
          </div>

          <div className="bg-surface-container-low p-6 md:p-8 rounded-2xl">
            <h3 className="font-headline font-bold text-primary text-lg mb-4 md:mb-6 flex items-center space-x-2">
              <Sparkles className="w-5 h-5" />
              <span>Actions rapides</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {quickActionsForRole(role)}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-6 md:space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-surface-container-high overflow-hidden">
            <div className="flex justify-between items-center mb-6 md:mb-8 gap-4 flex-wrap">
              <div>
                <h3 className="font-headline font-bold text-primary text-lg leading-tight">Répartition des stocks</h3>
                <p className="text-on-surface-variant text-xs mt-1">
                  Pondération relative aux dépôts visibles (volume saisi dans les soldes)
                </p>
              </div>
              <div className="flex items-center rounded-full bg-surface-container p-0.5 text-[10px] font-bold">
                <button
                  type="button"
                  className={cn(
                    'px-3 py-1 rounded-full',
                    chartMode === 'count' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant',
                  )}
                  onClick={() => setChartMode('count')}
                >
                  Articles
                </button>
                <button
                  type="button"
                  className={cn(
                    'px-3 py-1 rounded-full',
                    chartMode === 'value' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant',
                  )}
                  onClick={() => setChartMode('value')}
                  title="Valeurs en FCFA (à venir — Section coûts)"
                >
                  Valeur (FCFA)
                </button>
              </div>
            </div>
            <div className="flex space-x-4 md:space-x-8 h-48 md:h-64 px-2 md:px-4 min-h-[160px]">
              {loadingDist ? (
                <div className="flex flex-1 items-center justify-center w-full animate-pulse text-on-surface-variant text-sm">
                  Chargement du graphique…
                </div>
              ) : bars.length === 0 ? (
                <div className="flex flex-1 items-center justify-center w-full text-on-surface-variant text-sm">
                  Aucun lieu de stockage dans votre périmètre.
                </div>
              ) : (
                bars.map((bar) => {
                  const pct = chartMode === 'count' ? `${bar.fill_percent}%` : '8%';
                  const tooltip =
                    chartMode === 'count'
                      ? `${bar.name} · ${formatNum(Math.round(bar.total_items_count))} unités · ${bar.critical_count} critique(s)`
                      : `${bar.name} · valeur — (Section coûts)`;

                  return (
                    <div key={bar.id} className="flex-1 h-full flex flex-col group" title={tooltip}>
                      <div className="flex-1 w-full bg-surface-container-high rounded-t-lg relative flex items-end justify-center overflow-hidden">
                        <div
                          className={cn(
                            'w-full transition-all duration-500 group-hover:opacity-80',
                            maxFill > 0 && bar.fill_percent >= maxFill * 0.85 ? 'bg-primary' : 'bg-primary-container',
                            chartMode === 'value' && 'opacity-70',
                          )}
                          style={{
                            height: chartMode === 'count' ? pct : '15%',
                          }}
                        />
                      </div>
                      <span className="text-[9px] md:text-[11px] font-bold text-on-surface mt-2 md:mt-4 uppercase text-center whitespace-nowrap truncate">
                        {bar.name}
                      </span>
                      {chartMode === 'value' && (
                        <span className="text-[9px] text-center text-on-surface-variant">—</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-surface-container-high">
            <div className="px-6 md:px-8 py-4 md:py-6 flex justify-between items-center border-b border-surface-dim/20">
              <h3 className="font-headline font-bold text-primary text-lg">Mouvements récents</h3>
              <Link to="/movements" className="text-xs font-bold text-primary hover:underline underline-offset-4">
                Voir tout
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-surface-container-high/50">
                    <th className="px-6 md:px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                      Article
                    </th>
                    <th className="px-6 md:px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 md:px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                      Quantité
                    </th>
                    <th className="px-6 md:px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                      Vers / Origine
                    </th>
                    <th className="px-6 md:px-8 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                      Par
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-dim/10">
                  {loadingMv ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
                        <Loader2 className="w-6 h-6 animate-spin inline mr-2" />
                        Chargement…
                      </td>
                    </tr>
                  ) : movementsRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant text-sm">
                        Aucun mouvement sur la période.
                      </td>
                    </tr>
                  ) : (
                    movementsRows.map((mv) => {
                      const label = movementLabelFr(mv.movement_type);
                      const loc =
                        mv.destination_location_name ?? mv.source_location_name ?? '—';
                      return (
                        <tr key={mv.id} className="hover:bg-surface-container-low transition-colors group cursor-default">
                          <td className="px-6 md:px-8 py-4 text-xs font-medium text-on-surface">
                            <div className="font-semibold text-primary">{mv.item_name}</div>
                            <div className="text-on-surface-variant">{mv.item_sku}</div>
                          </td>
                          <td className="px-6 md:px-8 py-4">
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-1 rounded-full',
                                label === 'ENTRÉE'
                                  ? 'text-emerald-600 bg-emerald-50'
                                  : label === 'SORTIE'
                                    ? 'text-amber-600 bg-amber-50'
                                    : 'text-primary-container bg-primary-fixed',
                              )}
                            >
                              {label}
                            </span>
                          </td>
                          <td className="px-6 md:px-8 py-4 text-xs text-on-surface font-semibold">{mv.quantity}</td>
                          <td className="px-6 md:px-8 py-4 text-xs text-on-surface">
                            {loc}
                            {mv.project_name ? (
                              <span className="block text-on-surface-variant mt-0.5">{mv.project_name}</span>
                            ) : null}
                          </td>
                          <td className="px-6 md:px-8 py-4 text-xs text-on-surface">{mv.created_by_name || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
