import type { AxiosResponse } from 'axios';

import http from './http';
import { getAccessToken } from '@/lib/auth';
import type {
  ActivityEvent,
  Agency,
  Alert,
  AlertRefreshResult,
  AlertUnreadCount,
  ApprovalRule,
  Category,
  DashboardRecentMovements,
  DashboardStockDistribution,
  DashboardSummary,
  CreateInput,
  CreateUserProfileInput,
  DjangoUser,
  EmailDeliveryKind,
  InviteUserPayload,
  InviteUserResponse,
  Integration,
  Item,
  ItemDetailResponse,
  ItemPriceHistory,
  ItemProjectAssignment,
  MeResponse,
  MeUpdatePayload,
  OrganizationSettings,
  PatchInput,
  Permission,
  Project,
  ProjectBudgetLine,
  ProjectCostBreakdown,
  ProjectPhase,
  ProjectResource,
  ProjectSummary,
  StockValuationReport,
  Role,
  RolePermission,
  Site,
  StockBalance,
  StockMovement,
  StockMovementCreatePayload,
  StorageLocation,
  StorageLocationSummary,
  StorageLocationZonesResponse,
  Supplier,
  UnitOfMeasure,
  UserProfile,
  UserRole,
} from '@/types/api';
import {
  normalizeListResponse,
  type ListResponse,
  type PaginatedResponse,
  type UUID,
  type UserId,
} from '@/types/common';

export type InventoryListParams = {
  page?: number;
  page_size?: number;
  category?: string;
  supplier?: string;
  stock_status?: 'available' | 'low' | 'stockout' | 'critical';
  search?: string;
  ordering?: string;
  is_active?: boolean;
  storage_location?: string;
};

type QueryParams = Record<string, string | number | boolean | undefined | null>;

function compactParams(params?: QueryParams): QueryParams | undefined {
  if (!params) return undefined;
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as QueryParams;
}

/** Optional body: test current form values without saving (merges with stored password if password empty). */
export type SmtpTestPayload = {
  smtp_enabled?: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_use_tls?: boolean;
  smtp_use_ssl?: boolean;
  smtp_user?: string;
  smtp_password?: string;
  /** Expéditeur (aligné sur le formulaire Paramètres). */
  smtp_from_email?: string;
  /** Destinataire du message de test (sinon : e-mail du compte connecté côté API). */
  to_email?: string;
};

/**
 * Réponse JSON des endpoints `…/test-smtp/` et `…/send-test-smtp-email/`.
 * `debug_log` contient la transcription smtplib (EHLO/STARTTLS/AUTH/…) avec mots
 * de passe masqués ; renvoyé dans les deux cas (succès comme échec) pour le debug.
 */
export type SmtpTestConnectionResponse = {
  detail: string;
  success: boolean;
  debug_log?: string;
};

export const organizationSettingsApi = {
  testSmtp: (id: UUID, payload: SmtpTestPayload = {}) =>
    unwrap(http.post<SmtpTestConnectionResponse>(`organization-settings/${id}/test-smtp/`, payload)),
  sendTestSmtpEmail: (id: UUID, payload: SmtpTestPayload = {}) =>
    unwrap(
      http.post<SmtpTestConnectionResponse>(
        `organization-settings/${id}/send-test-smtp-email/`,
        payload,
      ),
    ),
};

/** User model uses integer PK; other resources use UUID strings. */
export type ResourceId = UUID | UserId;

type CrudService<T, TCreate = CreateInput<T>, TPatch = PatchInput<T>> = {
  list: (params?: QueryParams) => Promise<T[]>;
  rawList: (params?: QueryParams) => Promise<ListResponse<T>>;
  get: (id: ResourceId) => Promise<T>;
  create: (payload: TCreate) => Promise<T>;
  update: (id: ResourceId, payload: TCreate) => Promise<T>;
  patch: (id: ResourceId, payload: TPatch) => Promise<T>;
  remove: (id: ResourceId) => Promise<void>;
};

function unwrap<T>(promise: Promise<AxiosResponse<T>>): Promise<T> {
  return promise.then((response) => response.data);
}

/**
 * R\u00e9ponse de `POST /auth/login/` et `POST /auth/refresh/`.
 *
 * Seul l'**access token** est renvoy\u00e9 dans le body ; le **refresh token**
 * est pos\u00e9 par le backend dans un cookie httpOnly (`batirpro_refresh`)
 * et n'est jamais accessible en JavaScript. Le payload utilisateur n'est
 * plus retourn\u00e9 ici : le client appelle `meApi.get()` apr\u00e8s login.
 */
export type LoginResponse = {
  access: string;
};

