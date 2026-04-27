import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/auth';
import { emitApiForbidden, emitApiUnauthorized } from '@/lib/api/httpSessionEvents';

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
const baseURL = viteEnv?.PUBLIC_API_URL ?? '/api/v1/';

export const http = axios.create({
  baseURL,
  // Le refresh token est un cookie httpOnly : `withCredentials` est obligatoire
  // pour que le navigateur l'envoie/reconnaisse les `Set-Cookie` retours, en
  // particulier en cross-origin (prod). En dev le proxy Vite est same-origin
  // et `withCredentials` est sans effet.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * En-tête `Authorization: Bearer <access>` sur chaque requête lorsqu'un jeton
 * est présent en mémoire (`lib/auth.ts`).
 */
http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

/**
 * Intercepteur de refresh : sur un 401, on tente un appel à `/auth/refresh/`
 * (cookie httpOnly) puis on rejoue la requête originale une seule fois.
 * Si le refresh échoue ou si un second 401 survient, on invalide la session
 * (`app:unauthorized`) pour que le contexte utilisateur se vide et que les
 * routes protégées renvoient vers `/login`.
 *
 * Les 403 déclenchent un message global « Accès interdit » (`app:api-forbidden`).
 */
type RetriableConfig = AxiosRequestConfig & { _retry?: boolean };

let inflightRefresh: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  if (!inflightRefresh) {
    inflightRefresh = axios
      .post<{ access: string }>(
        `${baseURL.replace(/\/$/, '')}/auth/refresh/`,
        {},
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } },
      )
      .then((res) => {
        const access = res.data?.access ?? null;
        if (access) {
          setAccessToken(access);
        }
        return access;
      })
      .catch(() => {
        clearAccessToken();
        return null;
      })
      .finally(() => {
        inflightRefresh = null;
      });
  }
  return inflightRefresh;
}

function isAuthExemptUrl(url: string): boolean {
  return (
    url.includes('auth/login/') ||
    url.includes('auth/refresh/') ||
    url.includes('auth/logout/') ||
    url.includes('auth/activate/') ||
    url.includes('auth/password-reset/')
  );
}

function detailFromAxiosError(error: AxiosError): string | undefined {
  const data = error.response?.data;
  if (data && typeof data === 'object' && 'detail' in data) {
    const d = (data as { detail: unknown }).detail;
    if (typeof d === 'string') {
      return d;
    }
    if (Array.isArray(d) && d.length > 0 && typeof d[0] === 'string') {
      return d.join(' ');
    }
  }
  return undefined;
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (status === 403) {
      const msg = detailFromAxiosError(error);
      emitApiForbidden(msg ?? 'Accès interdit');
      return Promise.reject(error);
    }

    if (status !== 401 || !original) {
      return Promise.reject(error);
    }

    const url = original.url ?? '';

    if (isAuthExemptUrl(url)) {
      return Promise.reject(error);
    }

    if (original._retry) {
      emitApiUnauthorized();
      return Promise.reject(error);
    }

    original._retry = true;
    const newAccess = await performRefresh();
    if (!newAccess) {
      emitApiUnauthorized();
      return Promise.reject(error);
    }
    original.headers = original.headers ?? {};
    (original.headers as Record<string, string>).Authorization = `Bearer ${newAccess}`;
    return http.request(original);
  },
);

export default http;
