'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Users, Phone, Wallet, CalendarCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { ClientSummary } from '@/lib/types';

function formatMoney(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ClientCard({ client }: { client: ClientSummary }) {
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
      <div className="flex gap-6 text-right">
        <div>
          <p className="flex items-center justify-end gap-1 text-sm text-foreground-muted">
            <Wallet size={13} /> Total gasto
          </p>
          <p className="font-medium text-ink">{formatMoney(client.totalSpent)}</p>
        </div>
        <div>
          <p className="flex items-center justify-end gap-1 text-sm text-foreground-muted">
            <CalendarCheck size={13} /> Serviços
          </p>
          <p className="font-medium text-ink">{client.servicesCount}</p>
        </div>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'PRESTADOR') router.push('/');
  }, [token, user, router]);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['bookings', 'clients'],
    enabled: !!token,
    queryFn: async () => (await api.get<ClientSummary[]>('/bookings/clients')).data,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl text-ink">Clientes</h1>
      <p className="mt-2 text-foreground-muted">
        Histórico de quem já fechou serviço com você — ordenado pelos que mais gastaram.
      </p>

      <div className="mt-8 space-y-3">
        {isLoading && <p className="text-foreground-muted">Carregando...</p>}
        {!isLoading && clients?.length === 0 && (
          <div className="flex flex-col items-center gap-2 border border-dashed border-border py-16 text-center text-foreground-muted">
            <Users size={28} />
            <p>Nenhum cliente ainda. Conclua serviços pela aba Reservas para eles aparecerem aqui.</p>
          </div>
        )}
        {clients?.map((c) => <ClientCard key={c.clientId} client={c} />)}
      </div>
    </div>
  );
}
