import { Loader2 } from 'lucide-react';

/**
 * Placeholder plein écran pendant la résolution de session (`/me/` ou refresh).
 */
export function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3 text-on-surface-variant">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        <p className="text-sm font-medium">Chargement de la session…</p>
      </div>
    </div>
  );
}
