import axios from 'axios';
import { useRepairAuthStore } from '@/store/repair-auth-store';

/**
 * Cliente HTTP próprio da ferramenta de conserto — não usa o `api` global
 * (que anexa o token de usuário comum do ServiçAi e desloga essa sessão em
 * qualquer 401). Mesma baseURL/backend, sessão e tratamento de erro
 * totalmente separados.
 */
export const repairApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
});

repairApi.interceptors.request.use((config) => {
  const token = useRepairAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

repairApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useRepairAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);
