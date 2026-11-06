import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/lib/types';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'servicai-auth' },
  ),
);

/**
 * Use nas checagens de acesso. No primeiro render o hook ainda devolve token nulo
 * para combinar com o HTML estático, mesmo com sessão salva: decidir por ele manda
 * para o login quem só atualizou a página.
 */
export function hasSession(): boolean {
  return !!useAuthStore.getState().token;
}
