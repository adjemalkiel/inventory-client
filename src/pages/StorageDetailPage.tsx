import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Box,
  Clock,
  Construction,
  Loader2,
  MapPin,
  Package,
  Plus,
  TrendingUp,
  User,
  Warehouse,
} from 'lucide-react';

import { apiServices } from '@/lib/api';
import { cn } from '@/lib/utils';
import type {
  Item,
  StockBalance,
  StockMovement,
  StorageLocation,
  StorageLocationSummary,
  StorageType,
  StorageZoneInfo,
} from '@/types/api';

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

const STORAGE_TYPE_ICON: Record<
  StorageType,
  React.ComponentType<{ className?: string }>
> = {
  depot_principal: Warehouse,
  magasin_chantier: Construction,
  zone_temporaire: Clock,
  conteneur_mobile: Box,
};

const MOVEMENT_TYPE_LABEL: Record<string, string> = {
  entree: 'Entrée',
  sortie: 'Sortie',
  transfert: 'Transfert',
  retour: 'Retour',
  ajustement: 'Ajustement',
};

function formatFcfa(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)} FCFA`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

type TabId = 'overview' | 'stock' | 'movements' | 'projects';

export default function StorageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [location, setLocation] = useState<StorageLocation | null>(null);
  const [summary, setSummary] = useState<StorageLocationSummary | null>(null);
  const [zones, setZones] = useState<StorageZoneInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('overview');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      apiServices.storageLocations.get(id),
      apiServices.storageLocations.summary(id),
      apiServices.storageLocations.zones(id),
    ])
      .then(([loc, sum, z]) => {
        if (cancelled) return;
        setLocation(loc);
        setSummary(sum);
        setZones(z.zones);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load storage location', err);
        setError('Impossible de charger ce lieu de stockage.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement…
      </div>
    );
  }

  if (error || !location || !summary) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 space-y-3">
        <p className="text-error">{error || 'Lieu introuvable.'}</p>
        <button
          onClick={() => navigate('/storage')}
          className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à la liste
        </button>
      </div>
    );
  }

  const Icon = STORAGE_TYPE_ICON[location.storage_type];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/storage')}
            className="p-2 hover:bg-surface-container rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center text-primary">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-primary tracking-tight font-headline">
                  {location.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      STORAGE_TYPE_BADGE[location.storage_type],
                    )}
                  >
                    {STORAGE_TYPE_LABELS[location.storage_type]}
                  </span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold',
                      location.is_active
                        ? 'bg-secondary-container text-on-secondary-fixed-variant'
                        : 'bg-surface-container-high text-slate-500',
                    )}
                  >
                    {location.is_active ? 'Actif' : 'Inactif'}
                  </span>
                  {location.city ? (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {location.city}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Link
          to={`/inventory/new-movement?destinationLocationId=${location.id}`}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold shadow hover:shadow-primary/20 transition"
        >
          <Plus className="w-4 h-4" /> Mouvement
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-surface-container-high">
        <nav className="flex gap-6">
          {(
            [
              { id: 'overview', label: "Vue d'ensemble" },
              { id: 'stock', label: 'Stock' },
              { id: 'movements', label: 'Mouvements' },
              { id: 'projects', label: 'Chantiers liés' },
            ] as { id: TabId; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-1 py-3 text-sm font-medium border-b-2 transition-colors',
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-primary',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'overview' ? (
        <OverviewTab location={location} summary={summary} zones={zones} />
      ) : tab === 'stock' ? (
        <StockTab locationId={location.id} zones={zones} />
      ) : tab === 'movements' ? (
        <MovementsTab locationId={location.id} />
      ) : (
        <ProjectsTab locationId={location.id} />
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'error';
}) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-surface-container-high">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">
        {label}
      </p>
      <h4
        className={cn(
          'text-2xl font-extrabold font-headline',
          tone === 'error' ? 'text-error' : 'text-primary',
        )}
      >
        {value}
      </h4>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function OverviewTab({
  location,
  summary,
  zones,
}: {
  location: StorageLocation;
  summary: StorageLocationSummary;
  zones: StorageZoneInfo[];
}) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Articles stockés" value={summary.items_count} />
        <KpiCard label="Valeur du stock" value={formatFcfa(summary.stock_value)} />
        <KpiCard
          label="Ruptures"
          value={summary.stockout_count}
          tone={summary.stockout_count > 0 ? 'error' : 'default'}
        />
        <KpiCard
          label="Articles critiques"
          value={summary.critical_count}
          tone={summary.critical_count > 0 ? 'error' : 'default'}
        />
        <KpiCard
          label="Mouvements aujourd'hui"
          value={summary.movements_today}
          hint={`${summary.movements_week} sur 7 jours`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-surface-container-high">
          <h3 className="font-headline font-bold text-lg text-primary mb-4">
            Informations
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <InfoRow label="Agence" value={location.agency_name ?? '—'} />
            <InfoRow
              label="Chantier lié"
              value={
                location.project_reference
                  ? `${location.project_reference} — ${location.project_name ?? ''}`
                  : location.project_name ?? '—'
              }
            />
            <InfoRow label="Adresse" value={location.address || '—'} />
            <InfoRow label="Ville" value={location.city || '—'} />
            <InfoRow label="Responsable" value={location.manager_display ?? '—'} />
            <InfoRow
              label="Surface (m²)"
              value={location.capacity_m2 ? `${location.capacity_m2} m²` : '—'}
            />
            <InfoRow
              label="Coordonnées GPS"
              value={
                summary.has_coordinates
                  ? `${location.latitude}, ${location.longitude}`
                  : '—'
              }
            />
            <InfoRow
              label="Capacité utilisée"
              value={
                summary.capacity_percent !== null
                  ? `${summary.capacity_percent}%`
                  : '—'
              }
            />
          </dl>
          {location.notes ? (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Notes
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-line">
                {location.notes}
              </p>
            </div>
          ) : null}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-surface-container-high">
          <h3 className="font-headline font-bold text-lg text-primary mb-4">
            Zones ({summary.zones_count})
          </h3>
          {zones.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune zone définie.</p>
          ) : (
            <ul className="space-y-3">
              {zones.map((z) => (
                <li
                  key={z.zone_label || '__main__'}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-slate-700">
                    {z.zone_display}
                  </span>
                  <span className="text-xs text-slate-500">
                    {z.items_count} art. — {Number(z.total_quantity).toLocaleString('fr-FR')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {summary.has_coordinates && location.latitude && location.longitude ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-surface-container-high">
          <h3 className="font-headline font-bold text-lg text-primary mb-4">
            Carte
          </h3>
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-surface-container-high">
            <iframe
              title="Localisation"
              className="w-full h-full"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(location.longitude) - 0.01}%2C${Number(location.latitude) - 0.01}%2C${Number(location.longitude) + 0.01}%2C${Number(location.latitude) + 0.01}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
        {label}
      </dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  );
}

function StockTab({
  locationId,
  zones,
}: {
  locationId: string;
  zones: StorageZoneInfo[];
}) {
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [items, setItems] = useState<Record<string, Item>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoneFilter, setZoneFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params: Record<string, string | number> = {
      storage_location: locationId,
      ordering: 'item__name',
      page_size: 200,
    };
    if (zoneFilter) params.zone_label = zoneFilter;
    apiServices.stockBalances
      .list(params)
      .then(async (bal) => {
        if (cancelled) return;
        setBalances(bal);
        const ids = Array.from(new Set(bal.map((b) => b.item)));
        const itemMap: Record<string, Item> = {};
        await Promise.all(
          ids.map(async (iid) => {
            try {
              itemMap[iid] = await apiServices.items.get(iid);
            } catch {
              // ignore
            }
          }),
        );
        if (!cancelled) setItems(itemMap);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError('Impossible de charger le stock de ce lieu.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locationId, zoneFilter]);

  const totals = useMemo(() => {
    let totalValue = 0;
    let stockouts = 0;
    balances.forEach((b) => {
      const item = items[b.item];
      const qty = Number(b.quantity);
      const price = Number(item?.unit_price ?? 0);
      totalValue += qty * price;
      if (qty <= 0) stockouts += 1;
    });
    return { totalValue, stockouts };
  }, [balances, items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h3 className="font-headline font-bold text-lg text-primary">
          Stock du lieu ({balances.length})
        </h3>
        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-surface-container-high rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="">Toutes les zones</option>
          {zones.map((z) => (
            <option key={z.zone_label || '__main__'} value={z.zone_label}>
              {z.zone_display}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-surface-container-high overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement…
          </div>
        ) : error ? (
          <div className="px-8 py-12 text-center text-error">{error}</div>
        ) : balances.length === 0 ? (
          <div className="px-8 py-12 text-center text-slate-500 text-sm">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            Aucun stock dans ce lieu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-container-high/50 border-b border-slate-100">
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Article
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Zone
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                    Quantité
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                    Valeur
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {balances.map((b) => {
                  const item = items[b.item];
                  const qty = Number(b.quantity);
                  const price = Number(item?.unit_price ?? 0);
                  const min = Number(item?.min_stock ?? 0);
                  const value = qty * price;
                  let status: { label: string; cls: string } = {
                    label: 'Disponible',
                    cls: 'bg-secondary-container text-on-secondary-fixed-variant',
                  };
                  if (qty <= 0)
                    status = {
                      label: 'Rupture',
                      cls: 'bg-error/10 text-error',
                    };
                  else if (qty < min)
                    status = {
                      label: 'Critique',
                      cls: 'bg-tertiary-container text-on-tertiary-container',
                    };
                  return (
                    <tr key={b.id} className="hover:bg-surface-container-low">
                      <td className="px-6 py-3 text-sm font-medium text-primary">
                        {item?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {item?.sku ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {b.zone_label || '(Zone principale)'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-right">
                        {qty.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 text-right font-medium">
                        {formatFcfa(value)}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={cn(
                            'px-3 py-1 rounded-full text-[10px] font-bold',
                            status.cls,
                          )}
                        >
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface-container-low/50 border-t border-slate-200">
                  <td colSpan={3} className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 text-right">
                    {balances.length} ligne(s) — {totals.stockouts} rupture(s)
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-primary text-right">
                    {formatFcfa(totals.totalValue)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MovementsTab({ locationId }: { locationId: string }) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiServices.stockMovements
      .list({
        storage_location: locationId,
        ordering: '-created_at',
        page_size: 100,
      })
      .then((data) => {
        if (!cancelled) setMovements(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError('Impossible de charger les mouvements.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-surface-container-high overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement…
        </div>
      ) : error ? (
        <div className="px-8 py-12 text-center text-error">{error}</div>
      ) : movements.length === 0 ? (
        <div className="px-8 py-12 text-center text-slate-500 text-sm">
          <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          Aucun mouvement enregistré sur ce lieu.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-surface-container-high/50 border-b border-slate-100">
                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Référence
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Article
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                  Quantité
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Source → Destination
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Chantier
                </th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-surface-container-low">
                  <td className="px-6 py-3 text-xs text-slate-600">
                    {formatDate(m.created_at)}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-primary">
                    <Link to={`/movements/${m.id}`} className="hover:underline">
                      {m.reference_number || '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    {MOVEMENT_TYPE_LABEL[m.movement_type] ?? m.movement_type}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-800">
                    {m.item_name ?? '—'}
                    {m.item_sku ? (
                      <span className="text-[10px] text-slate-400 ml-1">
                        {m.item_sku}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 text-right">
                    {Number(m.quantity).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {(m.source_storage_location_name ?? '—') +
                      ' → ' +
                      (m.destination_storage_location_name ?? '—')}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {m.project_name ?? '—'}
                  </td>
                  <td className="px-6 py-3 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-slate-700 font-bold uppercase tracking-wider">
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProjectsTab({ locationId }: { locationId: string }) {
  const [rows, setRows] = useState<
    Array<{
      project_id: string;
      project_name: string;
      project_reference: string;
      out_count: number;
      in_count: number;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiServices.stockMovements
      .list({ storage_location: locationId, page_size: 1000 })
      .then((data) => {
        if (cancelled) return;
        const map = new Map<
          string,
          {
            project_id: string;
            project_name: string;
            project_reference: string;
            out_count: number;
            in_count: number;
          }
        >();
        data.forEach((m) => {
          if (!m.project) return;
          const cur =
            map.get(m.project) ?? {
              project_id: m.project,
              project_name: m.project_name ?? '',
              project_reference: '',
              out_count: 0,
              in_count: 0,
            };
          if (m.source_storage_location === locationId) cur.out_count += 1;
          if (m.destination_storage_location === locationId) cur.in_count += 1;
          map.set(m.project, cur);
        });
        setRows(Array.from(map.values()));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError('Impossible de charger les chantiers liés.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-surface-container-high overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement…
        </div>
      ) : error ? (
        <div className="px-8 py-12 text-center text-error">{error}</div>
      ) : rows.length === 0 ? (
        <div className="px-8 py-12 text-center text-slate-500 text-sm">
          <Construction className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          Aucun chantier lié à ce lieu.
        </div>
      ) : (
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-surface-container-high/50 border-b border-slate-100">
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Chantier
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                Entrées
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                Sorties
              </th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((r) => (
              <tr key={r.project_id} className="hover:bg-surface-container-low">
                <td className="px-6 py-3 text-sm font-medium text-primary">
                  {r.project_name || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700 text-center">
                  {r.in_count}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700 text-center">
                  {r.out_count}
                </td>
                <td className="px-6 py-3 text-right">
                  <Link
                    to={`/projects/${r.project_id}`}
                    className="text-primary text-xs font-medium hover:underline"
                  >
                    Voir le chantier
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
