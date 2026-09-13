'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { createNotificationsSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth-store';
import type { NotificationItem } from '@/lib/types';

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

export function NotificationBell() {
  const { token } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    enabled: !!token,
    queryFn: async () => (await api.get<NotificationItem[]>('/notifications')).data,
  });

  useEffect(() => {
    if (!token) return;
    const socket = createNotificationsSocket(token);
    socketRef.current = socket;

    socket.on('notification', (notification: NotificationItem) => {
      queryClient.setQueryData<NotificationItem[]>(['notifications'], (old) =>
        old ? [notification, ...old] : [notification],
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [token, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<NotificationItem[]>(['notifications'], (old) =>
        old?.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => api.post('/notifications/read-all'),
    onSuccess: () => {
      queryClient.setQueryData<NotificationItem[]>(['notifications'], (old) => old?.map((n) => ({ ...n, read: true })));
    },
  });

  if (!token) return null;

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  function handleClick(n: NotificationItem) {
    if (!n.read) markReadMutation.mutate(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
        className="relative flex items-center justify-center border border-border p-2 text-foreground hover:border-ink/40"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-accent px-1 text-[0.65rem] font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 border border-border bg-surface shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium text-ink">Notificações</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-foreground-muted hover:text-ink"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {(!notifications || notifications.length === 0) && (
              <p className="p-6 text-center text-sm text-foreground-muted">Nenhuma notificação ainda.</p>
            )}
            {notifications?.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left hover:bg-surface-muted/60 ${
                  n.read ? '' : 'bg-accent/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  {!n.read && <span className="h-1.5 w-1.5 shrink-0 bg-accent" />}
                  <span className="text-sm font-medium text-ink">{n.title}</span>
                </div>
                <span className="text-xs text-foreground-muted">{n.body}</span>
                <span className="text-[0.65rem] text-foreground-muted/70">{timeAgo(n.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
