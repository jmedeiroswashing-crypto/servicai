'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Star, Plus, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Proposal, ServiceRequestItem } from '@/lib/types';

function formatMoney(v?: number | null) {
  if (v == null) return null;
  return `R$ ${v.toFixed(2).replace('.', ',')}`;
}

const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  ACEITA: 'Aceita',
  RECUSADA: 'Não selecionada',
};

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
              <button
                onClick={() => acceptMutation.mutate(p.id)}
                disabled={acceptMutation.isPending}
                className="flex items-center gap-1.5 bg-ink px-3.5 py-2 text-xs font-medium text-background hover:opacity-85 disabled:opacity-50"
              >
                <Check size={13} /> Aceitar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MinhasSolicitacoesPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'CLIENTE') router.push('/');
  }, [token, user, router]);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['requests', 'mine'],
    enabled: !!token,
    queryFn: async () => (await api.get<ServiceRequestItem[]>('/requests/mine')).data,
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
        {requests?.map((r) => (
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
                {r.status === 'FECHADA' && (
                  <span className="text-xs font-medium text-success">Contratado</span>
                )}
              </div>
            </button>
            {expanded === r.id && <ProposalsList requestId={r.id} requestOpen={r.status !== 'FECHADA'} />}
          </div>
        ))}
      </div>
    </div>
  );
}
