'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Star, X } from 'lucide-react';
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

const CRITERIA: { key: 'rating' | 'pontualidade' | 'qualidade' | 'preco' | 'atendimento'; label: string }[] = [
  { key: 'rating', label: 'Nota geral' },
  { key: 'pontualidade', label: 'Pontualidade' },
  { key: 'qualidade', label: 'Qualidade do serviço' },
  { key: 'preco', label: 'Custo-benefício' },
  { key: 'atendimento', label: 'Atendimento' },
];

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} estrelas`}>
          <Star size={20} className={n <= value ? 'fill-accent text-accent' : 'text-border'} />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<string, number>>({
    rating: 0,
    pontualidade: 0,
    qualidade: 0,
    preco: 0,
    atendimento: 0,
  });
  const [comment, setComment] = useState('');

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/reviews', { bookingId, comment: comment || undefined, ...scores })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'mine'] });
      onDone();
    },
  });

  const canSubmit = Object.values(scores).every((v) => v > 0);

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      {CRITERIA.map((c) => (
        <div key={c.key} className="flex items-center justify-between">
          <label className="text-sm text-foreground-muted">{c.label}</label>
          <StarPicker value={scores[c.key]} onChange={(v) => setScores((s) => ({ ...s, [c.key]: v }))} />
        </div>
      ))}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Conte como foi sua experiência (opcional)"
        className="w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-ink"
      />
      {mutation.isError && (
        <p className="text-xs text-danger">
          {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Não foi possível enviar a avaliação.'}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          className="bg-ink px-4 py-2 text-sm font-medium text-background hover:opacity-85 disabled:opacity-40"
        >
          {mutation.isPending ? 'Enviando...' : 'Enviar avaliação'}
        </button>
        <button onClick={onDone} className="px-4 py-2 text-sm text-foreground-muted hover:text-ink">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function BookingRow({ booking }: { booking: Booking }) {
  const [reviewing, setReviewing] = useState(false);
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: async () => (await api.patch(`/bookings/${booking.id}/cancel`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings', 'mine'] }),
  });

  return (
    <div className="border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{booking.provider?.user.name ?? 'Prestador'}</p>
          {booking.service && <p className="text-sm text-foreground-muted">{booking.service.title}</p>}
          {booking.notes && <p className="mt-1 text-xs text-foreground-muted">{booking.notes}</p>}
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

      {booking.priceQuoted != null && (
        <p className="mt-2 text-sm font-medium text-ink">R$ {booking.priceQuoted.toFixed(2).replace('.', ',')}</p>
      )}

      {ACTIVE_STATUSES.includes(booking.status) && (
        <button
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
          className="mt-3 flex items-center gap-1 text-xs text-foreground-muted hover:text-danger"
        >
          <X size={12} /> Cancelar
        </button>
      )}

      {booking.status === 'CONCLUIDO' && !booking.review && !reviewing && (
        <button
          onClick={() => setReviewing(true)}
          className="mt-3 flex items-center gap-1.5 border border-ink px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-ink hover:text-background"
        >
          <Star size={13} /> Avaliar
        </button>
      )}
      {booking.status === 'CONCLUIDO' && !booking.review && reviewing && (
        <ReviewForm bookingId={booking.id} onDone={() => setReviewing(false)} />
      )}
      {booking.review && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-success">
          <Star size={12} className="fill-success" /> Você avaliou este serviço com {booking.review.rating.toFixed(1)}
        </p>
      )}
    </div>
  );
}

export default function MinhasReservasPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'CLIENTE') router.push('/');
  }, [token, user, router]);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings', 'mine'],
    enabled: !!token,
    queryFn: async () => (await api.get<Booking[]>('/bookings/mine')).data,
  });

  if (isLoading || !bookings) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-foreground-muted">Carregando reservas...</div>;
  }

  const pendingReview = bookings.filter((b) => b.status === 'CONCLUIDO' && !b.review);
  const rest = bookings.filter((b) => !(b.status === 'CONCLUIDO' && !b.review));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="flex items-center gap-2 font-display text-3xl text-ink">
        <CalendarClock size={26} className="text-accent" /> Minhas reservas
      </h1>
      <p className="mt-2 text-foreground-muted">Acompanhe o status dos serviços que você contratou.</p>

      {bookings.length === 0 && <p className="mt-10 text-foreground-muted">Nenhuma reserva ainda.</p>}

      {pendingReview.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-foreground-muted">
            Esperando sua avaliação
          </h2>
          <div className="space-y-3">
            {pendingReview.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="mt-10">
          {pendingReview.length > 0 && (
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-foreground-muted">Outras reservas</h2>
          )}
          <div className="space-y-3">
            {rest.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
