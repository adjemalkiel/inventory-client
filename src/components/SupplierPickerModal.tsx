import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2, Plus, Search, Truck, X } from 'lucide-react';

import { apiServices } from '@/lib/api';
import type { CreateInput, Supplier } from '@/types/api';
import { cn } from '@/lib/utils';

export type SupplierPickerModalProps = {
  open: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  selectedId: string;
  onSelect: (supplierId: string) => void;
  onSupplierCreated: (supplier: Supplier) => void;
};

export default function SupplierPickerModal({
  open,
  onClose,
  suppliers,
  selectedId,
  onSelect,
  onSupplierCreated,
}: SupplierPickerModalProps) {
  const [panel, setPanel] = useState<'pick' | 'create'>('pick');
  const [query, setQuery] = useState('');
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createCity, setCreateCity] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPanel('pick');
    setQuery('');
    setCreateError(null);
    setCreateName('');
    setCreatePhone('');
    setCreateEmail('');
    setCreateCity('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) => {
      const hay = [s.name, s.city, s.phone, s.email, s.contact_name]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [suppliers, query]);

  const handlePick = (id: string) => {
    onSelect(id);
    onClose();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = createName.trim();
    if (!name) {
      setCreateError('Indiquez au minimum le nom du fournisseur.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    const payload: CreateInput<Supplier> = {
      name,
      contact_name: '',
      phone: createPhone.trim(),
      email: createEmail.trim(),
      address: '',
      city: createCity.trim(),
      notes: '',
      is_active: true,
    };
    try {
      const created = await apiServices.suppliers.create(payload);
      onSupplierCreated(created);
      onSelect(created.id);
      onClose();
    } catch (err) {
      console.error(err);
      setCreateError(
        'Impossible de créer ce fournisseur. Vérifiez vos droits (catalogue articles) ou réessayez.',
      );
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-primary/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
    >
      <div className="absolute inset-0 transition-opacity" onClick={onClose} aria-hidden />
      <div
        className="relative z-10 flex max-h-[min(92dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200/80 bg-[#f7f9fb] shadow-[0_20px_40px_rgba(9,20,38,0.08)] sm:rounded-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-slate-200/80 bg-[#f7f9fb] px-5 pb-4 pt-6 sm:px-6 sm:pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2
                  id="supplier-picker-title"
                  className="font-headline text-lg font-bold tracking-tight text-primary sm:text-xl"
                >
                  Fournisseur
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Recherchez dans la liste ou ajoutez un nouveau fournisseur.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-200/50 hover:text-primary"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 flex gap-2 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200/60">
            <button
              type="button"
              onClick={() => setPanel('pick')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold uppercase tracking-wide transition',
                panel === 'pick'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50',
              )}
            >
              <Search className="h-3.5 w-3.5" />
              Choisir
            </button>
            <button
              type="button"
              onClick={() => setPanel('create')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold uppercase tracking-wide transition',
                panel === 'create'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50',
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Nouveau
            </button>
          </div>
        </div>

        {panel === 'pick' ? (
          <div className="flex min-h-0 flex-1 flex-col bg-[#f7f9fb]">
            <div className="shrink-0 px-5 pb-3 pt-2 sm:px-6">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  autoComplete="off"
                  placeholder="Nom, ville, téléphone…"
                  className="w-full rounded-xl border-none bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm ring-1 ring-slate-200/60 placeholder:text-slate-400 focus:ring-2 focus:ring-primary"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
              <button
                type="button"
                onClick={() => handlePick('')}
                className={cn(
                  'mb-2 w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition',
                  selectedId === ''
                    ? 'bg-primary/15 text-primary ring-2 ring-primary/30'
                    : 'bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/60 hover:bg-slate-50',
                )}
              >
                Aucun fournisseur
              </button>
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Aucun résultat. Essayez un autre filtre ou créez un fournisseur.
                </p>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => handlePick(s.id)}
                        className={cn(
                          'w-full rounded-xl px-4 py-3 text-left shadow-sm ring-1 transition',
                          selectedId === s.id
                            ? 'bg-primary/15 text-primary ring-2 ring-primary/30'
                            : 'bg-white text-slate-700 ring-slate-200/60 hover:bg-slate-50',
                        )}
                      >
                        <span className="block font-semibold">{s.name}</span>
                        {(s.city || s.phone || s.email) && (
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {[s.city, s.phone, s.email].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleCreateSubmit}
            className="flex flex-1 flex-col overflow-hidden bg-[#f7f9fb]"
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
              {createError ? (
                <div className="rounded-xl border border-error/20 bg-error-container/20 px-3 py-2 text-xs text-error">
                  {createError}
                </div>
              ) : null}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-slate-500">
                  Nom du fournisseur <span className="text-error">*</span>
                </label>
                <input
                  required
                  className="w-full rounded-xl border-none bg-white px-4 py-2.5 text-sm shadow-sm ring-1 ring-slate-200/60 focus:ring-2 focus:ring-primary"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Ex. Matériaux du centre"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-500">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    className="w-full rounded-xl border-none bg-white px-4 py-2.5 text-sm shadow-sm ring-1 ring-slate-200/60 focus:ring-2 focus:ring-primary"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-500">Ville</label>
                  <input
                    className="w-full rounded-xl border-none bg-white px-4 py-2.5 text-sm shadow-sm ring-1 ring-slate-200/60 focus:ring-2 focus:ring-primary"
                    value={createCity}
                    onChange={(e) => setCreateCity(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase text-slate-500">E-mail</label>
                <input
                  type="email"
                  className="w-full rounded-xl border-none bg-white px-4 py-2.5 text-sm shadow-sm ring-1 ring-slate-200/60 focus:ring-2 focus:ring-primary"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="shrink-0 border-t border-slate-200/80 bg-[#f7f9fb] px-5 py-4 sm:px-6">
              <button
                type="submit"
                disabled={creating}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-60"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création…
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Créer et sélectionner
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
