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
import { clearStoredToken, getStoredToken } from '@/lib/auth';
import type { MeResponse } from '@/types/api';

export type CurrentUserStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'unauthenticated'
  | 'error';

type CurrentUserContextValue = {
  me: MeResponse | null;
  status: CurrentUserStatus;
  refresh: () => Promise<void>;
  clear: () => void;
  logout: () => Promise<void>;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(
  null,
);

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [status, setStatus] = useState<CurrentUserStatus>('idle');

  const refresh = useCallback(async () => {
    if (!getStoredToken()) {
      setMe(null);
      setStatus('unauthenticated');
      return;
    }
    setStatus('loading');
    try {
      const data = await meApi.get();
      setMe(data);
      setStatus('ready');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        clearStoredToken();
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

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* still clear client session */
    }
    clearStoredToken();
    clear();
  }, [clear]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ me, status, refresh, clear, logout }),
    [me, status, refresh, clear, logout],
  );

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error('useCurrentUser must be used within CurrentUserProvider');
  }
  return ctx;
}
