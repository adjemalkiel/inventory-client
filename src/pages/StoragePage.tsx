import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Warehouse,
  Construction,
  Truck,
  Box,
  Clock,
  AlertTriangle,
  ChevronRight,
  Loader2,
  MapPin,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { apiServices } from '@/lib/api';
import type { StorageLocation, StorageType } from '@/types/api';
import { useCurrentUser } from '@/context/CurrentUserContext';

const STORAGE_TYPE_LABELS: Record<StorageType, string> = {
  depot_principal: 'Dépôt Principal',
  magasin_chantier: 'Magasin Chantier',
  zone_temporaire: 'Zone Temporaire',
  conteneur_mobile: 'Conteneur Mobile',
};

const STORAGE_TYPE_BADGE: Record<StorageType, string> = {
  depot_principal: 'bg-secondary-container text-on-secondary-fixed-variant',
  magasin_chantier: 'bg-primary-fixed text-primary',
  zone_temporaire: 'bg-tertiary-container text-on-tertiary-container',
  conteneur_mobile: 'bg-surface-container-high text-slate-700',
};

const STORAGE_TYPE_ICON: Record<StorageType, React.ComponentType<{ className?: string }>> = {
  depot_principal: Warehouse,
  magasin_chantier: Construction,
  zone_temporaire: Clock,
  conteneur_mobile: Box,
};

