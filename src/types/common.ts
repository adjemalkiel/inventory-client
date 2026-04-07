export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;
export type UserId = number;

export interface ApiAudit {
  id: UUID;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  created_by: UserId | null;
  updated_by: UserId | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type ListResponse<T> = T[] | PaginatedResponse<T>;

export function isPaginatedResponse<T>(
  value: ListResponse<T>,
): value is PaginatedResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'results' in value &&
    Array.isArray(value.results)
  );
}

export function normalizeListResponse<T>(value: ListResponse<T>): T[] {
  return isPaginatedResponse(value) ? value.results : value;
}
