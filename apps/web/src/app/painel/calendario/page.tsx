'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { CalendarDay } from '@/lib/types';

function formatMoney(v: number) {
  const sign = v < 0 ? '-' : '';
  return `${sign}R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/** Intensidade da cor pelo tamanho do lucro/prejuízo em relação ao maior valor do mês. */
function intensity(value: number, max: number) {
  if (max <= 0) return 0.15;
  return Math.min(0.15 + (Math.abs(value) / max) * 0.7, 0.85);
}

export default function CalendarioPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<CalendarDay | null>(null);

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'PRESTADOR') router.push('/');
  }, [token, user, router]);

  const month = monthKey(cursor);

  const { data: days, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['calendar', month],
    enabled: !!token,
    queryFn: async () => (await api.get<CalendarDay[]>('/calendar', { params: { month } })).data,
  });

  if (isError) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-foreground-muted">
          Não foi possível carregar o calendário{status ? ` (erro ${status})` : ''}. Verifique sua conexão e tente de novo.
        </p>
        <button onClick={() => refetch()} className="mt-4 border border-ink px-4 py-2 text-sm font-medium text-ink hover:bg-ink hover:text-background">
          Tentar novamente
        </button>
      </div>
    );
  }

  const maxAbs = days ? Math.max(...days.map((d) => Math.abs(d.profit)), 1) : 1;
  const firstDay = days ? new Date(`${days[0].date}T12:00:00`) : null;
  const leadingBlanks = firstDay ? firstDay.getDay() : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="flex items-center gap-2 font-display text-3xl text-ink">
        <CalendarRange size={26} className="text-accent" /> Calendário financeiro
      </h1>
      <p className="mt-2 text-foreground-muted">Cada dia colorido pelo resultado — verde é lucro, vermelho é prejuízo.</p>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="border border-border p-2 hover:border-ink"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="font-display text-lg capitalize text-ink">{monthLabel(month)}</p>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="border border-border p-2 hover:border-ink"
          aria-label="Próximo mês"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {isLoading && <p className="mt-8 text-foreground-muted">Carregando...</p>}

      {days && (
        <>
          <div className="mt-6 grid grid-cols-7 gap-1.5 text-center text-xs text-foreground-muted">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`b-${i}`} />
            ))}
            {days.map((d) => {
              const dayNum = Number(d.date.slice(8, 10));
              const hasMoney = d.incomeTotal > 0 || d.expenseTotal > 0;
              const isProfit = d.profit > 0;
              const bg = !hasMoney
                ? undefined
                : isProfit
                  ? `rgba(34,197,94,${intensity(d.profit, maxAbs)})`
                  : `rgba(239,68,68,${intensity(d.profit, maxAbs)})`;
              return (
                <button
                  key={d.date}
                  onClick={() => setSelected(d)}
                  style={{ background: bg }}
                  className={`flex aspect-square flex-col items-center justify-center border text-xs transition-colors ${
                    selected?.date === d.date ? 'border-ink' : 'border-border'
                  } ${!hasMoney ? 'hover:border-ink' : ''}`}
                >
                  <span className="text-ink">{dayNum}</span>
                  {(d.appointmentsCount > 0 || d.bookingsCount > 0) && (
                    <span className="mt-0.5 h-1 w-1 rounded-full bg-ink" />
                  )}
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="mt-6 border border-border p-5">
              <p className="font-medium text-ink">
                {new Date(`${selected.date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-foreground-muted">Receita</p>
                  <p className="font-medium text-success">{formatMoney(selected.incomeTotal)}</p>
                </div>
                <div>
                  <p className="text-foreground-muted">Despesas</p>
                  <p className="font-medium text-danger">{formatMoney(selected.expenseTotal)}</p>
                </div>
                <div>
                  <p className="text-foreground-muted">Resultado</p>
                  <p className={`font-medium ${selected.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatMoney(selected.profit)}
                  </p>
                </div>
                <div>
                  <p className="text-foreground-muted">Compromissos/reservas</p>
                  <p className="font-medium text-ink">{selected.appointmentsCount + selected.bookingsCount}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
