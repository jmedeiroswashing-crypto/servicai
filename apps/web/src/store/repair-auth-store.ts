import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RepairShopAuth {
  id: string;
  email: string;
  name: string;
}

interface RepairAuthState {
  token: string | null;
  shop: RepairShopAuth | null;
  setAuth: (token: string, shop: RepairShopAuth) => void;
  logout: () => void;
}

/**
 * Store completamente separado do useAuthStore (login de cliente/prestador
 * do ServiçAi) — a sessão da loja de conserto não tem nenhuma relação com
 * conta de usuário comum, por pedido explícito.
 */
export const useRepairAuthStore = create<RepairAuthState>()(
  persist(
    (set) => ({
      token: null,
      shop: null,
      setAuth: (token, shop) => set({ token, shop }),
      logout: () => set({ token: null, shop: null }),
    }),
    { name: 'servicai-repair-auth' },
  ),
);
