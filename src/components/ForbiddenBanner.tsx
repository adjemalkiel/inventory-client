import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

import { API_FORBIDDEN_EVENT } from '@/lib/api/httpSessionEvents';

type ForbiddenDetail = { message?: string };

/**
 * Écoute les 403 émis par l’intercepteur Axios et affiche un bandeau temporaire.
 */
export function ForbiddenBanner() {
  const [payload, setPayload] = useState<{ message: string } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onForbidden = (e: Event) => {
      const detail = (e as CustomEvent<ForbiddenDetail>).detail;
      const message = (detail?.message && String(detail.message).trim()) || 'Accès interdit';
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
      setPayload({ message });
      hideTimer.current = setTimeout(() => {
        setPayload(null);
        hideTimer.current = null;
      }, 5000);
    };

    window.addEventListener(API_FORBIDDEN_EVENT, onForbidden);
    return () => {
      window.removeEventListener(API_FORBIDDEN_EVENT, onForbidden);
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, []);

  if (!payload) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed bottom-6 left-1/2 z-[3000] flex w-[min(100vw-2rem,28rem)] -translate-x-1/2 justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error shadow-lg backdrop-blur-sm">
        <p className="min-w-0 flex-1 font-medium leading-snug">{payload.message}</p>
        <button
          type="button"
          className="shrink-0 rounded-lg p-1 text-error/80 transition-colors hover:bg-error/10 hover:text-error"
          aria-label="Fermer"
          onClick={() => setPayload(null)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
