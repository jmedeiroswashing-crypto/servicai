'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Zap, MapPin, Calendar, Clock3, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { CATEGORIES } from '@/lib/categories';
import { CategorySelect } from '@/components/CategorySelect';
import type { MyDeal } from '@/lib/types';

const inputClass =
  'w-full border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-foreground-muted/50';
const labelClass = 'mb-1.5 block text-xs font-medium text-foreground-muted';

const STATUS_LABEL: Record<MyDeal['status'], string> = {
  ATIVA: 'Aguardando cliente',
  RESERVADA: 'Reservada',
  CANCELADA: 'Cancelada',
};

function CreateDealForm({ onCreated }: { onCreated: () => void }) {
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [dealPrice, setDealPrice] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/deals', {
          category,
          title,
          description: description || undefined,
          originalPrice: Number(originalPrice),
          dealPrice: Number(dealPrice),
          scheduledAt: new Date(`${date}T${time || '09:00'}`).toISOString(),
        })
      ).data,
    onSuccess: () => {
      setCategory('');
      setTitle('');
      setDescription('');
      setOriginalPrice('');
      setDealPrice('');
      setDate('');
      setTime('');
      onCreated();
    },
  });

  const canSubmit =
    category && title.length >= 3 && Number(originalPrice) > 0 && Number(dealPrice) > 0 && Number(dealPrice) <= Number(originalPrice) && date;

  return (
    <div className="border border-border p-5">
      <h2 className="flex items-center gap-1.5 font-medium text-ink">
        <Zap size={15} className="text-accent" /> Publicar vaga de última hora
      </h2>
      <p className="mt-1 text-sm text-foreground-muted">
        Teve um cancelamento? Publique esse horário com preço especial para preencher a agenda rápido.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className={labelClass}>Categoria</label>
          <CategorySelect categories={CATEGORIES} value={category} onChange={setCategory} emptyLabel="Selecione" />
        </div>
        <div>
          <label className={labelClass}>Título da vaga</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Ex: Corte + barba, horário livre hoje à tarde" />
        </div>
        <div>
          <label className={labelClass}>Descrição (opcional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} placeholder="Detalhes do serviço" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Preço original (R$)</label>
            <input type="number" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className={inputClass} placeholder="150" />
          </div>
          <div>
            <label className={labelClass}>Preço da vaga (R$)</label>
            <input type="number" value={dealPrice} onChange={(e) => setDealPrice(e.target.value)} className={inputClass} placeholder="150 (mesmo preço) ou menor" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Horário</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
          </div>
        </div>

        {mutation.isError && (
          <p className="text-xs text-danger">
            {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Não foi possível publicar. Confira os dados.'}
          </p>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          className="w-full bg-ink py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {mutation.isPending ? 'Publicando...' : 'Publicar vaga'}
        </button>
      </div>
    </div>
  );
}

function DealRow({ deal, onCancel, cancelling }: { deal: MyDeal; onCancel: (id: string) => void; cancelling: boolean }) {
  const scheduled = new Date(deal.scheduledAt);

  return (
    <div className="border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-ink">{deal.title}</h3>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground-muted">
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {deal.city}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {scheduled.toLocaleDateString('pt-BR')}
            </span>
            <span className="flex items-center gap-1">
              <Clock3 size={12} /> {scheduled.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-medium text-ink">R$ {deal.dealPrice.toFixed(0)}</p>
          <span
            className={`text-xs ${
              deal.status === 'RESERVADA' ? 'text-success' : deal.status === 'CANCELADA' ? 'text-foreground-muted/60' : 'text-foreground-muted'
            }`}
          >
            {STATUS_LABEL[deal.status]}
          </span>
        </div>
      </div>

      {deal.status === 'RESERVADA' && deal.claimedBy && (
        <p className="mt-3 border-t border-border pt-3 text-sm text-foreground-muted">
          Reservada por <span className="text-ink">{deal.claimedBy.name}</span>
          {deal.claimedBy.phone ? ` · ${deal.claimedBy.phone}` : ''}
        </p>
      )}

      {deal.status === 'ATIVA' && (
        <button
          onClick={() => onCancel(deal.id)}
          disabled={cancelling}
          className="mt-3 flex items-center gap-1 text-xs text-foreground-muted hover:text-danger disabled:opacity-40"
        >
          <X size={12} /> Cancelar vaga
        </button>
      )}
    </div>
  );
}

export default function VagasUltimaHoraPainelPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'PRESTADOR') router.push('/');
  }, [token, user, router]);

  const { data: deals, isLoading } = useQuery({
    queryKey: ['deals', 'mine'],
    enabled: !!token,
    queryFn: async () => (await api.get<MyDeal[]>('/deals/mine')).data,
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/deals/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals', 'mine'] }),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['deals', 'mine'] });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-accent">
        <Zap size={13} /> Área separada
      </p>
      <h1 className="font-display text-3xl text-ink">Vagas de última hora</h1>
      <p className="mt-2 text-foreground-muted">
        Quando um cliente cancela um horário, publique essa vaga aqui com um preço especial para não perder a receita.
      </p>

      <div className="mt-8 grid gap-8 sm:grid-cols-[1fr_1.1fr]">
        <CreateDealForm onCreated={refresh} />

        <div>
          <h2 className="mb-3 text-sm font-medium text-foreground-muted">Minhas vagas</h2>
          <div className="space-y-3">
            {isLoading && <p className="text-sm text-foreground-muted">Carregando...</p>}
            {deals && deals.length === 0 && <p className="text-sm text-foreground-muted">Nenhuma vaga publicada ainda.</p>}
            {deals?.map((deal) => (
              <DealRow
                key={deal.id}
                deal={deal}
                onCancel={(id) => cancelMutation.mutate(id)}
                cancelling={cancelMutation.isPending && cancelMutation.variables === deal.id}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
