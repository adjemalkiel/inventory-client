import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  Package,
  Printer,
  MapPin,
  X,
  Construction,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiServices, extractDrfErrorMessage } from '@/lib/api';
import type { StockMovement, StockMovementStatus } from '@/types/api';
import { useCurrentUser } from '@/context/CurrentUserContext';
import type { UUID } from '@/types/common';

const STATUS_META: Record<
  StockMovementStatus,
  { label: string; className: string }
> = {
  draft: {
    label: 'Brouillon',
    className: 'border-surface-container-high bg-slate-100 text-slate-600',
  },
  pending: {
    label: 'En attente',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  approved: {
    label: 'Validé',
    className: 'border-green-200 bg-green-50 text-green-800',
  },
  rejected: {
    label: 'Rejeté',
    className: 'border-red-200 bg-red-50 text-red-800',
  },
  completed: {
    label: 'Exécuté',
    className: 'border-green-200 bg-green-50 text-green-900',
  },
};

function fmtMoney(amount: string | null | undefined): string {
  if (!amount?.trim()) return '—';
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return amount ?? '—';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtQty(amount: string | null | undefined): string {
  const n = Number.parseFloat(amount || '0');
  return Number.isFinite(n)
    ? new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
      }).format(n)
    : '—';
}

export default function MovementDetailPage() {
  const { id } = useParams<{ id: UUID }>();
  const navigate = useNavigate();
  const { hasPermission } = useCurrentUser();
  const canValidate = hasPermission('movement.validate');

  const [movement, setMovement] = useState<StockMovement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const row = await apiServices.stockMovements.get(id);
      setMovement(row);
    } catch (e) {
      console.error(e);
      setMovement(null);
      setError('Mouvement introuvable ou accès refusé.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const onApprove = async () => {
    if (!movement) return;
    setActionBusy(true);
    setActionErr(null);
    try {
      const row = await apiServices.stockMovements.approve(movement.id);
      setMovement(row);
    } catch (e) {
      setActionErr(extractDrfErrorMessage(e) ?? "Impossible d'approuver ce mouvement.");
    } finally {
      setActionBusy(false);
    }
  };

  const onReject = async () => {
    if (!movement) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setActionErr('Saisissez un motif de refus.');
      return;
    }
    setActionBusy(true);
    setActionErr(null);
    try {
      const row = await apiServices.stockMovements.reject(movement.id, reason);
      setMovement(row);
    } catch (e) {
      setActionErr(extractDrfErrorMessage(e) ?? 'Impossible de rejeter ce mouvement.');
    } finally {
      setActionBusy(false);
    }
  };

  const duplicateHref = `/inventory/new-movement?duplicateFrom=${id ?? ''}`;

  const sm = STATUS_META[(movement?.status ?? 'completed') as StockMovementStatus] ?? STATUS_META.completed;

  if (!id) {
    return (
      <div className="rounded-xl border border-error/20 bg-error-container/20 p-6 text-sm text-error">
        Identifiant manquant dans l’URL.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-600">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>Chargement du mouvement…</span>
      </div>
    );
  }

  if (!movement || error) {
    return (
      <div className="space-y-4 rounded-xl border border-error/20 bg-error-container/20 p-6 text-error">
        <p>{error ?? 'Ce mouvement est introuvable.'}</p>
        <button
          type="button"
          onClick={() => navigate('/movements')}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  const srcLabel = movement.source_storage_location_name?.trim() ?? '—';
  const dstLabel = movement.destination_storage_location_name?.trim() ?? '—';

  const attachmentHref = movement.attachment ?? null;

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/movements')}
          className="flex items-center gap-2 rounded-xl border border-surface-container-high bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-surface-container-low"
        >
          <ArrowLeft className="h-4 w-4" />
          Liste des mouvements
        </button>
        <div className="flex flex-wrap gap-2">
          <Link
            to={duplicateHref}
            className="flex items-center gap-2 rounded-xl border border-primary/30 bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
          >
            <Copy className="h-4 w-4" />
            Dupliquer
          </Link>
          <button
            type="button"
            disabled
            title="PDF des bons (Section 9 — hors périmètre actuel)."
            className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-400 opacity-70"
          >
            <Printer className="h-4 w-4" />
            Imprimer le bon
          </button>
        </div>
      </div>

      <header className="space-y-3 border-b border-surface-container-high pb-6">
        <div className="flex flex-wrap items-center gap-3">
          {movement.reference_number?.trim() ? (
            <span className="rounded-full bg-primary px-4 py-1.5 font-mono text-sm font-bold tracking-wide text-white">
              {movement.reference_number}
            </span>
          ) : (
            <span className="rounded-full bg-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700">
              Sans référence
            </span>
          )}
          <span
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide',
              sm.className,
            )}
          >
            {sm.label}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary">
              {movement.item_name ?? 'Article'}
            </h1>
            <p className="text-sm text-slate-500">{movement.item_sku ? `Réf. ${movement.item_sku}` : ''}</p>
          </div>
          <Link
            to={`/inventory/${movement.item}`}
            className="ml-auto text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Voir la fiche article
          </Link>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <dl className="space-y-3 rounded-xl border border-surface-container-high bg-white p-6 shadow-sm">
          <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Quantité · Prix · Coût total
          </dt>
          <dd className="text-lg font-bold text-primary">
            {fmtQty(movement.quantity)} · {fmtMoney(movement.unit_price_at_movement)} ·{' '}
            {fmtMoney(movement.total_cost)}
          </dd>
        </dl>
        <dl className="space-y-3 rounded-xl border border-surface-container-high bg-white p-6 shadow-sm">
          <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
            <Construction className="h-3.5 w-3.5" /> Chantier
          </dt>
          <dd className="text-lg font-semibold text-primary">{movement.project_name ?? '—'}</dd>
        </dl>
      </div>

      <div className="rounded-xl border border-surface-container-high bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-headline text-sm font-bold text-primary">
          <MapPin className="h-4 w-4" />
          Flux des emplacements
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-4 text-center text-sm md:justify-between">
          <div className="rounded-lg bg-surface-container-low px-4 py-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">Source</p>
            <p className="mt-1 font-semibold text-primary">{srcLabel}</p>
          </div>
          <span className="hidden text-xl text-primary md:inline">→</span>
          <div className="rounded-lg bg-surface-container-low px-4 py-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">Destination</p>
            <p className="mt-1 font-semibold text-primary">{dstLabel}</p>
          </div>
        </div>
        {movement.movement_type === 'ajustement' && movement.loss_reason ? (
          <p className="mt-4 text-xs text-slate-500">
            <span className="font-semibold">Motif ajustement :</span> {movement.loss_reason}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-surface-container-high bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <UserIcon className="h-3.5 w-3.5" /> Création
          </div>
          <p className="font-medium text-primary">{movement.created_by_name ?? '—'}</p>
          <p className="text-xs text-slate-500">{new Date(movement.created_at).toLocaleString('fr-FR')}</p>
        </div>
        <div className="rounded-xl border border-surface-container-high bg-white p-6 shadow-sm">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Validation
          </div>
          <p className="font-medium text-primary">{movement.approved_by_name ?? '—'}</p>
          <p className="text-xs text-slate-500">
            {movement.approved_at
              ? new Date(movement.approved_at).toLocaleString('fr-FR')
              : '—'}
          </p>
          {movement.rejection_reason?.trim() ? (
            <p className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800">
              {movement.rejection_reason}
            </p>
          ) : null}
        </div>
      </div>

      {movement.comment?.trim() ? (
        <div className="rounded-xl border border-surface-container-high bg-white p-6 shadow-sm">
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Commentaire</h3>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{movement.comment}</p>
        </div>
      ) : null}

      {attachmentHref ? (
        <div className="rounded-xl border border-surface-container-high bg-white p-6 shadow-sm">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Pièce jointe
          </h3>
          <a
            href={attachmentHref}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-primary underline"
          >
            Ouvrir le fichier
          </a>
        </div>
      ) : null}

      {movement.status === 'pending' && canValidate ? (
        <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/80 p-6">
          <h3 className="font-headline text-sm font-bold text-amber-900">Actions approbateur</h3>
          {actionErr ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {actionErr}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => void onApprove()}
              className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Approuver
            </button>
            <div className="flex min-w-[200px] flex-1 flex-col gap-2">
              <textarea
                className="min-h-[80px] rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
                placeholder="Motif de refus (obligatoire pour rejeter)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => void onReject()}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-5 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Rejeter
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
