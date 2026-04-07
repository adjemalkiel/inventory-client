import axios from 'axios';

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
const baseURL = viteEnv?.PUBLIC_API_URL ?? '/api/';

export const http = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default http;
