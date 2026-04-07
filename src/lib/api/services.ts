import type { AxiosResponse } from 'axios';

import http from './http';
import type {
  ActivityEvent,
  Agency,
  Category,
  CreateInput,
  CreateUserProfileInput,
  Integration,
  Item,
  ItemProjectAssignment,
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
import { normalizeListResponse, type ListResponse, type UUID } from '@/types/common';

type CrudService<T, TCreate = CreateInput<T>, TPatch = PatchInput<T>> = {
  list: () => Promise<T[]>;
  rawList: () => Promise<ListResponse<T>>;
  get: (id: UUID) => Promise<T>;
  create: (payload: TCreate) => Promise<T>;
  update: (id: UUID, payload: TCreate) => Promise<T>;
  patch: (id: UUID, payload: TPatch) => Promise<T>;
  remove: (id: UUID) => Promise<void>;
};

function unwrap<T>(promise: Promise<AxiosResponse<T>>): Promise<T> {
  return promise.then((response) => response.data);
}

function createCrudService<T, TCreate = CreateInput<T>, TPatch = PatchInput<T>>(
  endpoint: string,
): CrudService<T, TCreate, TPatch> {
  const base = `${endpoint.replace(/^\/|\/$/g, '')}/`;
  return {
    list: async () => normalizeListResponse(await unwrap(http.get<ListResponse<T>>(base))),
    rawList: () => unwrap(http.get<ListResponse<T>>(base)),
    get: (id) => unwrap(http.get<T>(`${base}${id}/`)),
    create: (payload) => unwrap(http.post<T>(base, payload)),
    update: (id, payload) => unwrap(http.put<T>(`${base}${id}/`, payload)),
    patch: (id, payload) => unwrap(http.patch<T>(`${base}${id}/`, payload)),
    remove: (id) => unwrap(http.delete<void>(`${base}${id}/`)),
  };
}

export const apiServices = {
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
