'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BellRing, ClipboardList, Target, Wallet, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { UNLIMITED, type PlanConfig } from '@/lib/types';

const FEATURES = [
  { icon: BellRing, title: 'Agenda com lembretes', text: 'Compromissos com aviso antes do horário.' },
  { icon: Wallet, title: 'Entradas e saídas', text: 'Receitas, despesas e caixa do dia em um só lugar.' },
  { icon: Target, title: 'Metas', text: 'Defina a meta do mês e acompanhe o progresso.' },
  { icon: Zap, title: 'Finanças automáticas', text: 'Despesas recorrentes lançadas todo mês e leitura de recibos por foto.' },
  { icon: ClipboardList, title: 'Ordens de serviço', text: 'Reservas organizadas e controle de aparelhos para assistências técnicas.' },
];

/** Desenho da tela do painel com valores de exemplo, identificado como tal. */
function PanelMockup() {
  return (
    <figure className="rounded-card border border-white/15 bg-surface p-4 text-foreground shadow-soft-lg">
      <figcaption className="mb-3 text-xs font-medium text-foreground-muted">Exemplo ilustrativo do painel</figcaption>
      <div aria-hidden="true">
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Entradas', 'R$ 4.800', 'text-success'],
            ['Saídas', 'R$ 1.350', 'text-danger'],
            ['Lucro', 'R$ 3.450', 'text-ink'],
          ].map(([label, value, color]) => (
            <div key={label} className="min-w-0 rounded-lg bg-surface-muted p-2.5">
              <p className="text-xs text-foreground-muted">{label}</p>
              <p className={`truncate text-sm font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg bg-surface-muted p-3">
          <div className="flex justify-between text-xs text-foreground-muted">
            <span>Meta do mês</span>
            <span>69%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-pill bg-border">
            <div className="h-full w-[69%] rounded-pill bg-accent" />
          </div>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {[
            ['09:00', 'Instalação de tomadas'],
            ['14:30', 'Visita para orçamento'],
          ].map(([time, title]) => (
            <li key={time} className="flex items-center gap-3 rounded-lg bg-surface-muted p-2.5">
              <span className="font-semibold text-accent-strong">{time}</span>
              <span className="truncate text-ink">{title}</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

function formatLimit(value: number) {
  return value >= UNLIMITED ? 'Ilimitado' : String(value);
}

const PLAN_ROWS: { label: string; value: (plan: PlanConfig) => string }[] = [
  { label: 'Preço por mês', value: (p) => (p.priceMonthly === 0 ? 'R$ 0' : `R$ ${p.priceMonthly.toFixed(2).replace('.', ',')}`) },
  { label: 'Propostas por mês', value: (p) => formatLimit(p.proposalsPerMonth) },
  { label: 'Anúncios de serviço', value: (p) => formatLimit(p.maxListings) },
  { label: 'Fotos e vídeos', value: (p) => formatLimit(p.maxMedia) },
  { label: 'Textos gerados por IA por mês', value: (p) => formatLimit(p.aiGenerationsPerMonth) },
  { label: 'Estatísticas do perfil', value: (p) => (p.hasPerformanceStats ? 'Sim' : 'Não') },
  { label: 'Análises avançadas', value: (p) => (p.hasAdvancedInsights ? 'Sim' : 'Não') },
];

function PlanComparison() {
  const { data } = useQuery({
    queryKey: ['subscriptions', 'plans'],
    queryFn: async () => (await api.get<PlanConfig[]>('/subscriptions/plans')).data,
  });
  const free = data?.find((p) => p.plan === 'GRATIS');
  const premium = data?.find((p) => p.plan === 'PREMIUM');
  if (!free || !premium) return null;

  return (
    <div className="mt-10 overflow-hidden rounded-card bg-surface text-foreground">
      <table className="w-full table-fixed text-left text-sm">
        <caption className="sr-only">Comparação entre os planos Grátis e Premium</caption>
        <thead className="bg-surface-muted">
          <tr>
            <th scope="col" className="p-3 font-semibold text-ink md:px-5">Recurso</th>
            <th scope="col" className="w-24 p-3 font-semibold text-ink md:w-40 md:px-5">{free.label}</th>
            <th scope="col" className="w-24 p-3 font-semibold text-ink md:w-40 md:px-5">{premium.label}</th>
          </tr>
        </thead>
        <tbody>
          {PLAN_ROWS.map((row) => (
            <tr key={row.label} className="border-t border-border">
              <th scope="row" className="p-3 font-normal text-foreground-muted md:px-5">{row.label}</th>
              <td className="p-3 text-ink md:px-5">{row.value(free)}</td>
              <td className="p-3 font-medium text-ink md:px-5">{row.value(premium)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ForProviders() {
  return (
    <section aria-labelledby="prestadores-titulo" className="bg-brand-dark text-on-brand-dark">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#8cbcff]">Para prestadores</p>
            <h2 id="prestadores-titulo" className="mt-2 text-title font-bold tracking-tight">
              Mais do que clientes: seu negócio organizado
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="flex gap-3">
                  <feature.icon size={20} className="mt-0.5 shrink-0 text-[#8cbcff]" aria-hidden="true" />
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-sm text-on-brand-dark/75">{feature.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href="/comecar?tipo=empresario"
              className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-lg bg-cta px-5 text-sm font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-strong"
            >
              Cadastre-se grátis <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <PanelMockup />
        </div>
        <PlanComparison />
      </div>
    </section>
  );
}
