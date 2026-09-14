'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Calendar, Clock3, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { CATEGORIES } from '@/lib/categories';
import { CategorySelect } from '@/components/CategorySelect';
import type { LastMinuteDeal } from '@/lib/types';

const inputClass = 'border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-ink';

function formatDateTime(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const diffDays = Math.round((new Date(date).setHours(0, 0, 0, 0) - new Date(today).setHours(0, 0, 0, 0)) / 86400000);
  const dayLabel = diffDays === 0 ? 'Hoje' : diffDays === 1 ? 'Amanhã' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const timeLabel = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return { dayLabel, timeLabel };
}

function DealCard({ deal, canClaim, onClaim, claimingId }: { deal: LastMinuteDeal; canClaim: boolean; onClaim: (id: string) => void; claimingId?: string }) {
  const { dayLabel, timeLabel } = formatDateTime(deal.scheduledAt);

  return (
    <div className="border border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="mb-1 inline-flex items-center gap-1 bg-accent/10 px-2 py-0.5 text-[0.7rem] font-medium text-accent">
            <Zap size={11} /> {deal.discountPct > 0 ? `${deal.discountPct}% OFF` : 'Preço especial'}
          </span>
          <h3 className="font-medium text-ink">{deal.title}</h3>
          <p className="text-sm text-foreground-muted">{deal.provider.name} · {deal.provider.specialty}</p>
        </div>
        <div className="shrink-0 text-right">
          {deal.dealPrice < deal.originalPrice && (
            <p className="text-xs text-foreground-muted/60 line-through">R$ {deal.originalPrice.toFixed(0)}</p>
          )}
          <p className="font-display text-xl text-ink">R$ {deal.dealPrice.toFixed(0)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground-muted">
        <span className="flex items-center gap-1">
          <MapPin size={13} /> {deal.city}
          {deal.state ? ` - ${deal.state}` : ''}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={13} /> {dayLabel}
        </span>
        <span className="flex items-center gap-1">
          <Clock3 size={13} /> {timeLabel}
        </span>
      </div>

      {deal.description && <p className="mt-3 text-sm text-foreground-muted">&ldquo;{deal.description}&rdquo;</p>}

      <button
        onClick={() => onClaim(deal.id)}
        disabled={!canClaim || claimingId === deal.id}
        className="mt-4 border border-ink px-4 py-2 text-sm font-medium text-ink hover:bg-ink hover:text-background disabled:opacity-40"
      >
        {claimingId === deal.id ? 'Reservando...' : 'Pegar essa vaga'}
      </button>
    </div>
  );
}

export default function VagasUltimaHoraPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [claimError, setClaimError] = useState('');

  const { data: deals, isLoading } = useQuery({
    queryKey: ['deals', { category, city }],
    queryFn: async () =>
      (
        await api.get<LastMinuteDeal[]>('/deals', {
          params: { category: category || undefined, city: city || undefined },
        })
      ).data,
  });

  const claimMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/deals/${id}/claim`)).data,
    onSuccess: () => {
      setClaimError('');
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
    onError: (err) => {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setClaimError(message ?? 'Não foi possível reservar essa vaga. Tente novamente.');
    },
  });

  function handleClaim(id: string) {
    if (!token) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'CLIENTE') return;
    claimMutation.mutate(id);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-accent">
        <Zap size={13} /> Área separada
      </p>
      <h1 className="font-display text-3xl text-ink">Vagas de última hora</h1>
      <p className="mt-2 text-foreground-muted">
        Horários que abriram na agenda de profissionais por causa de cancelamentos, com preço especial para quem
        pegar rápido.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <CategorySelect
          categories={CATEGORIES}
          value={category}
          onChange={setCategory}
          allowEmpty
          emptyLabel="Todas as categorias"
          className="w-56"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Filtrar por cidade"
          className={`${inputClass} w-52`}
        />
      </div>

      {claimError && <p className="mt-4 text-sm text-danger">{claimError}</p>}

      <div className="mt-10 space-y-4">
        {isLoading && <p className="text-foreground-muted">Carregando vagas...</p>}
        {deals && deals.length === 0 && (
          <p className="text-foreground-muted">Nenhuma vaga de última hora disponível agora. Volte mais tarde.</p>
        )}
        {deals?.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            canClaim={!token || user?.role === 'CLIENTE'}
            onClaim={handleClaim}
            claimingId={claimMutation.isPending ? claimMutation.variables : undefined}
          />
        ))}
      </div>
    </div>
  );
}
