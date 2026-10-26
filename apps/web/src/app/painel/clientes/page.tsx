'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Users, Phone, Wallet, CalendarCheck, MessageCircle, Star, UserX } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { ClientSummary } from '@/lib/types';

const SUMIDO_DAYS = 120;
const FIEL_MIN_SERVICOS = 3;

function formatMoney(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function whatsappLink(phone: string, message: string) {
  return `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

type Tab = 'todos' | 'fieis' | 'sumidos';

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'todos', label: 'Todos', icon: Users },
  { id: 'fieis', label: 'Fiéis', icon: Star },
  { id: 'sumidos', label: 'Sumidos', icon: UserX },
];

function ClientCard({ client, message }: { client: ClientSummary; message?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border border-border p-5">
      <div className="flex items-center gap-3">
        {client.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={client.avatarUrl} alt={client.name} className="h-11 w-11 rounded-full object-cover" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-sm font-medium text-foreground-muted">
            {client.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-medium text-ink">{client.name}</p>
          {client.phone && (
            <p className="flex items-center gap-1 text-sm text-foreground-muted">
              <Phone size={13} /> {client.phone}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="flex items-center justify-end gap-1 text-sm text-foreground-muted">
            <Wallet size={13} /> Total gasto
          </p>
          <p className="font-medium text-ink">{formatMoney(client.totalSpent)}</p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1 text-sm text-foreground-muted">
            <CalendarCheck size={13} /> Serviços
          </p>
          <p className="font-medium text-ink">{client.servicesCount}</p>
        </div>
        {client.phone && message && (
          <a
            href={whatsappLink(client.phone, message)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 border border-border px-3 py-2 text-xs font-medium text-ink hover:border-ink"
          >
            <MessageCircle size={13} /> Chamar
          </a>
        )}
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('todos');

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'PRESTADOR') router.push('/');
  }, [token, user, router]);

  const { data: clients, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['bookings', 'clients'],
    enabled: !!token,
    queryFn: async () => (await api.get<ClientSummary[]>('/bookings/clients')).data,
  });

  if (isError) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-foreground-muted">
          Não foi possível carregar seus clientes{status ? ` (erro ${status})` : ''}. Verifique sua conexão e tente de novo.
        </p>
        <button onClick={() => refetch()} className="mt-4 border border-ink px-4 py-2 text-sm font-medium text-ink hover:bg-ink hover:text-background">
          Tentar novamente
        </button>
      </div>
    );
  }

  const fieis = (clients ?? []).filter((c) => c.servicesCount >= FIEL_MIN_SERVICOS);
  const sumidos = (clients ?? []).filter((c) => daysSince(c.lastServiceAt) >= SUMIDO_DAYS);

  const shown = tab === 'fieis' ? fieis : tab === 'sumidos' ? sumidos : clients ?? [];
  const message =
    tab === 'fieis'
      ? (name: string) => `Olá ${name}! Você é um dos nossos clientes mais fiéis — obrigado pela confiança. Precisando de algo, é só chamar.`
      : tab === 'sumidos'
        ? (name: string) => `Olá ${name}! Faz um tempo que a gente não trabalha junto. Precisando de algo, estou à disposição.`
        : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl text-ink">Clientes</h1>
      <p className="mt-2 text-foreground-muted">
        Histórico de quem já fechou serviço com você — e listas prontas pra manter contato.
      </p>

      <div className="mt-6 flex gap-2 border-b border-border">
        {TABS.map((t) => {
          const count = t.id === 'fieis' ? fieis.length : t.id === 'sumidos' ? sumidos.length : clients?.length ?? 0;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-1 pb-2.5 text-sm transition-colors ${
                tab === t.id ? 'border-ink font-medium text-ink' : 'border-transparent text-foreground-muted hover:text-ink'
              }`}
            >
              <t.icon size={14} /> {t.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="mt-8 space-y-3">
        {isLoading && <p className="text-foreground-muted">Carregando...</p>}
        {!isLoading && shown.length === 0 && (
          <div className="flex flex-col items-center gap-2 border border-dashed border-border py-16 text-center text-foreground-muted">
            <Users size={28} />
            <p>
              {tab === 'fieis' && `Ninguém com ${FIEL_MIN_SERVICOS}+ serviços ainda.`}
              {tab === 'sumidos' && `Ninguém sumido há ${SUMIDO_DAYS}+ dias — boa notícia!`}
              {tab === 'todos' && 'Nenhum cliente ainda. Conclua serviços pela Agenda para eles aparecerem aqui.'}
            </p>
          </div>
        )}
        {shown.map((c) => (
          <ClientCard key={c.clientId} client={c} message={message?.(c.name.split(' ')[0])} />
        ))}
      </div>
    </div>
  );
}
