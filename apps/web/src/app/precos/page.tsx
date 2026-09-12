'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { PlanConfig, Subscription } from '@/lib/types';

const PLAN_HIGHLIGHT: Record<string, boolean> = { PRO: true };

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

  const changePlan = useMutation({
    mutationFn: async (plan: string) => (await api.patch('/subscriptions/me', { plan })).data,
    onMutate: (plan) => setPendingPlan(plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'me'] });
      router.push('/painel');
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
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">
          <Sparkles size={14} /> Planos para vendedores
        </span>
        <h1 className="text-3xl font-bold sm:text-4xl">Escolha o plano certo para o seu negócio</h1>
        <p className="mt-3 text-foreground/60">
          Clientes usam o ServiçAi de graça, sempre. Vendedores crescem com o plano que fizer sentido para o
          volume de trabalho de hoje — e mudam quando quiserem.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans?.map((plan, i) => {
          const isCurrent = mySubscription?.plan === plan.plan;
          const highlighted = PLAN_HIGHLIGHT[plan.plan];
          return (
            <motion.div
              key={plan.plan}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={`flex flex-col rounded-3xl border p-6 ${
                highlighted ? 'border-brand bg-surface shadow-lg ring-2 ring-brand/20' : 'border-border bg-surface'
              }`}
            >
              {highlighted && (
                <span className="mb-3 w-fit rounded-full gradient-brand px-3 py-1 text-xs font-semibold text-white">
                  Mais popular
                </span>
              )}
              <h2 className="text-lg font-semibold">{plan.label}</h2>
              <p className="mt-2 text-3xl font-bold">
                {formatPrice(plan.priceMonthly)}
                {plan.priceMonthly > 0 && <span className="text-sm font-normal text-foreground/50">/mês</span>}
              </p>

              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={16} className="mt-0.5 shrink-0 text-brand" />
                    <span className="text-foreground/70">{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan)}
                disabled={isCurrent || (pendingPlan !== null && changePlan.isPending)}
                className={`mt-6 rounded-full py-2.5 text-sm font-semibold transition-transform disabled:opacity-60 ${
                  highlighted ? 'gradient-brand text-white hover:scale-[1.02]' : 'border border-border hover:bg-surface-muted'
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
            </motion.div>
          );
        })}
      </div>

      {user?.role === 'PRESTADOR' && (
        <p className="mt-8 text-center text-xs text-foreground/40">
          Pagamento ainda não integrado — a troca de plano é aplicada diretamente para fins de teste.
          Em produção, isso será acionado pela confirmação de um gateway de pagamento (Pix/cartão).
        </p>
      )}
    </div>
  );
}