function createCrudService<T, TCreate = CreateInput<T>, TPatch = PatchInput<T>>(
  endpoint: string,
): CrudService<T, TCreate, TPatch> {
  const base = `${endpoint.replace(/^\/|\/$/g, '')}/`;
  return {
    list: async (params?: QueryParams) =>
      normalizeListResponse(
        await unwrap(http.get<ListResponse<T>>(base, { params: compactParams(params) })),
      ),
    rawList: (params?: QueryParams) =>
      unwrap(http.get<ListResponse<T>>(base, { params: compactParams(params) })),
    get: (id: ResourceId) => unwrap(http.get<T>(`${base}${id}/`)),
    create: (payload) => unwrap(http.post<T>(base, payload)),
    update: (id, payload) => unwrap(http.put<T>(`${base}${id}/`, payload)),
    patch: (id, payload) => unwrap(http.patch<T>(`${base}${id}/`, payload)),
    remove: (id) => unwrap(http.delete<void>(`${base}${id}/`)),
  };
}

export const authApi = {
  /**
   * `remember=true` (d\u00e9faut) \u2192 cookie refresh persistant (Max-Age = TTL refresh).
   * `remember=false` \u2192 cookie de session (effac\u00e9 \u00e0 la fermeture du navigateur).
   */
  login: (payload: { email: string; password: string; remember?: boolean }) =>
    unwrap(http.post<LoginResponse>('auth/login/', payload)),
  /**
   * Rafra\u00eechit l'access token \u00e0 partir du cookie httpOnly. Appel\u00e9 :
   * - silencieusement au boot par `CurrentUserContext` pour restaurer la session ;
   * - automatiquement par l'intercepteur axios sur 401.
   */
  refresh: () => unwrap(http.post<LoginResponse>('auth/refresh/', {})),
  logout: () => http.post('auth/logout/').then(() => undefined),
  requestPasswordReset: (payload: { email: string }) =>
    unwrap(http.post<{ detail: string }>('auth/password-reset/', payload)),
  /**
   * Réinitialisation (« oublié » ou lien envoyé par un admin) : jeton issu de
   * `UserProfile.password_reset_token`, lien `?reset=`.
   */
  confirmPasswordReset: (payload: {
    reset_token: string;
    new_password: string;
  }) =>
    unwrap(
      http.post<{ detail: string }>('auth/password-reset/confirm/', payload),
    ),
  /**
   * Activation initiale d’un compte créé par invitation (`UserProfile.invite_token`).
   * Usage unique : le backend invalide le jeton et renseigne `activated_at`.
   */
  activate: (payload: { invite_token: string; new_password: string }) =>
    unwrap(http.post<{ detail: string }>('auth/activate/', payload)),
};

export const meApi = {
  get: () => unwrap(http.get<MeResponse>('me/')),
  patch: (payload: MeUpdatePayload) =>
    unwrap(http.patch<MeResponse>('me/', payload)),
  changePassword: (payload: { old_password: string; new_password: string }) =>
    http.post('me/change-password/', payload),
};

const usersBase = createCrudService<DjangoUser>('users');
const itemsBase = createCrudService<Item>('items');

const stockMovementsEndpoint = 'stock-movements';

const stockMovementsBase =
  createCrudService<StockMovement, StockMovementCreatePayload>(
    stockMovementsEndpoint,
  );

