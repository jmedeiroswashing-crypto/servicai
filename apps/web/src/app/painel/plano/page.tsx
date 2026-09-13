'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ArrowRight, Eye, Search, MessageSquare, Send, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { PerformanceMetrics, Subscription } from '@/lib/types';

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  ATIVA: { label: 'Ativa', tone: 'text-success' },
  TESTE: { label: 'Em período de teste', tone: 'text-accent' },
  PAGAMENTO_PENDENTE: { label: 'Pagamento pendente', tone: 'text-warning' },
  CANCELAMENTO_SOLICITADO: { label: 'Cancelamento solicitado', tone: 'text-warning' },
  CANCELADA: { label: 'Cancelada', tone: 'text-foreground-muted' },
  INADIMPLENTE: { label: 'Pagamento pendente', tone: 'text-warning' },
  EXPIRADA: { label: 'Expirada', tone: 'text-danger' },
};

const PLAN_LABEL: Record<string, string> = { GRATIS: 'Grátis', PRO: 'Profissional', PREMIUM: 'Premium', BUSINESS: 'Premium' };

function MeuPlanoContent() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const ativado = searchParams.get('ativado');
  const [showConfirmation, setShowConfirmation] = useState(!!ativado);

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'PRESTADOR') router.push('/');
  }, [token, user, router]);

  const { data: subscription } = useQuery({
    queryKey: ['subscriptions', 'me'],
    enabled: !!token,
    queryFn: async () => (await api.get<Subscription>('/subscriptions/me')).data,
  });

  const { data: performance } = useQuery({
    queryKey: ['subscriptions', 'performance'],
    enabled: !!token,
    queryFn: async () => (await api.get<PerformanceMetrics>('/subscriptions/me/performance')).data,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => (await api.post('/subscriptions/me/cancel')).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscriptions', 'me'] }),
  });

  if (!subscription || !performance) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-foreground-muted">Carregando seu plano...</div>;
  }

  const status = STATUS_LABEL[subscription.status] ?? { label: subscription.status, tone: 'text-foreground-muted' };
  const planLabel = PLAN_LABEL[subscription.effectivePlan] ?? subscription.config.label;
  const proposalsUnlimited = performance.proposalsLimit >= 999_999;
  const proposalsPct = proposalsUnlimited ? 0 : Math.min(100, (performance.proposalsUsed / performance.proposalsLimit) * 100);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl text-ink">Meu plano</h1>
      <p className="mt-2 text-foreground-muted">Sua presença profissional dentro do ServiçAi.</p>

      {showConfirmation && (
        <div className="mt-6 flex items-start justify-between gap-3 border border-ink bg-ink p-5 text-background">
          <div>
            <p className="font-medium">Seu plano {PLAN_LABEL[ativado ?? ''] ?? ativado} está ativo.</p>
            <p className="mt-1 text-sm text-background/75">
              Agora você aproveita uma maior exposição e mais oportunidades dentro da plataforma.
            </p>
          </div>
          <button onClick={() => setShowConfirmation(false)} className="shrink-0 text-sm text-background/60 hover:text-background">
            Fechar
          </button>
        </div>
      )}

      {/* Plano atual */}
      <div className="mt-8 border border-border p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-2xl text-ink">{planLabel}</p>
            <p className={`mt-1 text-sm font-medium ${status.tone}`}>{status.label}</p>
          </div>
          {subscription.config.verifiedBadge && (
            <span className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-ink">
              <ShieldCheck size={14} className="text-accent" /> Prestador verificado
            </span>
          )}
        </div>

        <ul className="mt-6 grid gap-2.5 text-sm sm:grid-cols-2">
          {subscription.config.benefits.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <Check size={15} className="mt-0.5 shrink-0 text-accent" />
              <span className="text-foreground-muted">{b}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Desempenho */}
      <div className="mt-8">
        <h2 className="font-display text-xl text-ink">Desempenho</h2>
        {!performance.hasPerformanceStats && (
          <p className="mt-2 text-sm text-foreground-muted">
            Estatísticas detalhadas fazem parte do plano Profissional.{' '}
            <Link href="/precos" className="text-accent hover:underline">
              Conheça os planos
            </Link>
            .
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 border border-border sm:grid-cols-3">
          <div className="border-border p-5">
            <Eye size={16} className="mb-2 text-foreground-muted" />
            <p className="font-display text-2xl text-ink">{performance.hasPerformanceStats ? performance.profileViews : '—'}</p>
            <p className="mt-1 text-xs text-foreground-muted">Visualizações do perfil</p>
          </div>
          <div className="border-l border-border p-5">
            <Search size={16} className="mb-2 text-foreground-muted" />
            <p className="font-display text-2xl text-ink">{performance.hasPerformanceStats ? performance.searchAppearances : '—'}</p>
            <p className="mt-1 text-xs text-foreground-muted">Aparições em buscas</p>
          </div>
          <div className="border-l border-border p-5 sm:border-l">
            <MessageSquare size={16} className="mb-2 text-foreground-muted" />
            <p className="font-display text-2xl text-ink">{performance.contactsCount}</p>
            <p className="mt-1 text-xs text-foreground-muted">Contatos realizados</p>
          </div>
        </div>

        <div className="mt-4 border border-border p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-ink">
              <Send size={14} /> Propostas de oportunidade este mês
            </span>
            <span className="text-foreground-muted">
              {performance.proposalsUsed} de {proposalsUnlimited ? 'ilimitadas' : performance.proposalsLimit}
            </span>
          </div>
          {!proposalsUnlimited && (
            <div className="h-1.5 w-full bg-surface-muted">
              <div
                className={`h-1.5 ${proposalsPct >= 100 ? 'bg-danger' : 'bg-accent'}`}
                style={{ width: `${proposalsPct}%` }}
              />
            </div>
          )}
          {!proposalsUnlimited && proposalsPct >= 80 && (
            <p className="mt-3 text-sm text-foreground-muted">
              Você está quase no limite. Cada proposta é uma chance de fechar um novo cliente —{' '}
              <Link href="/precos" className="text-accent hover:underline">
                desbloqueie mais oportunidades
              </Link>
              .
            </p>
          )}
        </div>
      </div>

      {/* Assinatura */}
      <div className="mt-8 border border-border p-6">
        <h2 className="font-display text-xl text-ink">Assinatura</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-foreground-muted">Valor</dt>
            <dd className="mt-0.5 text-ink">
              {subscription.config.priceMonthly === 0 ? 'Grátis' : `R$ ${subscription.config.priceMonthly.toFixed(2).replace('.', ',')}/mês`}
            </dd>
          </div>
          <div>
            <dt className="text-foreground-muted">Próxima cobrança</dt>
            <dd className="mt-0.5 text-ink">
              {subscription.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-foreground-muted">Forma de pagamento</dt>
            <dd className="mt-0.5 text-ink">
              {subscription.config.priceMonthly === 0 ? '—' : 'Simulado (sem gateway integrado)'}
            </dd>
          </div>
          <div>
            <dt className="text-foreground-muted">Status</dt>
            <dd className={`mt-0.5 font-medium ${status.tone}`}>{status.label}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/precos"
            className="flex items-center gap-1.5 bg-ink px-5 py-2.5 text-sm font-medium text-background hover:opacity-85"
          >
            Fazer upgrade <ArrowRight size={14} />
          </Link>
          {subscription.plan !== 'GRATIS' && subscription.status === 'ATIVA' && (
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="border border-border px-5 py-2.5 text-sm font-medium text-foreground-muted hover:border-ink hover:text-ink disabled:opacity-50"
            >
              {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar assinatura'}
            </button>
          )}
          {subscription.status === 'CANCELAMENTO_SOLICITADO' && (
            <p className="flex items-center text-sm text-foreground-muted">
              Você continua com os benefícios do {planLabel} até{' '}
              {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR') : 'o fim do período'}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MeuPlanoPage() {
  return (
    <Suspense fallback={null}>
      <MeuPlanoContent />
    </Suspense>
  );
}
