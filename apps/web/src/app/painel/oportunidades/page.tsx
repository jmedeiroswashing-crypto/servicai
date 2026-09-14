'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { MapPin, Calendar, Clock3, Wallet, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { CATEGORIES } from '@/lib/categories';
import { CategorySelect } from '@/components/CategorySelect';
import { UNLIMITED, type OpportunityMatch, type PerformanceMetrics } from '@/lib/types';

const inputClass = 'border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-ink';

function formatMoney(v?: number | null) {
  if (v == null) return null;
  return `R$ ${v.toFixed(0)}`;
}

function formatBudget(min?: number | null, max?: number | null) {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${formatMoney(min)}–${formatMoney(max)}`;
  return formatMoney(min ?? max);
}

function formatDate(iso?: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  const today = new Date();
  const diffDays = Math.round((date.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86400000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function ProposalForm({ requestId, onDone }: { requestId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [deadline, setDeadline] = useState('');
  const [availableAt, setAvailableAt] = useState('');

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/requests/${requestId}/proposals`, {
          price: Number(price),
          message,
          deadline: deadline || undefined,
          availableAt: availableAt || undefined,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', 'matches'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'performance'] });
      onDone();
    },
  });

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-foreground-muted">Valor da proposta (R$)</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={`${inputClass} w-full`} placeholder="200" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-foreground-muted">Prazo para realizar</label>
          <input value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`${inputClass} w-full`} placeholder="Ex: 2 dias" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-foreground-muted">Data/horário disponível</label>
        <input value={availableAt} onChange={(e) => setAvailableAt(e.target.value)} className={`${inputClass} w-full`} placeholder="Ex: Amanhã de manhã" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-foreground-muted">Mensagem</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className={`${inputClass} w-full`}
          placeholder="Apresente-se e explique como pode ajudar"
        />
      </div>
      {mutation.isError && (
        <p className="text-xs text-danger">
          {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Não foi possível enviar. Tente novamente.'}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate()}
          disabled={!price || message.length < 5 || mutation.isPending}
          className="bg-ink px-4 py-2 text-sm font-medium text-background hover:opacity-85 disabled:opacity-40"
        >
          {mutation.isPending ? 'Enviando...' : 'Enviar proposta'}
        </button>
        <button onClick={onDone} className="px-4 py-2 text-sm text-foreground-muted hover:text-ink">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function OpportunityCard({ opportunity }: { opportunity: OpportunityMatch }) {
  const [interested, setInterested] = useState(false);
  const budget = formatBudget(opportunity.budgetMin, opportunity.budgetMax);
  const date = formatDate(opportunity.desiredDate);

  return (
    <div className="border border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-ink">{opportunity.title}</h3>
        <span className="shrink-0 text-xs text-foreground-muted">{opportunity.proximityLabel}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground-muted">
        <span className="flex items-center gap-1">
          <MapPin size={13} /> {opportunity.city}
          {opportunity.state ? ` - ${opportunity.state}` : ''}
        </span>
        {date && (
          <span className="flex items-center gap-1">
            <Calendar size={13} /> {date}
          </span>
        )}
        {opportunity.desiredTime && (
          <span className="flex items-center gap-1">
            <Clock3 size={13} /> {opportunity.desiredTime}
          </span>
        )}
        {budget && (
          <span className="flex items-center gap-1">
            <Wallet size={13} /> {budget}
          </span>
        )}
        {opportunity.proposalsCount > 0 && (
          <span className="flex items-center gap-1">
            <Users size={13} /> {opportunity.proposalsCount} interessado{opportunity.proposalsCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-foreground-muted">&ldquo;{opportunity.description}&rdquo;</p>
      <p className="mt-2 text-xs text-foreground-muted/70">Publicado {opportunity.publishedAgo}</p>

      {opportunity.alreadyProposed ? (
        <p className="mt-4 text-sm font-medium text-success">Proposta enviada</p>
      ) : interested ? (
        <ProposalForm requestId={opportunity.id} onDone={() => setInterested(false)} />
      ) : (
        <button
          onClick={() => setInterested(true)}
          className="mt-4 border border-ink px-4 py-2 text-sm font-medium text-ink hover:bg-ink hover:text-background"
        >
          Tenho interesse
        </button>
      )}
    </div>
  );
}

export default function OportunidadesPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'PRESTADOR') router.push('/');
  }, [token, user, router]);

  const [category, setCategory] = useState('');
  const [distance, setDistance] = useState<'todas' | 'cidade' | 'estado'>('todas');
  const [sort, setSort] = useState<'recentes' | 'proximos' | 'match'>('match');
  const [budgetMax, setBudgetMax] = useState('');

  const { data: performance } = useQuery({
    queryKey: ['subscriptions', 'performance'],
    enabled: !!token,
    queryFn: async () => (await api.get<PerformanceMetrics>('/subscriptions/me/performance')).data,
  });

  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['requests', 'matches', { category, distance, sort, budgetMax }],
    enabled: !!token,
    queryFn: async () =>
      (
        await api.get<OpportunityMatch[]>('/requests/matches', {
          params: {
            category: category || undefined,
            distance,
            sort,
            budgetMax: budgetMax || undefined,
          },
        })
      ).data,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl text-ink">Oportunidades</h1>
      <p className="mt-2 text-foreground-muted">Clientes procurando por serviços que combinam com o seu perfil.</p>

      {performance && performance.proposalsLimit < UNLIMITED && (
        <div className="mt-6 flex items-center justify-between gap-3 border border-border px-4 py-3 text-sm">
          <span className="text-foreground-muted">
            {performance.proposalsUsed >= performance.proposalsLimit ? (
              <>Você usou suas {performance.proposalsLimit} propostas deste mês e está perdendo oportunidades de novos clientes.</>
            ) : (
              <>
                {performance.proposalsUsed} de {performance.proposalsLimit} propostas usadas este mês.
              </>
            )}
          </span>
          <Link href="/precos" className="shrink-0 font-medium text-accent hover:underline">
            Desbloquear mais
          </Link>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        <CategorySelect
          categories={CATEGORIES}
          value={category}
          onChange={setCategory}
          allowEmpty
          emptyLabel="Todas as categorias"
          className="w-56"
        />
        <select value={distance} onChange={(e) => setDistance(e.target.value as typeof distance)} className={inputClass}>
          <option value="todas">Qualquer distância</option>
          <option value="cidade">Só na minha cidade</option>
          <option value="estado">Só no meu estado</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={inputClass}>
          <option value="match">Melhor correspondência</option>
          <option value="recentes">Mais recentes</option>
          <option value="proximos">Mais próximos</option>
        </select>
        <input
          type="number"
          value={budgetMax}
          onChange={(e) => setBudgetMax(e.target.value)}
          placeholder="Orçamento até (R$)"
          className={`${inputClass} w-44`}
        />
      </div>

      <div className="mt-10 space-y-4">
        {isLoading && <p className="text-foreground-muted">Carregando oportunidades...</p>}
        {opportunities && opportunities.length === 0 && (
          <p className="text-foreground-muted">
            Nenhuma oportunidade compatível com seu perfil agora. Confira se suas categorias de serviço estão
            atualizadas em Editar perfil.
          </p>
        )}
        {opportunities?.map((o) => (
          <OpportunityCard key={o.id} opportunity={o} />
        ))}
      </div>
    </div>
  );
}
