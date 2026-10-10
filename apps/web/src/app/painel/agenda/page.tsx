'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, PlayCircle, XCircle, Wallet, StickyNote, Phone, ChevronDown, ArrowRight, Plus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { BookingDisputeSection } from '@/components/BookingDisputeSection';
import { suggestExpenseCategory } from '@/lib/expense-categories';
import { ReceiptScanButton } from '@/components/ReceiptScanButton';
import type { Booking, BookingStatus, Earnings } from '@/lib/types';

function formatMoney(v: number) {
  const sign = v < 0 ? '-' : '';
  return `${sign}R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function QuickExpenseModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/expenses', {
          description,
          category: suggestExpenseCategory(description),
          amount: Number(amount),
        })
      ).data,
    onSuccess: () => {
      onAdded();
      onClose();
    },
  });

  const inputClass =
    'w-full border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-foreground-muted/50';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-sm border border-border bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg text-ink">
            <Wallet size={16} /> Lançar despesa rápida
          </h2>
          <button onClick={onClose} className="text-foreground-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            placeholder="O que foi? Ex: gasolina"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
              placeholder="R$ 0,00"
            />
            <ReceiptScanButton onExtracted={(value) => value !== null && setAmount(String(value))} />
          </div>
          <p className="text-xs text-foreground-muted/70">
            A categoria é sugerida automaticamente pela descrição. Pra mais opções (categoria manual, repetir todo
            mês), use o Faturamento completo.
          </p>
          {mutation.isError && <p className="text-xs text-danger">Não foi possível lançar. Tente novamente.</p>}
          <button
            onClick={() => mutation.mutate()}
            disabled={!description.trim() || !amount || Number(amount) <= 0 || mutation.isPending}
            className="w-full bg-ink py-2.5 text-sm font-medium text-background hover:opacity-85 disabled:opacity-40"
          >
            {mutation.isPending ? 'Lançando...' : 'Lançar despesa'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FaturamentoWidget() {
  const queryClient = useQueryClient();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { data: earnings, isLoading } = useQuery({
    queryKey: ['bookings', 'earnings'],
    queryFn: async () => (await api.get<Earnings>('/bookings/earnings')).data,
  });

  if (isLoading || !earnings) return null;

  const profitPositive = earnings.netProfitCurrentMonth >= 0;

  return (
    <div className="mt-6 border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Wallet size={18} className="shrink-0 text-accent" />
          <div>
            <p className="text-xs uppercase tracking-wide text-foreground-muted">Faturamento deste mês</p>
            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
              <span className="text-ink">
                Receita <strong className="font-display text-base">{formatMoney(earnings.currentMonthTotal)}</strong>
              </span>
              <span className="text-foreground-muted">
                Despesas <strong className="text-danger">{formatMoney(earnings.currentMonthExpenses)}</strong>
              </span>
              <span className={profitPositive ? 'text-success' : 'text-danger'}>
                Lucro líquido <strong>{formatMoney(earnings.netProfitCurrentMonth)}</strong>
              </span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex items-center gap-1 border border-border px-2.5 py-1.5 text-xs font-medium text-ink hover:border-ink"
          >
            <Plus size={13} /> Despesa
          </button>
          <Link href="/painel/faturamento" className="flex items-center gap-1 text-xs font-medium text-accent hover:underline">
            Ver completo <ArrowRight size={13} />
          </Link>
        </div>
      </div>
      {quickAddOpen && (
        <QuickExpenseModal
          onClose={() => setQuickAddOpen(false)}
          onAdded={() => queryClient.invalidateQueries({ queryKey: ['bookings', 'earnings'] })}
        />
      )}
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

      <FaturamentoWidget />

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
