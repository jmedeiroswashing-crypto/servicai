import { api } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

/** Envia o arquivo pro backend e devolve a URL completa e pronta pra usar num <img>. */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  // Não define Content-Type manualmente: o axios/navegador precisa gerar o
  // boundary do multipart sozinho a partir do FormData.
  const res = await api.post<{ url: string }>('/uploads', formData);
  return `${API_ORIGIN}${res.data.url}`;
}
