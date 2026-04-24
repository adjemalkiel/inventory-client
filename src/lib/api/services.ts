import type { AxiosResponse } from 'axios';

import http from './http';
import type {
  ActivityEvent,
  Agency,
  Category,
  CreateInput,
  CreateUserProfileInput,
  DjangoUser,
  EmailDeliveryKind,
  InviteUserPayload,
  InviteUserResponse,
  Integration,
  Item,
  ItemProjectAssignment,
  MeResponse,
  MeUpdatePayload,
  OrganizationSettings,
  PatchInput,
  Permission,
  Project,
  ProjectResource,
  Role,
  RolePermission,
  Site,
  StockBalance,
  StockMovement,
  StorageLocation,
  UnitOfMeasure,
  UserProfile,
  UserRole,
} from '@/types/api';
import {
  normalizeListResponse,
  type ListResponse,
  type UUID,
  type UserId,
} from '@/types/common';

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
  list: () => Promise<T[]>;
  rawList: () => Promise<ListResponse<T>>;
  get: (id: ResourceId) => Promise<T>;
  create: (payload: TCreate) => Promise<T>;
  update: (id: ResourceId, payload: TCreate) => Promise<T>;
  patch: (id: ResourceId, payload: TPatch) => Promise<T>;
  remove: (id: ResourceId) => Promise<void>;
};

function unwrap<T>(promise: Promise<AxiosResponse<T>>): Promise<T> {
  return promise.then((response) => response.data);
}

export type LoginResponse = {
  token: string;
  user: { id: number; username: string; email: string };
};

function createCrudService<T, TCreate = CreateInput<T>, TPatch = PatchInput<T>>(
  endpoint: string,
): CrudService<T, TCreate, TPatch> {
  const base = `${endpoint.replace(/^\/|\/$/g, '')}/`;
  return {
    list: async () => normalizeListResponse(await unwrap(http.get<ListResponse<T>>(base))),
    rawList: () => unwrap(http.get<ListResponse<T>>(base)),
    get: (id: ResourceId) => unwrap(http.get<T>(`${base}${id}/`)),
    create: (payload) => unwrap(http.post<T>(base, payload)),
    update: (id, payload) => unwrap(http.put<T>(`${base}${id}/`, payload)),
    patch: (id, payload) => unwrap(http.patch<T>(`${base}${id}/`, payload)),
    remove: (id) => unwrap(http.delete<void>(`${base}${id}/`)),
  };
}

export const authApi = {
  login: (payload: { email: string; password: string }) =>
    unwrap(http.post<LoginResponse>('auth/login/', payload)),
  logout: () => http.post('auth/logout/').then(() => undefined),
  requestPasswordReset: (payload: { email: string }) =>
    unwrap(http.post<{ detail: string }>('auth/password-reset/', payload)),
  confirmPasswordReset: (payload: {
    uid: string;
    token: string;
    new_password: string;
  }) =>
    unwrap(
      http.post<{ detail: string }>('auth/password-reset/confirm/', payload),
    ),
};

export const meApi = {
  get: () => unwrap(http.get<MeResponse>('me/')),
  patch: (payload: MeUpdatePayload) =>
    unwrap(http.patch<MeResponse>('me/', payload)),
  changePassword: (payload: { old_password: string; new_password: string }) =>
    http.post('me/change-password/', payload),
};

const usersBase = createCrudService<DjangoUser>('users');

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
     * Admin-triggered password reset. Generates uid+token server-side and mails
     * the usual reset link (same template as « mot de passe oublié »).
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
  storageLocations: createCrudService<StorageLocation>('storage-locations'),
  unitsOfMeasure: createCrudService<UnitOfMeasure>('units-of-measure'),
  categories: createCrudService<Category>('categories'),
  userProfiles: createCrudService<UserProfile, CreateUserProfileInput, Partial<CreateUserProfileInput>>('user-profiles'),
  items: createCrudService<Item>('items'),
  stockBalances: createCrudService<StockBalance>('stock-balances'),
  projects: createCrudService<Project>('projects'),
  projectResources: createCrudService<ProjectResource>('project-resources'),
  stockMovements: createCrudService<StockMovement>('stock-movements'),
  itemProjectAssignments: createCrudService<ItemProjectAssignment>('item-project-assignments'),
  organizationSettings: createCrudService<OrganizationSettings>('organization-settings'),
  integrations: createCrudService<Integration>('integrations'),
  roles: createCrudService<Role>('roles'),
  permissions: createCrudService<Permission>('permissions'),
  rolePermissions: createCrudService<RolePermission>('role-permissions'),
  userRoles: createCrudService<UserRole>('user-roles'),
  activityEvents: createCrudService<ActivityEvent>('activity-events'),
};

export type ApiServices = typeof apiServices;
