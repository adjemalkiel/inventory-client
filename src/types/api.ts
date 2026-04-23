import type { ApiAudit, ISODate, ISODateTime, UserId, UUID } from './common';

export type StorageType =
  | 'depot_principal'
  | 'magasin_chantier'
  | 'zone_temporaire'
  | 'conteneur_mobile';

export type UserProfileRole =
  | 'administrateur'
  | 'magasinier'
  | 'chef_chantier'
  | 'consultant';

export type ProjectType =
  | 'residentiel_collectif'
  | 'tertiaire'
  | 'infrastructure_publique';
export type ProjectPriority = 'haute' | 'moyenne' | 'basse';
export type ProjectCriticality = 'standard' | 'sensible' | 'critique';
export type ProjectTrackingMode = 'progress' | 'hours';
export type ProjectResourceKind = 'equipment' | 'subcontract';
export type StockMovementType = 'entree' | 'sortie' | 'transfert' | 'retour';

export interface Site extends ApiAudit {
  name: string;
  code: string;
}

export interface Agency extends ApiAudit {
  name: string;
}

export interface StorageLocation extends ApiAudit {
  name: string;
  storage_type: StorageType;
  address: string;
  manager_name: string;
  manager_user: UserId | null;
  capacity_m2: string | null;
  notes: string;
  is_active: boolean;
}

export interface UnitOfMeasure extends ApiAudit {
  name: string;
}

export interface Category extends ApiAudit {
  name: string;
  parent: UUID | null;
}

export interface UserSummary {
  id: UserId;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

/** Django `auth_user` (API: `/api/users/`) for admin Gestion des utilisateurs. */
export interface DjangoUser {
  id: UserId;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: ISODateTime;
  last_login: ISODateTime | null;
}

export interface UserProfile extends ApiAudit {
  user: UserId;
  role: UserProfileRole;
  site: UUID | null;
  job_title: string;
  phone?: string;
  invited_at: ISODateTime | null;
  activated_at: ISODateTime | null;
  user_detail?: UserSummary;
  /** Présent sur la réponse d’un POST/PATCH si `notify_user: true` a été demandé. */
  notify_email_sent?: boolean;
}

/** GET/PATCH /api/me/ — no audit fields, profile slice is a subset. */
export interface MeUser {
  id: UserId;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: ISODateTime;
  last_login: ISODateTime | null;
}

export type MePrefLanguage = 'fr-FR' | 'en-US';
export type MePrefTimezone =
  | 'Europe/Paris'
  | 'Africa/Porto-Novo'
  | 'UTC';
export type MePrefDateFormat = 'dmy' | 'mdy' | 'ymd';
export type MePrefDisplayDensity = 'standard' | 'compact' | 'comfortable';
export type MePrefCurrency = 'EUR' | 'XOF' | 'USD' | 'CNY';

export interface MeProfile {
  id: UUID;
  role: UserProfileRole;
  role_label: string;
  job_title: string;
  phone: string;
  site: UUID | null;
  site_name: string | null;
  pref_language: MePrefLanguage;
  pref_timezone: MePrefTimezone;
  pref_date_format: MePrefDateFormat;
  pref_display_density: MePrefDisplayDensity;
  pref_currency: MePrefCurrency;
}

export interface MeResponse {
  user: MeUser;
  profile: MeProfile;
}

export type MeUpdatePayload = {
  email?: string;
  first_name?: string;
  last_name?: string;
  job_title?: string;
  phone?: string;
  site?: UUID | null;
  pref_language?: MePrefLanguage;
  pref_timezone?: MePrefTimezone;
  pref_date_format?: MePrefDateFormat;
  pref_display_density?: MePrefDisplayDensity;
  pref_currency?: MePrefCurrency;
};

export interface CreateUserProfileInput {
  user: UserId;
  role: UserProfileRole;
  site: UUID | null;
  job_title: string;
  invite_token?: string;
  /** When true, backend sends an HTML e-mail to the user (SMTP / org settings). */
  notify_user?: boolean;
}

/** `POST /users/invite/` — création compte + profil + e-mail d’invitation. */
export type InviteUserPayload = {
  email: string;
  first_name?: string;
  last_name?: string;
  role: UserProfileRole;
  site: UUID | null;
  job_title?: string;
};

export type InviteUserResponse = {
  user: DjangoUser;
  profile: UserProfile;
  invitation_email_sent: boolean;
};

export interface Item extends ApiAudit {
  name: string;
  sku: string;
  category: UUID;
  description: string;
  subcategory_label: string;
  brand: string;
  image_url: string;
  purchase_date: ISODate | null;
  warranty_label: string;
  supplier_name: string;
  unit: UUID;
  min_stock: string;
  is_active: boolean;
}

export interface StockBalance extends ApiAudit {
  item: UUID;
  storage_location: UUID;
  zone_label: string;
  quantity: string;
}

export interface Project extends ApiAudit {
  name: string;
  reference: string;
  project_type: ProjectType;
  client_name: string;
  status: string;
  priority: ProjectPriority;
  description: string;
  address: string;
  city: string;
  start_date: ISODate | null;
  end_date: ISODate | null;
  agency: UUID | null;
  manager: UserId | null;
  works_supervisor: UserId | null;
  budget_amount: string | null;
  max_staff: number | null;
  criticality: ProjectCriticality;
  tracking_mode: ProjectTrackingMode;
  auto_alerts_enabled: boolean;
  movement_slips_enabled: boolean;
  rfid_sync_enabled: boolean;
  ai_assistance_enabled: boolean;
  is_draft: boolean;
}

export interface ProjectResource extends ApiAudit {
  project: UUID;
  resource_kind: ProjectResourceKind;
  name: string;
  availability_date: ISODate | null;
  headcount: number | null;
  status_label: string;
}

export interface StockMovement extends ApiAudit {
  movement_type: StockMovementType;
  item: UUID;
  quantity: string;
  source_storage_location: UUID | null;
  destination_storage_location: UUID | null;
  project: UUID | null;
  comment: string;
}

export interface ItemProjectAssignment extends ApiAudit {
  item: UUID;
  project: UUID;
  assigned_at: ISODate | null;
  notes: string;
}

export interface OrganizationSettings extends ApiAudit {
  global_low_stock_threshold_percent: number;
  expiry_alert_days_before: number;
  expiry_alerts_enabled: boolean;
  predictive_analysis_enabled: boolean;
  auto_reports_enabled: boolean;
  smtp_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_use_tls: boolean;
  smtp_use_ssl: boolean;
  smtp_user: string;
  smtp_from_email: string;
  /** Present in API responses; password is never returned. */
  smtp_has_password: boolean;
  /** Set only in PATCH/PUT; never read from the API. */
  smtp_password?: string;
}

export interface Integration extends ApiAudit {
  provider_key: string;
  display_name: string;
  is_connected: boolean;
  config: Record<string, unknown>;
}

export interface Role extends ApiAudit {
  name: string;
  description: string;
}

export interface Permission extends ApiAudit {
  code: string;
  description: string;
}

export interface RolePermission extends ApiAudit {
  role: UUID;
  permission: UUID;
}

export interface UserRole extends ApiAudit {
  user: UserId;
  role: UUID;
}

export interface ActivityEvent {
  id: UUID;
  entity_type: string;
  entity_id: string;
  action: string;
  payload: Record<string, unknown> | null;
  created_by: UserId | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  updated_by: UserId | null;
}

export type CreateInput<T> = Omit<
  T,
  'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'
>;

export type PatchInput<T> = Partial<CreateInput<T>>;
