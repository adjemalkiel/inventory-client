import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  User,
  Warehouse,
  Info,
  ShieldCheck,
  Compass,
} from 'lucide-react';

import { apiServices } from '@/lib/api';
import type {
  Agency,
  CreateInput,
  Project,
  StorageLocation,
  StorageType,
  UserProfile,
} from '@/types/api';

const STORAGE_TYPES: { value: StorageType; label: string }[] = [
  { value: 'depot_principal', label: 'Dépôt Principal' },
  { value: 'magasin_chantier', label: 'Magasin Chantier' },
  { value: 'zone_temporaire', label: 'Zone Temporaire' },
  { value: 'conteneur_mobile', label: 'Conteneur Mobile' },
];

const TYPES_WITH_PROJECT: StorageType[] = ['magasin_chantier', 'conteneur_mobile'];

export default function NewStoragePage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    storage_type: 'depot_principal' as StorageType,
    city: '',
    address: '',
    agency: '',
    project: '',
    manager_user: '',
    capacity_m2: '',
    latitude: '',
    longitude: '',
    notes: '',
    is_active: true,
  });

  useEffect(() => {
    Promise.all([
      apiServices.agencies.list({ page_size: 200 }).catch(() => []),
      apiServices.projects.list({ page_size: 200, ordering: 'name' }).catch(() => []),
      apiServices.userProfiles.list({ page_size: 200 }).catch(() => []),
    ]).then(([a, p, pr]) => {
      setAgencies(a as Agency[]);
      setProjects(p as Project[]);
      setProfiles(pr as UserProfile[]);
    });
  }, []);

  const showProjectField = TYPES_WITH_PROJECT.includes(formData.storage_type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const payload: CreateInput<StorageLocation> = {
      name: formData.name.trim(),
      storage_type: formData.storage_type,
      address: formData.address.trim(),
      city: formData.city.trim(),
      agency: formData.agency || null,
      project: showProjectField && formData.project ? formData.project : null,
      latitude: formData.latitude ? formData.latitude : null,
      longitude: formData.longitude ? formData.longitude : null,
      manager_name: '',
      manager_user: formData.manager_user ? Number(formData.manager_user) : null,
      capacity_m2: formData.capacity_m2 ? formData.capacity_m2 : null,
      notes: formData.notes,
      is_active: formData.is_active,
    };

    try {
      await apiServices.storageLocations.create(payload);
      navigate('/storage');
    } catch (error) {
      console.error('Failed to save storage location', error);
      setSubmitError("Impossible d'enregistrer ce lieu pour le moment.");
      setIsSubmitting(false);
    }
  };

  const update = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) =>
    setFormData((s) => ({ ...s, [key]: value }));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/storage')}
          className="p-2 hover:bg-surface-container rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-primary" />
        </button>
        <div>
          <h2 className="text-2xl font-extrabold text-primary tracking-tight font-headline">
            Ajouter un nouveau lieu de stockage
          </h2>
          <p className="text-on-surface-variant text-sm">
            Configurez un dépôt, magasin de chantier ou zone temporaire.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        <div className="md:col-span-2 space-y-6">
          {submitError ? (
            <div className="rounded-xl border border-error/20 bg-error-container/20 px-4 py-3 text-sm text-error">
              {submitError}
            </div>
          ) : null}

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-surface-container-high space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-surface-dim/10">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Info className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-headline font-bold text-lg text-primary">
                Configuration du lieu
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <Field label="Nom du lieu">
                <div className="relative group">
                  <Warehouse className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dépôt Cotonou - Zone Nord"
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    value={formData.name}
                    onChange={(e) => update('name', e.target.value)}
                  />
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Field label="Type de stockage">
                  <select
                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    value={formData.storage_type}
                    onChange={(e) =>
                      update('storage_type', e.target.value as StorageType)
                    }
                  >
                    {STORAGE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Ville">
                  <input
                    type="text"
                    placeholder="Ex: Cotonou"
                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    value={formData.city}
                    onChange={(e) => update('city', e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Adresse / Localisation précise">
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ex: Zone Industrielle, Sèmè-Podji"
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    value={formData.address}
                    onChange={(e) => update('address', e.target.value)}
                  />
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Field label="Agence">
                  <select
                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    value={formData.agency}
                    onChange={(e) => update('agency', e.target.value)}
                  >
                    <option value="">— Non rattaché —</option>
                    {agencies.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </Field>

                {showProjectField ? (
                  <Field label="Chantier associé">
                    <select
                      className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      value={formData.project}
                      onChange={(e) => update('project', e.target.value)}
                    >
                      <option value="">— Aucun chantier —</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.reference ? `${p.reference} — ${p.name}` : p.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <div />
                )}
              </div>

              <Field label="Responsable">
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-low rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    value={formData.manager_user}
                    onChange={(e) => update('manager_user', e.target.value)}
                  >
                    <option value="">— Aucun responsable —</option>
                    {profiles.map((p) => {
                      const u = p.user_detail;
                      const label = u
                        ? `${(u.first_name + ' ' + u.last_name).trim() || u.username}`
                        : `Utilisateur #${p.user}`;
                      return (
                        <option key={p.id} value={String(p.user)}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Field label="Surface (m²)">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Ex: 500"
                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    value={formData.capacity_m2}
                    onChange={(e) => update('capacity_m2', e.target.value)}
                  />
                </Field>

                <Field label="Latitude">
                  <div className="relative group">
                    <Compass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="Ex: 6.366667"
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-low rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      value={formData.latitude}
                      onChange={(e) => update('latitude', e.target.value)}
                    />
                  </div>
                </Field>

                <Field label="Longitude">
                  <div className="relative group">
                    <Compass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="Ex: 2.433333"
                      className="w-full pl-12 pr-4 py-3 bg-surface-container-low rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      value={formData.longitude}
                      onChange={(e) => update('longitude', e.target.value)}
                    />
                  </div>
                </Field>
              </div>

              <Field label="Notes / Instructions d'accès">
                <textarea
                  rows={3}
                  placeholder="Codes d'accès, horaires, contraintes de déchargement…"
                  className="w-full px-4 py-3 bg-surface-container-low rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                  value={formData.notes}
                  onChange={(e) => update('notes', e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-primary p-8 rounded-2xl text-white shadow-xl shadow-primary/20">
            <h3 className="font-headline font-bold text-lg mb-4">Activer le lieu</h3>
            <p className="text-primary-fixed text-sm mb-6 leading-relaxed">
              Une fois activé, ce lieu pourra recevoir des transferts de stock et sera
              inclus dans les rapports de valorisation.
            </p>

            <label className="flex items-center gap-3 mb-8 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => update('is_active', e.target.checked)}
                className="w-4 h-4 rounded accent-white"
              />
              <span>Lieu actif</span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-white text-primary font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95 shadow-lg disabled:opacity-60"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{isSubmitting ? 'Enregistrement…' : 'Enregistrer le lieu'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 block">
        {label}
      </label>
      {children}
    </div>
  );
}
