'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Sparkles, Crown, CalendarDays, Wallet, Radio } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { UNLIMITED, type Booking, type Earnings, type ProviderProfile, type Subscription } from '@/lib/types';

function AvailabilityToggle({ provider }: { provider: ProviderProfile }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (available: boolean) => (await api.patch('/providers/me/availability', { available })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers', 'me'] }),
  });

  const isOn = provider.availableNow;

  return (
    <div
      className={`mb-8 flex items-center justify-between border p-5 transition-colors ${
        isOn ? 'border-success bg-success/5' : 'border-border'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          {isOn && <span className="absolute inline-flex h-full w-full animate-ping bg-success/60" />}
          <span className={`relative inline-flex h-3 w-3 ${isOn ? 'bg-success' : 'bg-foreground-muted/40'}`} />
        </span>
        <div>
          <p className="flex items-center gap-1.5 font-medium text-ink">
            <Radio size={15} className={isOn ? 'text-success' : 'text-foreground-muted'} />
            {isOn ? 'Você está disponível agora' : 'Disponível agora'}
          </p>
          <p className="text-sm text-foreground-muted">
            {isOn ? 'Clientes buscando urgência veem você em destaque. Desativa sozinho em 4h.' : 'Avise que pode atender um serviço hoje'}
          </p>
        </div>
      </div>
      <button
        onClick={() => mutation.mutate(!isOn)}
        disabled={mutation.isPending}
        className={`shrink-0 border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
          isOn ? 'border-border text-foreground-muted hover:border-danger hover:text-danger' : 'border-ink bg-ink text-background hover:opacity-85'
        }`}
      >
        {isOn ? 'Desativar' : 'Ativar'}
      </button>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  SOLICITADO: 'Solicitado',
  ACEITO: 'Aceito',
  RECUSADO: 'Recusado',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

export default function PainelPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'PRESTADOR') router.push('/');
  }, [token, user, router]);

  const { data: provider } = useQuery({
    queryKey: ['providers', 'me'],
    enabled: !!token,
    queryFn: async () => (await api.get<ProviderProfile>('/providers/me')).data,
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscriptions', 'me'],
    enabled: !!token,
    queryFn: async () => (await api.get<Subscription>('/subscriptions/me')).data,
  });

  const { data: bookings } = useQuery({
    queryKey: ['bookings', 'provider'],
    enabled: !!token,
    queryFn: async () => (await api.get<Booking[]>('/bookings/provider')).data,
  });

  const { data: earnings } = useQuery({
    queryKey: ['bookings', 'earnings'],
    enabled: !!token,
    queryFn: async () => (await api.get<Earnings>('/bookings/earnings')).data,
  });

  if (!provider) {
    return <div className="mx-auto max-w-5xl px-4 py-20 text-foreground-muted">Carregando painel...</div>;
  }

  const stats = [
    { label: 'Nota média', value: provider.ratingAvg.toFixed(1) },
    { label: 'Score', value: Math.round(provider.scoreIA) },
    { label: 'Serviços realizados', value: provider.servicesDone },
    { label: 'Clientes', value: provider.clientsCount },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl text-ink">Painel do vendedor</h1>
      <p className="mt-2 text-foreground-muted">Acompanhe seus resultados e solicitações de serviço.</p>

      <div className="mt-8">
        <AvailabilityToggle provider={provider} />
      </div>

      <Link
        href="/painel/agenda"
        className="mt-8 flex items-center justify-between border border-ink bg-ink p-5 text-background transition-opacity hover:opacity-90"
      >
        <div className="flex items-center gap-3">
          <CalendarDays size={18} />
          <div>
            <p className="font-medium">Agenda</p>
            <p className="text-sm text-background/70">
              {bookings ? `${bookings.filter((b) => ['SOLICITADO', 'ACEITO', 'EM_ANDAMENTO'].includes(b.status)).length} compromisso(s) ativo(s)` : 'Reservas, vagas e propostas aceitas'}
            </p>
          </div>
        </div>
        <ArrowRight size={16} />
      </Link>

      <Link
        href="/painel/faturamento"
        className="mt-4 flex items-center justify-between border border-border p-5 transition-colors hover:border-ink"
      >
        <div className="flex items-center gap-3">
          <Wallet size={18} className="text-accent" />
          <div>
            <p className="font-medium text-ink">Faturamento</p>
            <p className="text-sm text-foreground-muted">
              {earnings ? `R$ ${earnings.currentMonthTotal.toFixed(2).replace('.', ',')} este mês` : 'Acompanhe seus ganhos'}
            </p>
          </div>
        </div>
        <ArrowRight size={16} className="text-foreground-muted" />
      </Link>

      <Link
        href="/painel/oportunidades"
        className="mt-4 flex items-center justify-between border border-border p-5 transition-colors hover:border-ink"
      >
        <div className="flex items-center gap-3">
          <Sparkles size={18} className="text-accent" />
          <div>
            <p className="font-medium text-ink">Oportunidades</p>
            <p className="text-sm text-foreground-muted">Veja clientes procurando pelos serviços que você oferece</p>
          </div>
        </div>
        <ArrowRight size={16} className="text-foreground-muted" />
      </Link>

      <Link
        href="/painel/prospeccao"
        className="mt-4 flex items-center justify-between border border-border p-5 transition-colors hover:border-ink"
      >
        <div className="flex items-center gap-3">
          <Crown size={18} className="text-accent" />
          <div>
            <p className="flex items-center gap-2 font-medium text-ink">
              Prospecção de possíveis clientes
              {!subscription?.config.hasAdvancedInsights && (
                <span className="border border-accent px-1.5 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-accent">
                  Premium
                </span>
              )}
            </p>
            <p className="text-sm text-foreground-muted">Veja quem favoritou seu perfil, com nome e telefone</p>
          </div>
        </div>
        <ArrowRight size={16} className="text-foreground-muted" />
      </Link>

      {subscription && (
        <Link
          href="/painel/plano"
          className="mt-8 flex flex-col gap-2 border border-border p-5 transition-colors hover:border-ink sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-medium text-ink">Plano {subscription.config.label}</p>
            <p className="mt-0.5 text-sm text-foreground-muted">
              {subscription.config.proposalsPerMonth >= UNLIMITED
                ? 'Propostas de oportunidade ilimitadas'
                : `Até ${subscription.config.proposalsPerMonth} propostas de oportunidade por mês`}
            </p>
          </div>
          <span className="flex items-center gap-1 text-sm text-ink">
            Ver meu plano <ArrowRight size={14} />
          </span>
        </Link>
      )}

      <div className="mt-10 grid grid-cols-2 border border-border sm:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`p-5 ${i > 0 ? 'border-l border-border' : ''}`}>
            <p className="font-display text-2xl text-ink">{s.value}</p>
            <p className="mt-1 text-xs text-foreground-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl text-ink">Solicitações recentes</h2>
        <Link href="/painel/agenda" className="flex items-center gap-1 text-sm text-accent hover:underline">
          Ver agenda completa <ArrowRight size={13} />
        </Link>
      </div>
      <div className="divide-y divide-border border-t border-border">
        {bookings && bookings.length === 0 && <p className="py-6 text-foreground-muted">Nenhuma solicitação ainda.</p>}
        {bookings?.slice(0, 5).map((b) => (
          <div key={b.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-ink">{b.client?.name ?? 'Cliente'}</p>
              {b.service && <p className="text-sm text-foreground-muted">{b.service.title}</p>}
            </div>
            <span className="w-fit border border-border px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-foreground-muted">
              {STATUS_LABEL[b.status] ?? b.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
