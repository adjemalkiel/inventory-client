import type { MeUser } from '@/types/api';

export function userDisplayName(u: MeUser): string {
  const t = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return t || u.username;
}

export function userInitials(u: MeUser): string {
  const a = u.first_name?.[0] ?? '';
  const b = u.last_name?.[0] ?? '';
  if (a || b) {
    return (a + b).toUpperCase();
  }
  return u.username.slice(0, 2).toUpperCase();
}
