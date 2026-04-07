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

export interface UserProfile extends ApiAudit {
  user: UserId;
  role: UserProfileRole;
  site: UUID | null;
  job_title: string;
  invited_at: ISODateTime | null;
  activated_at: ISODateTime | null;
  user_detail?: UserSummary;
}

export interface CreateUserProfileInput {
  user: UserId;
  role: UserProfileRole;
  site: UUID | null;
  job_title: string;
  invite_token?: string;
}

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
