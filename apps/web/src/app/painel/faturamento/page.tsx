'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingUp, Receipt, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Earnings } from '@/lib/types';

function formatMoney(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function EarningsChart({ months }: { months: Earnings['months'] }) {
  const max = Math.max(...months.map((m) => m.total), 1);

  return (
    <div className="flex items-end gap-3 border border-border p-5" style={{ height: 200 }}>
      {months.map((m, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-full w-full items-end">
            <div
              className={`w-full transition-all ${m.total > 0 ? 'bg-ink' : 'bg-surface-muted'}`}
              style={{ height: `${m.total > 0 ? Math.max((m.total / max) * 100, 4) : 2}%` }}
              title={formatMoney(m.total)}
            />
          </div>
          <span className="text-xs capitalize text-foreground-muted">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function FaturamentoPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'PRESTADOR') router.push('/');
  }, [token, user, router]);

  const { data: earnings, isLoading } = useQuery({
    queryKey: ['bookings', 'earnings'],
    enabled: !!token,
    queryFn: async () => (await api.get<Earnings>('/bookings/earnings')).data,
  });

  if (isLoading || !earnings) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-foreground-muted">Carregando faturamento...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="flex items-center gap-2 font-display text-3xl text-ink">
        <Wallet size={26} className="text-accent" /> Faturamento
      </h1>
      <p className="mt-2 text-foreground-muted">Acompanhe quanto você fechou em serviços concluídos.</p>

      <div className="mt-4 flex items-start gap-2 border border-accent/30 bg-accent/5 p-4 text-sm text-foreground-muted">
        <Info size={15} className="mt-0.5 shrink-0 text-accent" />
        <p>
          Esses valores são o que foi <strong className="text-ink">combinado</strong> entre você e cada cliente nas
          reservas concluídas — o app ainda não processa pagamento, então isso não é uma confirmação financeira
          auditada.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 border border-border sm:grid-cols-4">
        <div className="border-r border-border p-5">
          <p className="font-display text-2xl text-ink">{formatMoney(earnings.currentMonthTotal)}</p>
          <p className="mt-1 text-xs text-foreground-muted">Este mês</p>
        </div>
        <div className="border-r border-border p-5 sm:border-r">
          <p className="font-display text-2xl text-ink">{earnings.currentMonthCount}</p>
          <p className="mt-1 text-xs text-foreground-muted">Serviços este mês</p>
        </div>
        <div className="border-r border-border p-5">
          <p className="font-display text-2xl text-ink">{formatMoney(earnings.avgTicket)}</p>
          <p className="mt-1 text-xs text-foreground-muted">Ticket médio</p>
        </div>
        <div className="p-5">
          <p className="font-display text-2xl text-ink">{formatMoney(earnings.totalAllTime)}</p>
          <p className="mt-1 text-xs text-foreground-muted">Acumulado total</p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-3 flex items-center gap-1.5 font-display text-xl text-ink">
          <TrendingUp size={18} className="text-foreground-muted" /> Últimos 6 meses
        </h2>
        <EarningsChart months={earnings.months} />
      </div>

      <div className="mt-10 flex items-center gap-2 text-sm text-foreground-muted">
        <Receipt size={15} />
        {earnings.totalServicesCompleted} serviço{earnings.totalServicesCompleted === 1 ? '' : 's'} concluído
        {earnings.totalServicesCompleted === 1 ? '' : 's'} no total desde que você começou.
      </div>
    </div>
  );
}