export const apiServices = {
  users: {
    ...usersBase,
    invite: (payload: InviteUserPayload) =>
      unwrap(http.post<InviteUserResponse>('users/invite/', payload)),
    resendInvitation: (id: number) =>
      unwrap(
        http.post<InviteUserResponse>(`users/${id}/resend-invitation/`, {}),
      ),
    /**
     * Admin-triggered password reset : émet un jeton sur le profil et envoie
     * le même e-mail que « mot de passe oublié » (`?reset=`).
     */
    sendPasswordReset: (id: number) =>
      unwrap(
        http.post<{
          user: DjangoUser;
          password_reset_email_sent: boolean;
          email_delivery?: EmailDeliveryKind;
        }>(`users/${id}/send-password-reset/`, {}),
      ),
  },
  sites: createCrudService<Site>('sites'),
  agencies: createCrudService<Agency>('agencies'),
  storageLocations: {
    ...createCrudService<StorageLocation>('storage-locations'),
    summary: (id: UUID) =>
      unwrap(http.get<StorageLocationSummary>(`storage-locations/${id}/summary/`)),
    zones: (id: UUID) =>
      unwrap(http.get<StorageLocationZonesResponse>(`storage-locations/${id}/zones/`)),
  },
  unitsOfMeasure: createCrudService<UnitOfMeasure>('units-of-measure'),
  categories: createCrudService<Category>('categories'),
  userProfiles: createCrudService<UserProfile, CreateUserProfileInput, Partial<CreateUserProfileInput>>('user-profiles'),
  items: {
    ...itemsBase,
    detailBundle: (id: UUID) => unwrap(http.get<ItemDetailResponse>(`items/${id}/detail/`)),
    priceHistory: (id: UUID) =>
      unwrap(http.get<ItemPriceHistory>(`items/${id}/price-history/`)),
    stockValuation: () =>
      unwrap(http.get<StockValuationReport>('items/stock-valuation/')),
    uploadImage: async (id: UUID, file: File) => {
      const fd = new FormData();
      fd.append('image', file);
      const root = (http.defaults.baseURL ?? '/api/v1/').replace(/\/?$/, '/');
      const url = `${root}items/${id}/upload-image/`;
      const token = getAccessToken();
      const res = await fetch(url, {
        method: 'POST',
        body: fd,
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as { image_url?: string; detail?: string };
      if (!res.ok) {
        throw new Error((data.detail as string) || `Upload échoué (${res.status})`);
      }
      return data as { image_url: string };
    },
  },
  inventory: {
    list: (params?: InventoryListParams) =>
      unwrap(http.get<PaginatedResponse<Item>>('items/', { params: compactParams(params) })),
  },
  suppliers: createCrudService<Supplier>('suppliers'),
  stockBalances: createCrudService<StockBalance>('stock-balances'),
  projects: {
    ...createCrudService<Project>('projects'),
    summary: (id: UUID) =>
      unwrap(http.get<ProjectSummary>(`projects/${id}/summary/`)),
    costBreakdown: (id: UUID) =>
      unwrap(http.get<ProjectCostBreakdown>(`projects/${id}/cost-breakdown/`)),
  },
  projectPhases: createCrudService<ProjectPhase>('project-phases'),
  projectBudgetLines: createCrudService<ProjectBudgetLine>('project-budget-lines'),
  projectResources: createCrudService<ProjectResource>('project-resources'),
  stockMovements: {
    ...stockMovementsBase,
    approve: (id: ResourceId) =>
      unwrap(http.post<StockMovement>(`${stockMovementsEndpoint}/${id}/approve/`, {})),
    reject: (id: ResourceId, rejection_reason: string) =>
      unwrap(
        http.post<StockMovement>(`${stockMovementsEndpoint}/${id}/reject/`, {
          rejection_reason,
        }),
      ),
    createWithOptionalAttachment: async (
      payload: StockMovementCreatePayload,
      file?: File | null,
    ) => {
      if (!file) {
        return stockMovementsBase.create(payload);
      }
      const fd = new FormData();
      (Object.entries(payload) as [
        keyof StockMovementCreatePayload,
        string | null | undefined,
      ][]).forEach(([key, val]) => {
        if (val === undefined || val === null || val === '') return;
        fd.append(key as string, String(val));
      });
      fd.append('attachment', file);
      return unwrap(http.post<StockMovement>(`${stockMovementsEndpoint}/`, fd));
    },
  },
  approvalRules: createCrudService<ApprovalRule>('approval-rules'),
  itemProjectAssignments: createCrudService<ItemProjectAssignment>('item-project-assignments'),
  organizationSettings: createCrudService<OrganizationSettings>('organization-settings'),
  integrations: createCrudService<Integration>('integrations'),
  roles: createCrudService<Role>('roles'),
  permissions: createCrudService<Permission>('permissions'),
  rolePermissions: createCrudService<RolePermission>('role-permissions'),
  userRoles: createCrudService<UserRole>('user-roles'),
  activityEvents: createCrudService<ActivityEvent>('activity-events'),
  alerts: {
    list: (params?: Record<string, string>) =>
      unwrap(http.get<PaginatedResponse<Alert>>('alerts/', { params })),
    unreadCount: () =>
      unwrap(http.get<AlertUnreadCount>('alerts/unread-count/')),
    markRead: (id: UUID) =>
      unwrap(http.post<Alert>(`alerts/${id}/read/`)),
    dismiss: (id: UUID) =>
      unwrap(http.post<Alert>(`alerts/${id}/dismiss/`)),
    markAllRead: () =>
      unwrap(http.post<{ updated: number }>('alerts/mark-all-read/')),
    refresh: () =>
      unwrap(http.post<AlertRefreshResult>('alerts/refresh/')),
  },
  dashboard: {
    summary: (params?: { date_from?: string; date_to?: string }) =>
      unwrap(http.get<DashboardSummary>('dashboard/summary/', { params })),
    stockDistribution: (params?: { date_from?: string; date_to?: string }) =>
      unwrap(http.get<DashboardStockDistribution>('dashboard/stock-distribution/', { params })),
    recentMovements: (params?: { date_from?: string; date_to?: string }) =>
      unwrap(http.get<DashboardRecentMovements>('dashboard/recent-movements/', { params })),
  },
};

export type ApiServices = typeof apiServices;
