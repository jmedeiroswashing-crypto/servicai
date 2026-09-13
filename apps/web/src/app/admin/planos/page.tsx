'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { AdminOverview } from '@/lib/types';

const PLAN_LABEL: Record<string, string> = { GRATIS: 'Grátis', PRO: 'Profissional', PREMIUM: 'Premium' };

export default function AdminPlanosPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'ADMIN') router.push('/');
  }, [token, user, router]);

  const { data } = useQuery({
    queryKey: ['subscriptions', 'admin-overview'],
    enabled: !!token && user?.role === 'ADMIN',
    queryFn: async () => (await api.get<AdminOverview>('/subscriptions/admin/overview')).data,
  });

  if (user?.role !== 'ADMIN' || !data) {
    return <div className="mx-auto max-w-5xl px-4 py-20 text-foreground-muted">Carregando...</div>;
  }

  const total = data.totalProviders || 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl text-ink">Planos — visão administrativa</h1>
      <p className="mt-2 text-foreground-muted">Números agregados de monetização dos prestadores.</p>

      <div className="mt-10 grid grid-cols-2 border border-border sm:grid-cols-4">
        <div className="p-5">
          <p className="font-display text-2xl text-ink">{data.totalProviders}</p>
          <p className="mt-1 text-xs text-foreground-muted">Prestadores no total</p>
        </div>
        <div className="border-l border-border p-5">
          <p className="font-display text-2xl text-ink">R$ {data.mrr.toFixed(2).replace('.', ',')}</p>
          <p className="mt-1 text-xs text-foreground-muted">Receita recorrente estimada (MRR)</p>
        </div>
        <div className="border-l border-border p-5">
          <p className="font-display text-2xl text-ink">{(data.conversionRate * 100).toFixed(1)}%</p>
          <p className="mt-1 text-xs text-foreground-muted">Conversão grátis → pago</p>
        </div>
        <div className="border-l border-border p-5">
          <p className="font-display text-2xl text-ink">{data.cancelamentosSolicitados}</p>
          <p className="mt-1 text-xs text-foreground-muted">Cancelamentos solicitados</p>
        </div>
      </div>

      <h2 className="mt-12 font-display text-xl text-ink">Prestadores por plano</h2>
      <div className="mt-4 space-y-3">
        {Object.entries(data.byPlan).map(([plan, count]) => (
          <div key={plan}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-ink">{PLAN_LABEL[plan] ?? plan}</span>
              <span className="text-foreground-muted">{count}</span>
            </div>
            <div className="h-1.5 w-full bg-surface-muted">
              <div className="h-1.5 bg-accent" style={{ width: `${(count / total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-10 text-xs text-foreground-muted/70">
        Sem gráfico de evolução ao longo do tempo ou gestão de planos por aqui ainda — isso exige uma tabela de
        auditoria de mudanças de plano, que ainda não existe. Próximo passo natural do painel administrativo.
      </p>
    </div>
  );
}
