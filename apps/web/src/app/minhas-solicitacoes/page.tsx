'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Star, Plus, Check, X, Pencil, Ban } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { CATEGORIES } from '@/lib/categories';
import { CategorySelect } from '@/components/CategorySelect';
import { ESTADOS_BR } from '@/lib/estados-brasil';
import { useCidadesPorEstado } from '@/lib/use-cidades';
import type { Proposal, ServiceRequestItem } from '@/lib/types';

function formatMoney(v?: number | null) {
  if (v == null) return null;
  return `R$ ${v.toFixed(2).replace('.', ',')}`;
}

const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  ACEITA: 'Aceita',
  RECUSADA: 'Não selecionada',
};

const inputClass =
  'w-full border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-foreground-muted/50';
const labelClass = 'mb-1.5 block text-xs font-medium text-foreground-muted';

function ProposalsList({ requestId, requestOpen }: { requestId: string; requestOpen: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: proposals } = useQuery({
    queryKey: ['requests', requestId, 'proposals'],
    queryFn: async () => (await api.get<Proposal[]>(`/requests/${requestId}/proposals`)).data,
  });

  const chatMutation = useMutation({
    mutationFn: async (providerId: string) => (await api.post('/chat/conversations', { providerId })).data,
    onSuccess: (conversation) => router.push(`/mensagens?c=${conversation.id}`),
  });

  const acceptMutation = useMutation({
    mutationFn: async (proposalId: string) => (await api.post(`/requests/${requestId}/proposals/${proposalId}/accept`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', requestId, 'proposals'] });
      queryClient.invalidateQueries({ queryKey: ['requests', 'mine'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (proposalId: string) => (await api.post(`/requests/${requestId}/proposals/${proposalId}/reject`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests', requestId, 'proposals'] }),
  });

  if (!proposals || proposals.length === 0) {
    return <p className="px-1 py-4 text-sm text-foreground-muted">Nenhuma proposta recebida ainda.</p>;
  }

  return (
    <div className="divide-y divide-border border-t border-border">
      {proposals.map((p) => (
        <div key={p.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-ink">{p.provider?.user.name}</span>
              {p.provider && (
                <span className="flex items-center gap-1 text-xs text-foreground-muted">
                  <Star size={11} className="fill-accent text-accent" /> {p.provider.ratingAvg.toFixed(1)}
                </span>
              )}
              {p.status !== 'ENVIADA' && (
                <span className={`text-xs font-medium ${p.status === 'ACEITA' ? 'text-success' : 'text-foreground-muted'}`}>
                  {PROPOSAL_STATUS_LABEL[p.status]}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-foreground-muted">{p.message}</p>
            <p className="mt-1 text-xs text-foreground-muted">
              {formatMoney(p.price)}
              {p.deadline ? ` · Prazo: ${p.deadline}` : ''}
              {p.availableAt ? ` · Disponível: ${p.availableAt}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => p.provider && chatMutation.mutate(p.provider.id)}
              className="flex items-center gap-1.5 border border-border px-3.5 py-2 text-xs font-medium hover:border-ink"
            >
              <MessageCircle size={13} /> Conversar
            </button>
            {requestOpen && p.status === 'ENVIADA' && (
              <>
                <button
                  onClick={() => rejectMutation.mutate(p.id)}
                  disabled={rejectMutation.isPending}
                  className="flex items-center gap-1.5 border border-border px-3.5 py-2 text-xs font-medium text-foreground-muted hover:border-danger hover:text-danger disabled:opacity-50"
                >
                  <X size={13} /> Recusar
                </button>
                <button
                  onClick={() => acceptMutation.mutate(p.id)}
                  disabled={acceptMutation.isPending}
                  className="flex items-center gap-1.5 bg-ink px-3.5 py-2 text-xs font-medium text-background hover:opacity-85 disabled:opacity-50"
                >
                  <Check size={13} /> Aceitar
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EditRequestForm({ request, onDone }: { request: ServiceRequestItem; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState(request.category);
  const [title, setTitle] = useState(request.title);
  const [description, setDescription] = useState(request.description);
  const [state, setState] = useState(request.state ?? '');
  const [city, setCity] = useState(request.city);
  const [budgetMin, setBudgetMin] = useState(request.budgetMin?.toString() ?? '');
  const [budgetMax, setBudgetMax] = useState(request.budgetMax?.toString() ?? '');

  const { data: cidades, isFetching: loadingCidades } = useCidadesPorEstado(state);

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.patch(`/requests/${request.id}`, {
          category,
          title,
          description,
          city,
          state: state || undefined,
          budgetMin: budgetMin ? Number(budgetMin) : undefined,
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', 'mine'] });
      onDone();
    },
  });

  const canSubmit = category && title.length >= 3 && description.length >= 10 && city;

  return (
    <div className="space-y-4 border-t border-border py-5">
      <div>
        <label className={labelClass}>Categoria</label>
        <CategorySelect categories={CATEGORIES} value={category} onChange={setCategory} emptyLabel="Selecione" />
      </div>
      <div>
        <label className={labelClass}>Título</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Descrição</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Estado</label>
          <select
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setCity('');
            }}
            className={inputClass}
          >
            <option value="">UF</option>
            {ESTADOS_BR.map((e) => (
              <option key={e.uf} value={e.uf}>
                {e.nome} ({e.uf})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Cidade</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={!state || loadingCidades}
            className={`${inputClass} disabled:opacity-50`}
          >
            <option value={city}>{city || 'Selecione'}</option>
            {cidades
              ?.filter((c) => c !== city)
              .map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Orçamento mínimo</label>
          <input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Orçamento máximo</label>
          <input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          className="bg-ink px-4 py-2 text-sm font-medium text-background hover:opacity-85 disabled:opacity-40"
        >
          {mutation.isPending ? 'Salvando...' : 'Salvar alterações'}
        </button>
        <button onClick={onDone} className="px-4 py-2 text-sm text-foreground-muted hover:text-ink">
          Cancelar edição
        </button>
      </div>
    </div>
  );
}

export default function MinhasSolicitacoesPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'CLIENTE') router.push('/');
  }, [token, user, router]);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['requests', 'mine'],
    enabled: !!token,
    queryFn: async () => (await api.get<ServiceRequestItem[]>('/requests/mine')).data,
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/requests/${id}/cancel`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests', 'mine'] }),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink">Minhas solicitações</h1>
        <Link
          href="/solicitar"
          className="flex items-center gap-1.5 bg-ink px-4 py-2 text-sm font-medium text-background hover:opacity-85"
        >
          <Plus size={15} /> Nova
        </Link>
      </div>

      {isLoading && <p className="mt-8 text-foreground-muted">Carregando...</p>}
      {requests && requests.length === 0 && (
        <p className="mt-8 text-foreground-muted">
          Você ainda não publicou nenhuma solicitação.{' '}
          <Link href="/solicitar" className="text-accent hover:underline">
            Publicar agora
          </Link>
        </p>
      )}

      <div className="mt-10 divide-y divide-border border-t border-border">
        {requests?.map((r) => {
          const isOpen = (r.status ?? 'ABERTA') === 'ABERTA';
          return (
            <div key={r.id} className="py-5">
              <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="flex w-full items-start justify-between text-left">
                <div>
                  <p className="font-medium text-ink">{r.title}</p>
                  <p className="mt-1 text-sm text-foreground-muted">
                    {r.category} · {r.city}
                    {r.state ? ` - ${r.state}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="border border-border px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-foreground-muted">
                    {r.proposalsCount} proposta{r.proposalsCount === 1 ? '' : 's'}
                  </span>
                  {r.status === 'FECHADA' && <span className="text-xs font-medium text-success">Contratado</span>}
                  {r.status === 'CANCELADA' && <span className="text-xs font-medium text-foreground-muted">Cancelada</span>}
                </div>
              </button>

              {isOpen && expanded === r.id && editingId !== r.id && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setEditingId(r.id)}
                    className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-medium hover:border-ink"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                  <button
                    onClick={() => cancelMutation.mutate(r.id)}
                    disabled={cancelMutation.isPending}
                    className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-medium text-danger hover:border-danger disabled:opacity-50"
                  >
                    <Ban size={12} /> Cancelar solicitação
                  </button>
                </div>
              )}

              {expanded === r.id && editingId === r.id && (
                <EditRequestForm request={r} onDone={() => setEditingId(null)} />
              )}

              {expanded === r.id && editingId !== r.id && <ProposalsList requestId={r.id} requestOpen={isOpen} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
