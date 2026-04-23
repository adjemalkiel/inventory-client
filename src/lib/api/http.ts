import axios from 'axios';

import { getStoredToken } from '@/lib/auth';

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
const baseURL = viteEnv?.PUBLIC_API_URL ?? '/api/';

export const http = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export default http;
