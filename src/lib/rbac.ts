import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  Calculator,
  ClipboardCheck,
  Construction,
  HardHat,
  ShieldCheck,
  ShoppingCart,
  Warehouse,
} from 'lucide-react';

import type { UserProfileRole } from '@/types/api';

/**
 * Définition d'un rôle métier côté frontend.
 *
 * **Source de vérité** : `inventory-backend/api/rbac.py::ROLE_DEFINITIONS`.
 * Le `value` (slug) doit correspondre exactement à `Role.code` côté backend.
 * Les libellés et descriptions sont la traduction FR de ce que l'API renvoie
 * via `MeProfile.role_label` ; on les duplique ici pour pouvoir les afficher
 * en formulaire (cartes d'invitation) sans aller-retour serveur.
 */
export type RoleMeta = {
  value: UserProfileRole;
  label: string;
  description: string;
  /** Icône courte pour les cartes d'invitation / sélection. */
  icon: LucideIcon;
  /** Classes Tailwind pour la pastille de rôle dans les listes utilisateurs. */
  pillClass: string;
};

/**
 * Catalogue ordonné des 8 rôles métier exposés à l'utilisateur final.
 * L'ordre suivi correspond à la hiérarchie organisationnelle (du plus
 * « stratégique » au plus « terrain »).
 */
export const ROLES: readonly RoleMeta[] = [
  {
    value: 'administrateur',
    label: 'Administrateur',
    description:
      'Directeur, gérant ou admin système. Accès complet à la configuration, aux utilisateurs et aux rapports financiers.',
    icon: ShieldCheck,
    pillClass: 'bg-secondary-fixed text-on-secondary-fixed',
  },
  {
    value: 'conducteur_travaux',
    label: 'Conducteur de travaux',
    description:
      'Superviseur multi-chantiers. Lecture globale, validation des mouvements et rapports chantier.',
    icon: ClipboardCheck,
    pillClass: 'bg-primary-fixed-dim/30 text-primary',
  },
  {
    value: 'chef_chantier',
    label: 'Chef de chantier',
    description:
      'Responsable d’un chantier. Mouvements de stock sur son chantier, consultation et demandes de réapprovisionnement.',
    icon: Construction,
    pillClass: 'bg-secondary-container/40 text-on-secondary-container',
  },
  {
    value: 'magasinier',
    label: 'Magasinier',
    description:
      'Gestionnaire de dépôt. Mouvements sur son site, réception des livraisons, inventaires physiques.',
    icon: Warehouse,
    pillClass: 'bg-primary-fixed text-on-primary-fixed',
  },
  {
    value: 'responsable_achats',
    label: 'Responsable achats',
    description:
      'Approvisionnement et fournisseurs. Articles, prix d’achat, commandes.',
    icon: ShoppingCart,
    pillClass: 'bg-amber-100 text-amber-800',
  },
  {
    value: 'comptable',
    label: 'Comptable',
    description:
      'Lecture seule sur les stocks. Rapports financiers et coûts.',
    icon: Calculator,
    pillClass: 'bg-emerald-100 text-emerald-800',
  },
  {
    value: 'controleur_gestion',
    label: 'Contrôleur de gestion',
    description:
      'Analyse budgétaire : rapports coûts, comparaison budget/réalisé, marges.',
    icon: BarChart3,
    pillClass: 'bg-violet-100 text-violet-800',
  },
  {
    value: 'ouvrier_technicien',
    label: 'Ouvrier / Technicien',
    description:
      'Utilisateur terrain. Consultation du stock, signalement de pertes, demandes de matériel (mobile).',
    icon: HardHat,
    pillClass: 'bg-slate-200 text-slate-700',
  },
] as const;

const ROLE_BY_VALUE: Record<UserProfileRole, RoleMeta> = ROLES.reduce(
  (acc, r) => {
    acc[r.value] = r;
    return acc;
  },
  {} as Record<UserProfileRole, RoleMeta>,
);

