'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Rocket } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { BoostInfo, PlanConfig, ProviderProfile, Subscription } from '@/lib/types';

function formatPrice(value: number) {
  if (value === 0) return 'Grátis';
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export default function PrecosPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  const { data: plans } = useQuery({
    queryKey: ['subscriptions', 'plans'],
    queryFn: async () => (await api.get<PlanConfig[]>('/subscriptions/plans')).data,
  });

  const { data: mySubscription } = useQuery({
    queryKey: ['subscriptions', 'me'],
    enabled: !!user && user.role === 'PRESTADOR',
    queryFn: async () => (await api.get<Subscription>('/subscriptions/me')).data,
  });

  const currentPlan = mySubscription?.effectivePlan;
  // Assinantes legados do plano Business (descontinuado) contam como Premium para
  // efeito de exibição — os benefícios já são os mesmos.
  const normalizedCurrentPlan = currentPlan === 'BUSINESS' ? 'PREMIUM' : currentPlan;

  const { data: boostInfo } = useQuery({
    queryKey: ['subscriptions', 'boost-info'],
    queryFn: async () => (await api.get<BoostInfo>('/subscriptions/boost')).data,
  });

  const { data: myProvider } = useQuery({
    queryKey: ['providers', 'me'],
    enabled: !!user && user.role === 'PRESTADOR',
    queryFn: async () => (await api.get<ProviderProfile>('/providers/me')).data,
  });

  const boostActiveUntil =
    myProvider?.boostExpiresAt && new Date(myProvider.boostExpiresAt) > new Date()
      ? new Date(myProvider.boostExpiresAt)
      : null;

  const purchaseBoost = useMutation({
    mutationFn: async () => (await api.post('/subscriptions/me/boost')).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers', 'me'] }),
  });

  const changePlan = useMutation({
    mutationFn: async (plan: string) => (await api.patch('/subscriptions/me', { plan })).data,
    onMutate: (plan) => setPendingPlan(plan),
    onSuccess: (_data, plan) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'me'] });
      router.push(`/painel/plano?ativado=${plan}`);
    },
    onSettled: () => setPendingPlan(null),
  });

  function handleSelect(plan: PlanConfig) {
    if (!user) {
      router.push('/cadastro?tipo=PRESTADOR');
      return;
    }
    if (user.role !== 'PRESTADOR') return;
    changePlan.mutate(plan.plan);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <p className="mb-3 text-sm uppercase tracking-[0.15em] text-foreground-muted">Planos para vendedores</p>
      <h1 className="font-display max-w-xl text-4xl leading-tight text-ink sm:text-5xl">
        Mais visibilidade. Mais oportunidades. Mais clientes.
      </h1>
      <p className="mt-4 max-w-xl text-foreground-muted">
        Clientes usam o ServiçAi de graça, sempre. O que você escolhe aqui não é uma lista de funcionalidades —
        é o quanto de espaço você quer ocupar na frente de quem está procurando exatamente o que você faz.
      </p>

      <div className="mt-16 grid border border-border sm:grid-cols-3">
        {plans?.map((plan, i) => {
          const isCurrent = normalizedCurrentPlan === plan.plan;
          const highlighted = !!plan.highlight;
          return (
            <div
              key={plan.plan}
              className={`flex flex-col border-border p-6 ${i > 0 ? 'border-t sm:border-t-0 sm:border-l' : ''} ${
                highlighted ? 'relative bg-surface-muted/40' : ''
              }`}
            >
              {highlighted && <div className="absolute inset-x-0 top-0 h-[3px] bg-accent" />}
              {highlighted && (
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-accent">{plan.highlight}</p>
              )}
              <h2 className="font-display text-lg text-ink">{plan.label}</h2>
              <p className="mt-1 text-sm text-foreground-muted">{plan.tagline}</p>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-3xl text-ink">{formatPrice(plan.priceMonthly)}</span>
                {plan.priceMonthly > 0 && <span className="text-sm text-foreground-muted">/mês</span>}
              </p>

              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {plan.benefits.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={15} className="mt-0.5 shrink-0 text-accent" />
                    <span className="text-foreground-muted">{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan)}
                disabled={isCurrent || (pendingPlan !== null && changePlan.isPending)}
                className={`mt-8 py-2.5 text-sm font-medium transition-opacity disabled:opacity-50 ${
                  highlighted ? 'bg-ink text-background hover:opacity-85' : 'border border-border hover:border-ink'
                }`}
              >
                {isCurrent
                  ? 'Plano atual'
                  : pendingPlan === plan.plan && changePlan.isPending
                    ? 'Ativando...'
                    : user
                      ? 'Selecionar plano'
                      : 'Criar conta de vendedor'}
              </button>
            </div>
          );
        })}
      </div>

      {boostInfo && (
        <div className="mt-6 flex flex-col gap-4 border border-border p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Rocket size={20} className="mt-0.5 shrink-0 text-accent" />
            <div>
              <p className="font-medium text-ink">{boostInfo.label}</p>
              <p className="mt-1 text-sm text-foreground-muted">{boostInfo.description}</p>
              {boostActiveUntil && (
                <p className="mt-1.5 text-sm text-success">
                  Ativo até {boostActiveUntil.toLocaleDateString('pt-BR')} às{' '}
                  {boostActiveUntil.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <span className="font-display text-2xl text-ink">
              R$ {boostInfo.price.toFixed(2).replace('.', ',')}
            </span>
            <button
              onClick={() => {
                if (!user) {
                  router.push('/cadastro?tipo=PRESTADOR');
                  return;
                }
                purchaseBoost.mutate();
              }}
              disabled={user?.role !== 'PRESTADOR' && !!user}
              className="whitespace-nowrap border border-ink bg-ink px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-40"
            >
              {purchaseBoost.isPending
                ? 'Ativando...'
                : boostActiveUntil
                  ? `+${boostInfo.durationDays} dias`
                  : user
                    ? 'Ativar impulso'
                    : 'Criar conta de vendedor'}
            </button>
          </div>
        </div>
      )}

      {user?.role === 'PRESTADOR' && (
        <p className="mt-8 text-xs text-foreground-muted/70">
          Pagamento ainda não integrado — a troca de plano e a compra do impulso são aplicadas diretamente para
          fins de teste. Em produção, isso será acionado pela confirmação de um gateway de pagamento (Pix/cartão).
        </p>
      )}
    </div>
  );
}
