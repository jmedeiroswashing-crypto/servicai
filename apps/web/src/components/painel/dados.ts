'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { hoje, intervalo, somaDias, usePeriodo } from '@/lib/painel/periodo';
import { primeiroDia } from '@/lib/painel/numeros';
import { useAuthStore } from '@/store/auth-store';
import type { Booking, ClientSummary, Expense, FinancialGoal, Income, ProviderProfile } from '@/lib/types';

function useLista<T>(chave: string[], rota: string) {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: chave,
    enabled: !!token,
    queryFn: async () => (await api.get<T>(rota)).data,
  });
}

/** Dados do painel. As chaves são as mesmas das telas reaproveitadas, então uma mudança atualiza todas. */
export const useIncomes = () => useLista<Income[]>(['incomes', 'mine'], '/incomes/mine');
export const useExpenses = () => useLista<Expense[]>(['expenses', 'mine'], '/expenses/mine');
export const useBookings = () => useLista<Booking[]>(['bookings', 'provider'], '/bookings/provider');
export const useGoals = () => useLista<FinancialGoal[]>(['goals', 'mine'], '/goals/mine');
export const useClientes = () => useLista<ClientSummary[]>(['bookings', 'clients'], '/bookings/clients');
/** Só os campos do próprio perfil: `user` e `services` não vêm aqui. */
export const useProvider = () => useLista<Omit<ProviderProfile, 'user' | 'services'>>(['providers', 'me'], '/providers/me');
/** O perfil com nome, foto, telefone e serviços. */
export const useProviderCompleto = () => useLista<ProviderProfile>(['providers', 'me', 'full'], '/providers/me/full');

/** O intervalo escolhido no cabeçalho, com o "Desde o início" no primeiro movimento real. */
export function useIntervalo() {
  const periodo = usePeriodo();
  const { data: incomes } = useIncomes();
  const { data: expenses } = useExpenses();
  return useMemo(() => {
    const h = hoje();
    const inicio = primeiroDia(incomes ?? [], expenses ?? [], somaDias(h, -29));
    return intervalo(periodo, h, inicio);
  }, [periodo, incomes, expenses]);
}
