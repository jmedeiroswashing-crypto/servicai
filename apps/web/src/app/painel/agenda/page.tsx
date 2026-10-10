'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  CheckCircle2,
  PlayCircle,
  XCircle,
  Wallet,
  StickyNote,
  Phone,
  ChevronDown,
  Plus,
  Trash2,
  BellRing,
  BellOff,
  Clock3,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { BookingDisputeSection } from '@/components/BookingDisputeSection';
import { isPushSupported, getCurrentPushSubscription } from '@/lib/push';
import type { Appointment, Booking, BookingStatus } from '@/lib/types';

function PushReminderNotice() {
  const [status, setStatus] = useState<{ supported: boolean; subscribed: boolean } | null>(null);

  useEffect(() => {
    getCurrentPushSubscription().then((sub) => {
      setStatus({ supported: isPushSupported(), subscribed: !!sub });
    });
  }, []);

  if (!status || !status.supported || status.subscribed) return null;

  return (
    <div className="mt-6 flex items-start gap-2.5 border border-warning/40 bg-warning/5 p-3.5 text-sm text-foreground-muted">
      <BellOff size={16} className="mt-0.5 shrink-0 text-warning" />
      <p>
        As notificações push estão desativadas — você não vai receber lembrete de compromisso com o app fechado.{' '}
        <Link href="/perfil" className="font-medium text-accent hover:underline">
          Ativar em Perfil → Configurações
        </Link>
        .
      </p>
    </div>
  );
}

function AddAppointmentForm({ onAdded }: { onAdded: () => void }) {
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/appointments', {
          title,
          scheduledAt: new Date(scheduledAt).toISOString(),
          notes: notes || undefined,
        })
      ).data,
    onSuccess: () => {
      setTitle('');
      setScheduledAt('');
      setNotes('');
      onAdded();
    },
  });

  const inputClass =
    'w-full border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-foreground-muted/50';

  return (
    <div className="border border-border p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-ink">
        <Plus size={14} /> Novo compromisso
      </p>
      <div className="space-y-2.5">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="O que é? Ex: visita ao cliente" />
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className={inputClass}
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={inputClass}
          placeholder="Observações (opcional)"
        />
        {mutation.isError && <p className="text-xs text-danger">Não foi possível adicionar. Confira a data e tente novamente.</p>}
        <button
          onClick={() => mutation.mutate()}
          disabled={!title.trim() || !scheduledAt || mutation.isPending}
          className="w-full bg-ink py-2.5 text-sm font-medium text-background hover:opacity-85 disabled:opacity-40 sm:w-auto sm:px-6"
        >
          {mutation.isPending ? 'Adicionando...' : 'Adicionar ao calendário'}
        </button>
      </div>
    </div>
  );
}

function AppointmentRow({ appointment, onRemoved }: { appointment: Appointment; onRemoved: () => void }) {
  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/appointments/${appointment.id}`),
    onSuccess: onRemoved,
  });

  const date = new Date(appointment.scheduledAt);
  const isPast = date < new Date();

  return (
    <div className={`flex items-start justify-between gap-3 border border-border p-4 ${isPast ? 'opacity-50' : ''}`}>
      <div>
        <p className="font-medium text-ink">{appointment.title}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-foreground-muted">
          <Clock3 size={12} />
          {date.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </p>
        {appointment.notes && <p className="mt-1.5 text-sm text-foreground-muted">{appointment.notes}</p>}
        {appointment.notifiedAt && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-success">
            <BellRing size={11} /> Lembrete enviado
          </p>
        )}
      </div>
      <button
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
        className="shrink-0 text-foreground-muted hover:text-danger disabled:opacity-40"
        aria-label="Remover compromisso"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function AppointmentsSection() {
  const queryClient = useQueryClient();
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments', 'mine'],
    queryFn: async () => (await api.get<Appointment[]>('/appointments/mine')).data,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['appointments', 'mine'] });
  }

  const sorted = [...(appointments ?? [])].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return (
    <div className="mt-10">
      <h2 className="mb-3 flex items-center gap-1.5 font-display text-xl text-ink">
        <BellRing size={18} className="text-accent" /> Meus compromissos
      </h2>
      <p className="mb-3 text-sm text-foreground-muted">
        Anote seus compromissos do dia, da semana ou do mês — você recebe uma notificação na hora marcada, mesmo com o
        app fechado.
      </p>
      <PushReminderNotice />
      <div className="mt-4 space-y-3">
        <AddAppointmentForm onAdded={refresh} />
        {isLoading && <p className="text-sm text-foreground-muted">Carregando compromissos...</p>}
        {!isLoading && sorted.length === 0 && <p className="text-sm text-foreground-muted">Nenhum compromisso marcado ainda.</p>}
        {sorted.map((a) => (
          <AppointmentRow key={a.id} appointment={a} onRemoved={refresh} />
        ))}
      </div>
    </div>
  );
}

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

      <BookingDisputeSection bookingId={booking.id} bookingStatus={booking.status} />
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

      <AppointmentsSection />

      <div className="mt-12 border-t border-border pt-8">
        <h2 className="mb-1 font-display text-xl text-ink">Reservas</h2>

        {active.length === 0 && (
          <p className="mt-6 text-foreground-muted">Nenhuma reserva ativa agora. Novos serviços aceitos aparecem aqui.</p>
        )}

        {withoutDate.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-foreground-muted">
              Sem data combinada ainda
            </h3>
            <div className="space-y-3">
              {withoutDate.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </div>
          </div>
        )}

        {[...groups.entries()].map(([dateKey, items]) => (
          <div key={dateKey} className="mt-6">
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-foreground-muted">
              {dayLabel(items[0].scheduledAt!)}
            </h3>
            <div className="space-y-3">
              {items.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))}
            </div>
          </div>
        ))}

        {history.length > 0 && (
          <div className="mt-10 border-t border-border pt-6">
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
    </div>
  );
}
