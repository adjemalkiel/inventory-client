import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import axios from 'axios';

import { authApi, meApi } from '@/lib/api';
import { API_UNAUTHORIZED_EVENT } from '@/lib/api/httpSessionEvents';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  setRememberPreference,
} from '@/lib/auth';
import type { MeResponse, UserProfileRole } from '@/types/api';
import type { UserId, UUID } from '@/types/common';

export type CurrentUserStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'unauthenticated'
  | 'error';

/**
 * Vue consolidée de l’utilisateur connecté (identité, rôle, permissions, scope).
 * Dérivée de `GET /me/` (`MeResponse`).
 */
export type AuthUser = {
  id: UserId;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: UserProfileRole;
  roleLabel: string;
  permissions: string[];
  scopedProjectIds: UUID[];
  scopedStorageLocationIds: UUID[];
  siteId: UUID | null;
  siteName: string | null;
};

function meToAuthUser(me: MeResponse): AuthUser {
  const u = me.user;
  const p = me.profile;
  const displayName =
    [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.username;
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    firstName: u.first_name,
    lastName: u.last_name,
    displayName,
    role: p.role,
    roleLabel: p.role_label,
    permissions: [...me.permissions],
    scopedProjectIds: [...p.scoped_project_ids],
    scopedStorageLocationIds: [...p.scoped_storage_location_ids],
    siteId: p.site,
    siteName: p.site_name,
  };
}

export type AuthContextValue = {
  /** Réponse brute `/me/` (compatibilité). */
  me: MeResponse | null;
  /** Utilisateur connecté à plat : `null` si non authentifié. */
  user: AuthUser | null;
  status: CurrentUserStatus;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  clear: () => void;
  /** Connexion : POST login, cookie refresh, puis charge `/me/`. */
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  /** Vérifie un code permission RBAC (ex. `users.manage`, `inventory.view`). */
  hasPermission: (permissionCode: string) => boolean;
};

/** @deprecated Préférer `AuthContextValue`. */
export type CurrentUserContextValue = AuthContextValue;

const CurrentUserContext = createContext<AuthContextValue | null>(null);

/**
 * Source de v\u00e9rit\u00e9 c\u00f4t\u00e9 client pour la session utilisateur.
 *
 * Au montage, l'access token est en m\u00e9moire (donc absent apr\u00e8s un
 * rechargement d'onglet). On tente alors un `POST /auth/refresh/` silencieux :
 * le cookie httpOnly est envoy\u00e9 automatiquement par le navigateur, le backend
 * r\u00e9pond `{ access }` (et r\u00e9-pose un cookie rotatif). On enchaine ensuite
 * sur `GET /me/` pour hydrater le profil.
 */
export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [status, setStatus] = useState<CurrentUserStatus>('idle');

  const refresh = useCallback(async () => {
    setStatus('loading');

    // S'il n'y a pas d'access en m\u00e9moire (boot ou onglet rechargé), on tente
    // un refresh silencieux via le cookie httpOnly avant d'appeler /me/.
    if (!getAccessToken()) {
      try {
        const res = await authApi.refresh();
        setAccessToken(res.access);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          clearAccessToken();
          setMe(null);
          setStatus('unauthenticated');
          return;
        }
        setMe(null);
        setStatus('error');
        return;
      }
    }

    try {
      const data = await meApi.get();
      setMe(data);
      setStatus('ready');
    } catch (err) {
      // L'intercepteur http a d\u00e9j\u00e0 retent\u00e9 un refresh : si on re\u00e7oit encore 401,
      // c'est que la session est r\u00e9ellement morte.
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        clearAccessToken();
        setMe(null);
        setStatus('unauthenticated');
        return;
      }
      setMe(null);
      setStatus('error');
    }
  }, []);

  const clear = useCallback(() => {
    setMe(null);
    setStatus('unauthenticated');
  }, []);

  /** Synchronise la session React lorsqu’un 401 fatale est traité par `http.ts`. */
  useEffect(() => {
    const onApiUnauthorized = () => {
      clearAccessToken();
      clear();
    };
    window.addEventListener(API_UNAUTHORIZED_EVENT, onApiUnauthorized);
    return () => {
      window.removeEventListener(API_UNAUTHORIZED_EVENT, onApiUnauthorized);
    };
  }, [clear]);

  const logout = useCallback(async () => {
    try {
      // Le backend lit le cookie, blackliste le refresh, et supprime le cookie
      // (`Set-Cookie: ...; Max-Age=0`). Idempotent : 204 m\u00eame sans cookie.
      await authApi.logout();
    } catch {
      /* still clear client session */
    }
    clearAccessToken();
    clear();
  }, [clear]);

  const login = useCallback(
    async (email: string, password: string, remember = true) => {
      const res = await authApi.login({
        email: email.trim(),
        password,
        remember,
      });
      setAccessToken(res.access);
      setRememberPreference(remember);
      await refresh();
    },
    [refresh],
  );

  const hasPermission = useCallback(
    (permissionCode: string) => {
      if (!me?.permissions?.length) {
        return false;
      }
      return me.permissions.includes(permissionCode);
    },
    [me],
  );

  const user = useMemo(() => (me ? meToAuthUser(me) : null), [me]);

  const isAuthenticated = status === 'ready' && me !== null;

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      me,
      user,
      status,
      isAuthenticated,
      refresh,
      clear,
      login,
      logout,
      hasPermission,
    }),
    [
      me,
      user,
      status,
      isAuthenticated,
      refresh,
      clear,
      login,
      logout,
      hasPermission,
    ],
  );

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): AuthContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error('useCurrentUser must be used within CurrentUserProvider');
  }
  return ctx;
}

/** Alias de `useCurrentUser` — API « Auth » explicite. */
export function useAuth(): AuthContextValue {
  return useCurrentUser();
}