function formatFcfa(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(n)} FCFA`;
}

export default function StoragePage() {
  const { hasPermission } = useCurrentUser();
  const canCreate = hasPermission('storage.manage') || hasPermission('settings.manage');

  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<StorageType | ''>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params: Record<string, string | number | boolean> = {
      ordering: 'name',
      page_size: 200,
    };
    if (typeFilter) params.storage_type = typeFilter;
    if (activeFilter !== 'all') params.is_active = activeFilter === 'active';
    if (search.trim()) params.search = search.trim();
    apiServices.storageLocations
      .list(params)
      .then((data) => {
        if (cancelled) return;
        setLocations(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to fetch storage locations', err);
        setError('Impossible de charger les lieux de stockage.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [typeFilter, activeFilter, search]);

  const kpis = useMemo(() => {
    const activeCount = locations.filter((l) => l.is_active).length;
    const totalValue = locations.reduce(
      (acc, l) => acc + (l.stock_value ? Number(l.stock_value) : 0),
      0,
    );
    const totalCritical = locations.reduce(
      (acc, l) => acc + (l.critical_count ?? 0),
      0,
    );
    return { activeCount, totalValue, totalCritical };
  }, [locations]);

  const strategicZones = useMemo(() => {
    const principal = locations.filter((l) => l.storage_type === 'depot_principal');
    if (principal.length >= 3) return principal.slice(0, 3);
    const sortedByValue = [...locations].sort(
      (a, b) => Number(b.stock_value ?? 0) - Number(a.stock_value ?? 0),
    );
    return sortedByValue.slice(0, 3);
  }, [locations]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="font-headline text-3xl font-bold text-primary tracking-tight">
            Lieux de stockage
          </h2>
          <p className="text-on-surface-variant text-sm md:text-base max-w-2xl">
            Supervisez l'ensemble de vos dépôts, magasins de chantier et zones temporaires.
          </p>
        </div>
        {canCreate ? (
          <Link
            to="/storage/new"
            className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-headline font-semibold text-sm shadow-xl hover:shadow-primary/20 transition-all duration-400 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Nouveau lieu</span>
          </Link>
        ) : null}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-primary to-primary-container p-8 rounded-2xl text-white shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70 mb-3">
            Lieux actifs
          </p>
          <h3 className="text-4xl font-extrabold font-headline leading-none">
            {kpis.activeCount.toString().padStart(2, '0')}
          </h3>
          <p className="mt-4 text-xs opacity-70">
            Sur {locations.length} lieux référencés
          </p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-surface-container-high">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
            Valeur stock totale
          </p>
          <h3 className="text-3xl font-extrabold font-headline text-primary">
            {formatFcfa(kpis.totalValue)}
          </h3>
          <p className="mt-2 text-xs text-slate-500">Cumul tous lieux confondus</p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-surface-container-high">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
            Articles critiques
          </p>
          <h3 className="text-3xl font-extrabold font-headline text-primary">
            {kpis.totalCritical.toString().padStart(2, '0')}
          </h3>
          <p
            className={cn(
              'mt-2 text-xs font-medium flex items-center gap-1',
              kpis.totalCritical > 0 ? 'text-error' : 'text-slate-500',
            )}
          >
            {kpis.totalCritical > 0 ? (
              <>
                <AlertTriangle className="w-4 h-4" /> Action requise
              </>
            ) : (
              'Aucune alerte en cours'
            )}
          </p>
        </div>
      </div>

      {/* Strategic zones */}
      {strategicZones.length > 0 ? (
        <section className="space-y-6">
          <h3 className="font-headline font-bold text-xl text-primary">Zones stratégiques</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {strategicZones.map((loc) => {
              const Icon = STORAGE_TYPE_ICON[loc.storage_type];
              return (
                <Link
                  key={loc.id}
                  to={`/storage/${loc.id}`}
                  className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-primary group hover:-translate-y-1 transition-all duration-400"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-surface-container p-3 rounded-lg">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        STORAGE_TYPE_BADGE[loc.storage_type],
                      )}
                    >
                      {STORAGE_TYPE_LABELS[loc.storage_type]}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-primary mb-1">{loc.name}</h4>
                  <p className="text-xs text-slate-500 mb-6 line-clamp-1">
                    {loc.city || loc.address || '—'}
                  </p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Articles en stock</span>
                      <span className="font-bold text-primary">
                        {loc.stock_items_count ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Valeur stock</span>
                      <span className="font-bold text-primary">
                        {formatFcfa(loc.stock_value)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Articles critiques</span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full font-bold text-xs',
                          (loc.critical_count ?? 0) > 0
                            ? 'bg-error/10 text-error'
                            : 'text-slate-400',
                        )}
                      >
                        {(loc.critical_count ?? 0).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Filters */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <h3 className="font-headline font-bold text-xl text-primary">Tous les lieux</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 bg-white border border-surface-container-high rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none w-56"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as StorageType | '')}
              className="px-3 py-2 bg-white border border-surface-container-high rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="">Tous les types</option>
              {(Object.keys(STORAGE_TYPE_LABELS) as StorageType[]).map((t) => (
                <option key={t} value={t}>
                  {STORAGE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <select
              value={activeFilter}
              onChange={(e) =>
                setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')
              }
              className="px-3 py-2 bg-white border border-surface-container-high rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-surface-container-high overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Chargement des lieux…
            </div>
          ) : error ? (
            <div className="px-8 py-12 text-center text-error">{error}</div>
          ) : locations.length === 0 ? (
            <div className="px-8 py-16 text-center space-y-2">
              <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-slate-500 text-sm">Aucun lieu de stockage référencé.</p>
              {canCreate ? (
                <Link
                  to="/storage/new"
                  className="inline-flex items-center gap-2 text-primary font-medium text-sm hover:underline"
                >
                  <Plus className="w-4 h-4" /> Ajouter un lieu
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-surface-container-high/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Lieu / Type
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Ville
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                      Articles
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                      Valeur stock
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                      Critiques
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Responsable
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Chantier
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {locations.map((loc) => {
                    const Icon = STORAGE_TYPE_ICON[loc.storage_type];
                    const critical = loc.critical_count ?? 0;
                    return (
                      <tr
                        key={loc.id}
                        className="hover:bg-surface-container-low transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-surface rounded-lg flex items-center justify-center text-primary">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-primary">{loc.name}</p>
                              <span
                                className={cn(
                                  'inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider',
                                  STORAGE_TYPE_BADGE[loc.storage_type],
                                )}
                              >
                                {STORAGE_TYPE_LABELS[loc.storage_type]}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-600">
                          {loc.city || '—'}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={cn(
                              'px-3 py-1 rounded-full text-[10px] font-bold',
                              loc.is_active
                                ? 'bg-secondary-container text-on-secondary-fixed-variant'
                                : 'bg-surface-container-high text-slate-500',
                            )}
                          >
                            {loc.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center text-sm font-bold text-primary">
                          {loc.stock_items_count ?? 0}
                        </td>
                        <td className="px-4 py-4 text-right text-xs text-slate-700 font-medium">
                          {formatFcfa(loc.stock_value)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={cn(
                              'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold',
                              critical > 0
                                ? 'bg-error/10 text-error'
                                : 'text-slate-400',
                            )}
                          >
                            {critical.toString().padStart(2, '0')}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-700">
                          {loc.manager_display || '—'}
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-600">
                          {loc.project_reference || loc.project_name || '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to={`/storage/${loc.id}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium"
                          >
                            Voir <ChevronRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
