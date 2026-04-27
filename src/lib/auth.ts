/**
 * Stockage du token d'authentification (JWT access) en m\u00e9moire uniquement.
 *
 * Le **refresh token** vit dans un cookie httpOnly pos\u00e9 par le backend
 * (`/api/v1/auth/login/`, `/api/v1/auth/refresh/`) ; il n'est jamais accessible
 * en JavaScript. Le client poss\u00e8de uniquement l'**access token** (court, ~15 min)
 * gard\u00e9 en m\u00e9moire \u2014 jamais en `localStorage`/`sessionStorage` \u2014 pour limiter
 * la surface d'attaque XSS.
 *
 * Au rechargement d'onglet l'access est perdu : `CurrentUserContext` lance un
 * appel silencieux \u00e0 `/auth/refresh/` au boot pour le re-r\u00e9cup\u00e9rer (le cookie
 * httpOnly est envoy\u00e9 automatiquement par le navigateur).
 *
 * Seule la pr\u00e9f\u00e9rence « rester connect\u00e9 » est persist\u00e9e en `localStorage` :
 * elle pilote la dur\u00e9e de vie du cookie c\u00f4t\u00e9 backend (Max-Age vs session).
 */

const REMEMBER_PREF_KEY = 'batirpro_remember_me';

let accessToken: string | null = null;
const listeners = new Set<(token: string | null) => void>();

function emit(token: string | null) {
  for (const l of listeners) {
    try {
      l(token);
    } catch {
      /* listener errors should not break the auth pipeline */
    }
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  emit(token);
}

export function clearAccessToken(): void {
  setAccessToken(null);
}

/** Subscribe to access-token mutations (used by the http layer / UI). */
export function subscribeAccessToken(
  listener: (token: string | null) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRememberPreference(): boolean {
  try {
    return localStorage.getItem(REMEMBER_PREF_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setRememberPreference(remember: boolean): void {
  try {
    localStorage.setItem(REMEMBER_PREF_KEY, remember ? '1' : '0');
  } catch {
    /* localStorage may be unavailable (private mode) ; not critical. */
  }
}
