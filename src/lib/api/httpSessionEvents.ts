/**
 * Événements globaux émis par `http.ts` pour la couche UI (session, bandeaux).
 * Utilisés hors React pour éviter une dépendance circulaire avec le routeur.
 */

export const API_UNAUTHORIZED_EVENT = 'app:unauthorized';

export function emitApiUnauthorized(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(API_UNAUTHORIZED_EVENT));
}

/** @see `ForbiddenBanner` — `App:api-forbidden` */
export const API_FORBIDDEN_EVENT = 'app:api-forbidden';

export function emitApiForbidden(message?: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(API_FORBIDDEN_EVENT, {
      detail: { message: message?.trim() || 'Accès interdit' },
    }),
  );
}