export function getRoleMeta(role: UserProfileRole): RoleMeta {
  return ROLE_BY_VALUE[role];
}

export function roleLabel(role: UserProfileRole | null | undefined): string {
  if (!role) {
    return '—';
  }
  return ROLE_BY_VALUE[role]?.label ?? role;
}

export function rolePillClass(role: UserProfileRole | null | undefined): string {
  if (!role) {
    return 'bg-slate-100 text-slate-500';
  }
  return ROLE_BY_VALUE[role]?.pillClass ?? 'bg-slate-100 text-slate-500';
}

/**
 * Capacités UI dérivées d'un rôle. Aperçu non-bloquant dans les
 * formulaires « Droits opérationnels » : le serveur reste maître des
 * permissions effectives via `Role` + `RolePermission`.
 *
 * Suit fidèlement la matrice de `inventory-backend/api/rbac.py`.
 */
export type RoleCapabilities = {
  /** Peut enregistrer un mouvement (toutes localisations ou sous condition). */
  recordMovement: boolean;
  /** Peut valider/contre-signer un mouvement. */
  validateMovement: boolean;
  /** Peut lancer un inventaire physique. */
  startPhysicalInventory: boolean;
  /** Peut accéder aux paramètres et à la configuration. */
  accessSettings: boolean;
};

const ALL_OFF: RoleCapabilities = {
  recordMovement: false,
  validateMovement: false,
  startPhysicalInventory: false,
  accessSettings: false,
};

const CAPABILITIES: Record<UserProfileRole, RoleCapabilities> = {
  administrateur: {
    recordMovement: true,
    validateMovement: true,
    startPhysicalInventory: true,
    accessSettings: true,
  },
  conducteur_travaux: {
    recordMovement: false,
    validateMovement: true,
    startPhysicalInventory: false,
    accessSettings: false,
  },
  chef_chantier: {
    recordMovement: true,
    validateMovement: false,
    startPhysicalInventory: false,
    accessSettings: false,
  },
  magasinier: {
    recordMovement: true,
    validateMovement: false,
    startPhysicalInventory: true,
    accessSettings: false,
  },
  responsable_achats: { ...ALL_OFF },
  comptable: { ...ALL_OFF },
  controleur_gestion: { ...ALL_OFF },
  ouvrier_technicien: { ...ALL_OFF },
};

export function defaultCapabilitiesForRole(role: UserProfileRole): RoleCapabilities {
  return { ...CAPABILITIES[role] };
}

/**
 * Suggestion de rôle à partir d'un intitulé de fonction libre. Heuristique
 * simple basée sur des mots-clés FR — utilisée par la « suggestion IA » de
 * l'invitation. Renvoie `null` si rien ne correspond.
 */
export function suggestRoleFromFunction(
  fn: string,
): UserProfileRole | null {
  const t = fn.toLowerCase().trim();
  if (!t) {
    return null;
  }
  if (/admin|directeur|direction|gérant|gerant|dsi|rh|ressources humaines/.test(t)) {
    return 'administrateur';
  }
  if (/conducteur|conducteur de travaux|superviseur|surintendant/.test(t)) {
    return 'conducteur_travaux';
  }
  if (/chef de chantier|chef chantier|maître d.œuvre|maitre d.oeuvre/.test(t)) {
    return 'chef_chantier';
  }
  if (/magasin|stock|logist|inventaire|manutention/.test(t)) {
    return 'magasinier';
  }
  if (/achat|approvision|acheteur|fourniss/.test(t)) {
    return 'responsable_achats';
  }
  if (/comptab|finance|tréso|treso/.test(t)) {
    return 'comptable';
  }
  if (/contrôleur|controleur|contrôle de gestion|controle de gestion|analyste budg|budget/.test(t)) {
    return 'controleur_gestion';
  }
  if (/ouvrier|technicien|operateur|opérateur|maçon|macon|électricien|electricien|plombier|terrain/.test(t)) {
    return 'ouvrier_technicien';
  }
  return null;
}
