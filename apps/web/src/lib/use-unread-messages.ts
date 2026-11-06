'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useAuthStore } from '@/store/auth-store';
import type { NotificationItem } from './types';

/**
 * O chat não guarda "lida" por mensagem, então o contador usa as notificações
 * de nova mensagem ainda não lidas. Abrir Mensagens marca essas como lidas.
 */
export function useUnreadMessages() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    enabled: !!token,
    queryFn: async () => (await api.get<NotificationItem[]>('/notifications')).data,
  });

  const unread = data?.filter((n) => n.type === 'NOVA_MENSAGEM' && !n.read) ?? [];

  const { mutate } = useMutation({
    mutationFn: async (ids: string[]) => Promise.all(ids.map((id) => api.post(`/notifications/${id}/read`))),
    onSuccess: (_result, ids) => {
      queryClient.setQueryData<NotificationItem[]>(['notifications'], (old) =>
        old?.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)),
      );
    },
  });

  return {
    unreadCount: unread.length,
    markAllRead: () => {
      if (unread.length > 0) mutate(unread.map((n) => n.id));
    },
  };
}
