import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Filter,
  History,
  ChevronRight,
  AlertTriangle,
  Package,
  TrendingUp,
  Hammer,
  Loader2,
  RefreshCw,
  CheckCheck,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiServices } from '@/lib/api';
import type { Alert, AlertSeverity, AlertStatus } from '@/types/api';

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { label: string; color: string; bar: string; icon: React.ElementType; iconColor: string }
> = {
  critical: {
    label: 'Critique',
    color: 'bg-error/10 text-error',
    bar: 'border-l-4 border-error',
    icon: AlertTriangle,
    iconColor: 'bg-error/5 text-error',
  },
  warning: {
    label: 'Avertissement',
    color: 'bg-orange-50 text-orange-600',
    bar: 'border-l-4 border-orange-500',
    icon: TrendingUp,
    iconColor: 'bg-orange-50 text-orange-600',
  },
  info: {
    label: 'Information',
    color: 'bg-slate-100 text-slate-500',
    bar: 'border-l-4 border-slate-300',
    icon: Package,
    iconColor: 'bg-slate-50 text-slate-500',
  },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const sec = Math.floor((now - then) / 1000);
  if (sec < 60) return "A l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `Il y a ${d}j`;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('unread');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), page_size: String(pageSize) };
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      const res = await apiServices.alerts.list(params);
      const data = res as unknown as { results: Alert[]; count: number };
      setAlerts(data.results ?? []);
      setTotal(data.count ?? 0);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, page]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await apiServices.alerts.refresh();
      await loadAlerts();
    } catch {
      /* silencieux */
    } finally {
      setRefreshing(false);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await apiServices.alerts.dismiss(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      /* silencieux */
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await apiServices.alerts.markRead(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'read' as AlertStatus } : a)),
      );
    } catch {
      /* silencieux */
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiServices.alerts.markAllRead();
      await loadAlerts();
    } catch {
      /* silencieux */
    }
  };

  const kpis = useMemo(() => {
    const unreadAlerts = alerts.filter((a) => a.status === 'unread');
    return {
      critical: unreadAlerts.filter((a) => a.severity === 'critical').length,
      warning: unreadAlerts.filter((a) => a.severity === 'warning').length,
      info: unreadAlerts.filter((a) => a.severity === 'info').length,
    };
  }, [alerts]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-[10px] text-slate-500 mb-2 font-headline font-bold uppercase tracking-widest">
            <span>Gestion</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary">Alertes</span>
          </nav>
          <h2 className="text-4xl font-headline font-bold text-primary tracking-tight">
            Centre de surveillance
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-5 py-2.5 bg-white text-primary font-semibold text-sm rounded-xl shadow-sm flex items-center gap-2 border border-slate-100 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            {refreshing ? 'Rafraichissement...' : 'Rafraichir'}
          </button>
          <button
            onClick={() => void handleMarkAllRead()}
            className="px-5 py-2.5 bg-white text-primary font-semibold text-sm rounded-xl shadow-sm flex items-center gap-2 border border-slate-100 hover:bg-slate-50 transition-all"
          >
            <CheckCheck className="w-4 h-4" />
            Tout lire
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Critiques', count: kpis.critical, severity: 'critical' as const, icon: AlertTriangle, bg: 'bg-error/5', text: 'text-error' },
          { label: 'Avertissements', count: kpis.warning, severity: 'warning' as const, icon: TrendingUp, bg: 'bg-orange-50', text: 'text-orange-600' },
          { label: 'Informations', count: kpis.info, severity: 'info' as const, icon: Package, bg: 'bg-slate-50', text: 'text-slate-500' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5"
          >
            <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center shrink-0', kpi.bg)}>
              <kpi.icon className={cn('w-7 h-7', kpi.text)} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {kpi.label}
              </p>
              <p className="text-3xl font-headline font-extrabold text-primary mt-1">
                {kpi.count}
              </p>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">Non lues</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-primary bg-white cursor-pointer hover:border-primary/30 transition-colors"
        >
          <option value="unread">Non lues</option>
          <option value="read">Lues</option>
          <option value="dismissed">Ignorees</option>
          <option value="">Toutes actives</option>
        </select>
        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-primary bg-white cursor-pointer hover:border-primary/30 transition-colors"
        >
          <option value="">Toutes severites</option>
          <option value="critical">Critique</option>
          <option value="warning">Avertissement</option>
          <option value="info">Information</option>
        </select>
        <div className="flex-1" />
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm font-medium">Chargement des alertes...</span>
          </div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-slate-100">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-headline font-bold text-primary mb-1">
              Aucune alerte active
            </p>
            <p className="text-sm text-slate-500">
              Toutes les operations sont normales pour le moment.
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
            return (
              <div
                key={alert.id}
                className={cn(
                  'bg-white rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:translate-x-1 transition-transform duration-300 border',
                  cfg.bar,
                )}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', cfg.iconColor)}>
                    <cfg.icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={cn('text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full', cfg.color)}>
                        {cfg.label}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {alert.alert_type_label}
                      </span>
                      {alert.status === 'unread' && (
                        <span className="w-2 h-2 bg-primary rounded-full" />
                      )}
                    </div>
                    <h4 className="text-base font-bold text-primary font-headline leading-tight">
                      {alert.title}
                    </h4>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {timeAgo(alert.created_at)}
                      </span>
                      {alert.item_name && (
                        <span className="text-[10px] text-primary font-semibold">
                          Article : {alert.item_name}
                        </span>
                      )}
                      {alert.project_name && (
                        <span className="text-[10px] text-primary font-semibold">
                          Chantier : {alert.project_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {alert.status === 'unread' && (
                    <button
                      onClick={() => void handleMarkRead(alert.id)}
                      className="px-4 py-2 text-xs font-bold text-primary hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Lire
                    </button>
                  )}
                  <button
                    onClick={() => void handleDismiss(alert.id)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    Ignorer
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 text-sm font-semibold text-primary bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Precedent
          </button>
          <span className="text-sm font-medium text-slate-500 px-4">
            Page {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-4 py-2 text-sm font-semibold text-primary bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
