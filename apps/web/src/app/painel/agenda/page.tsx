'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, PlayCircle, XCircle, Wallet, StickyNote, Phone, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Booking, BookingStatus } from '@/lib/types';

const STATUS_LABEL: Record<BookingStatus, string> = {
  SOLICITADO: 'Solicitado',
  ACEITO: 'Confirmado',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  RECUSADO: 'Recusado',
  CANCELADO: 'Cancelado',
};

const ACTIVE_STATUSES: BookingStatus[] = ['SOLICITADO', 'ACEITO', 'EM_ANDAMENTO'];

const NEXT_ACTIONS: Partial<Record<BookingStatus, { status: BookingStatus; label: string; icon: typeof CheckCircle2 }[]>> = {
  SOLICITADO: [
    { status: 'ACEITO', label: 'Confirmar', icon: CheckCircle2 },
    { status: 'RECUSADO', label: 'Recusar', icon: XCircle },
  ],
  ACEITO: [
    { status: 'EM_ANDAMENTO', label: 'Iniciar serviço', icon: PlayCircle },
    { status: 'CANCELADO', label: 'Cancelar', icon: XCircle },
  ],
  EM_ANDAMENTO: [
    { status: 'CONCLUIDO', label: 'Concluir', icon: CheckCircle2 },
    { status: 'CANCELADO', label: 'Cancelar', icon: XCircle },
  ],
};

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return raw;
}

function dayLabel(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const diffDays = Math.round((new Date(date).setHours(0, 0, 0, 0) - new Date(today).setHours(0, 0, 0, 0)) / 86400000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  if (diffDays === -1) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' });
}

function BookingCard({ booking }: { booking: Booking }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (status: BookingStatus) => (await api.patch(`/bookings/${booking.id}/status`, { status })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings', 'provider'] }),
  });

  const actions = NEXT_ACTIONS[booking.status] ?? [];

  return (
    <div className="border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{booking.client?.name ?? 'Cliente'}</p>
          {booking.client?.phone && (
            <a
              href={`https://wa.me/55${booking.client.phone.replace(/\D/g, '')}`}
              target="_blank"
              className="mt-0.5 flex w-fit items-center gap-1 text-xs text-accent hover:underline"
            >
              <Phone size={11} /> {formatPhone(booking.client.phone)}
            </a>
          )}
        </div>
        <span
          className={`shrink-0 border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
            booking.status === 'CONCLUIDO'
              ? 'border-success/40 text-success'
              : booking.status === 'CANCELADO' || booking.status === 'RECUSADO'
                ? 'border-border text-foreground-muted/60'
                : 'border-ink/30 text-ink'
          }`}
        >
          {STATUS_LABEL[booking.status]}
        </span>
      </div>

      {booking.service && <p className="mt-2 text-sm text-ink">{booking.service.title}</p>}

      {booking.scheduledAt && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-foreground-muted">
          <CalendarDays size={12} />
          {new Date(booking.scheduledAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
      {booking.notes && (
        <p className="mt-1 flex items-start gap-1.5 text-xs text-foreground-muted">
          <StickyNote size={12} className="mt-0.5 shrink-0" /> {booking.notes}
        </p>
      )}
      {booking.priceQuoted != null && (
        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-ink">
          <Wallet size={12} /> R$ {booking.priceQuoted.toFixed(2).replace('.', ',')}
        </p>
      )}

      {actions.length > 0 && (
        <div className="mt-3 flex gap-2">
          {actions.map((a) => (
            <button
              key={a.status}
              onClick={() => mutation.mutate(a.status)}
              disabled={mutation.isPending}
              className={`flex items-center gap-1.5 border px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${
                a.status === 'RECUSADO' || a.status === 'CANCELADO'
                  ? 'border-border text-foreground-muted hover:border-danger hover:text-danger'
                  : 'border-ink bg-ink text-background hover:opacity-85'
              }`}
            >
              <a.icon size={13} /> {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgendaPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'PRESTADOR') router.push('/');
  }, [token, user, router]);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings', 'provider'],
    enabled: !!token,
    queryFn: async () => (await api.get<Booking[]>('/bookings/provider')).data,
  });

  if (isLoading || !bookings) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-foreground-muted">Carregando agenda...</div>;
  }

  const active = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status));
  const history = bookings.filter((b) => !ACTIVE_STATUSES.includes(b.status));

  const withDate = active
    .filter((b) => b.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());
  const withoutDate = active
    .filter((b) => !b.scheduledAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const groups = new Map<string, Booking[]>();
  for (const b of withDate) {
    const key = new Date(b.scheduledAt!).toDateString();
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="flex items-center gap-2 font-display text-3xl text-ink">
        <CalendarDays size={26} className="text-accent" /> Agenda
      </h1>
      <p className="mt-2 text-foreground-muted">
        Suas reservas confirmadas, vagas de última hora e propostas aceitas, tudo em um só lugar.
      </p>

      {active.length === 0 && (
        <p className="mt-10 text-foreground-muted">Nenhum compromisso ativo agora. Novos serviços aceitos aparecem aqui.</p>
      )}

      {withoutDate.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-foreground-muted">
            Sem data combinada ainda
          </h2>
          <div className="space-y-3">
            {withoutDate.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        </div>
      )}

      {[...groups.entries()].map(([dateKey, items]) => (
        <div key={dateKey} className="mt-10">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-foreground-muted">
            {dayLabel(items[0].scheduledAt!)}
          </h2>
          <div className="space-y-3">
            {items.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        </div>
      ))}

      {history.length > 0 && (
        <div className="mt-12 border-t border-border pt-6">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium text-foreground-muted hover:text-ink"
          >
            <ChevronDown size={14} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            Histórico ({history.length})
          </button>
          {showHistory && (
            <div className="mt-4 space-y-3">
              {history.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
