import React from 'react';
import { Navigate, Outlet, useLocation, type Location } from 'react-router-dom';

import { useAuth } from '@/context/CurrentUserContext';
import { AuthLoading } from '@/components/AuthLoading';

/**
 * Enfant de route : utilisateur authentifié uniquement (`GET /me/` OK).
 * Affiche un loader tant que `status` est `idle` | `loading`.
 */
export function ProtectedRoute() {
  const { isAuthenticated, status } = useAuth();
  const location = useLocation();

  if (status === 'idle' || status === 'loading') {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

type GuestRouteProps = {
  children: React.ReactNode;
};

/**
 * Routes publiques (login, mot de passe oublié) : si déjà connecté, on évite
 * d’afficher le formulaire et on renvoie vers le tableau de bord (ou l’URL
 * demandée dans `state.from` si elle a été posée par `ProtectedRoute`).
 */
export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, status } = useAuth();
  const location = useLocation();

  if (status === 'idle' || status === 'loading') {
    return <AuthLoading />;
  }

  if (isAuthenticated) {
    const from = (location.state as { from?: Location } | null | undefined)?.from;
    if (from) {
      return (
        <Navigate
          to={{ pathname: from.pathname, search: from.search ?? '', hash: from.hash ?? '' }}
          replace
        />
      );
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

type RequirePermissionProps = {
  /** Au moins une de ces permissions RBAC doit être accordée. */
  anyOf: string[];
  children: React.ReactNode;
};

/**
 * Garde fine sur des codes permission (ex. `settings.manage`). À placer **sous**
 * un `ProtectedRoute` (ou tout parent qui garantit une session).
 */
export function RequirePermission({ anyOf, children }: RequirePermissionProps) {
  const { hasPermission, isAuthenticated, status } = useAuth();
  const location = useLocation();

  if (status === 'idle' || status === 'loading') {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const allowed = anyOf.some((code) => hasPermission(code));
  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

type RootRedirectProps = {
  /** Cible si l’utilisateur est connecté. */
  authenticatedTo?: string;
  /** Cible si non connecté. */
  unauthenticatedTo?: string;
};

/**
 * Pour `/` : envoie vers le tableau de bord ou le login selon la session.
 */
export function RootRedirect({
  authenticatedTo = '/dashboard',
  unauthenticatedTo = '/login',
}: RootRedirectProps) {
  const { isAuthenticated, status } = useAuth();

  if (status === 'idle' || status === 'loading') {
    return <AuthLoading />;
  }

  if (isAuthenticated) {
    return <Navigate to={authenticatedTo} replace />;
  }

  return <Navigate to={unauthenticatedTo} replace />;
}
