import { MapPin, Warehouse } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { UserProfileRole } from '@/types/api';
import type { UUID } from '@/types/common';

export type ScopeListOption = { id: UUID; name: string; subtitle?: string };

export function toggleScopeId(ids: UUID[], id: UUID): UUID[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

type UserScopeFieldsetsProps = {
  role: UserProfileRole;
  projectOptions: ScopeListOption[];
  storageOptions: ScopeListOption[];
  projectIds: UUID[];
  storageIds: UUID[];
  onChangeProjects: (ids: UUID[]) => void;
  onChangeStorages: (ids: UUID[]) => void;
  disabled?: boolean;
  className?: string;
  /** Par défaut : chef → chantiers, magasinier → dépôts. */
  showProjectsForRoles?: UserProfileRole[];
  showStoragesForRoles?: UserProfileRole[];
};

const DEFAULT_CHEF: UserProfileRole[] = ['chef_chantier'];
const DEFAULT_MAG: UserProfileRole[] = ['magasinier'];

/**
 * Listes à coches : périmètre chantiers (`UserProfile.scoped_projects`) et/ou
 * emplacements (`UserProfile.scoped_storage_locations`), aligné sur l’API.
 */
function UserScopeFieldsets({
  role,
  projectOptions,
  storageOptions,
  projectIds,
  storageIds,
  onChangeProjects,
  onChangeStorages,
  disabled,
  className,
  showProjectsForRoles = DEFAULT_CHEF,
  showStoragesForRoles = DEFAULT_MAG,
}: UserScopeFieldsetsProps) {
  const showP = showProjectsForRoles.includes(role);
  const showS = showStoragesForRoles.includes(role);
  if (!showP && !showS) {
    return null;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {showP ? (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary/60" strokeWidth={2} />
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-outline">
              Chantiers assignés
            </h4>
          </div>
          <p className="mb-3 text-xs text-on-surface-variant">
            Laissez vide pour appliquer la règle par défaut (responsable / conducteur de travaux
            sur le projet).
          </p>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-surface-container bg-surface-container-lowest/50 p-3">
            {projectOptions.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Aucun chantier en base.</p>
            ) : (
              projectOptions.map((p) => {
                const checked = projectIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg py-1.5 pl-1 hover:bg-surface-container-high/30"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => onChangeProjects(toggleScopeId(projectIds, p.id))}
                    />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="font-medium text-primary">{p.name}</span>
                      {p.subtitle ? (
                        <span className="ml-1 text-xs text-on-surface-variant">{p.subtitle}</span>
                      ) : null}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      {showS ? (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-primary/60" strokeWidth={2} />
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-outline">
              Dépôts & emplacements
            </h4>
          </div>
          <p className="mb-3 text-xs text-on-surface-variant">
            Laissez vide pour utiliser le responsable d’emplacement (`manager`) comme filtre
            par défaut.
          </p>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-surface-container bg-surface-container-lowest/50 p-3">
            {storageOptions.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Aucun emplacement en base.</p>
            ) : (
              storageOptions.map((p) => {
                const checked = storageIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg py-1.5 pl-1 hover:bg-surface-container-high/30"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => onChangeStorages(toggleScopeId(storageIds, p.id))}
                    />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="font-medium text-primary">{p.name}</span>
                      {p.subtitle ? (
                        <span className="ml-1 text-xs text-on-surface-variant">{p.subtitle}</span>
                      ) : null}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default UserScopeFieldsets;
