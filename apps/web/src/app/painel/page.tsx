'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Star, Briefcase, Users, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Booking, ProviderProfile } from '@/lib/types';

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

  const { data: bookings } = useQuery({
    queryKey: ['bookings', 'provider'],
    enabled: !!token,
    queryFn: async () => (await api.get<Booking[]>('/bookings/provider')).data,
  });

  if (!provider) {
    return <div className="mx-auto max-w-5xl px-4 py-20 text-center text-foreground/50">Carregando painel...</div>;
  }

  const stats = [
    { icon: Star, label: 'Nota média', value: provider.ratingAvg.toFixed(1) },
    { icon: TrendingUp, label: 'Score IA', value: Math.round(provider.scoreIA) },
    { icon: Briefcase, label: 'Serviços realizados', value: provider.servicesDone },
    { icon: Users, label: 'Clientes', value: provider.clientsCount },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold">Painel do prestador</h1>
      <p className="mb-8 text-foreground/60">Acompanhe seus resultados e solicitações de serviço.</p>

      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <s.icon size={18} className="mb-2 text-brand" />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-foreground/50">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <h2 className="mb-4 text-lg font-semibold">Solicitações recentes</h2>
      <div className="space-y-3">
        {bookings && bookings.length === 0 && (
          <p className="text-foreground/50">Nenhuma solicitação ainda.</p>
        )}
        {bookings?.map((b) => (
          <div
            key={b.id}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">{b.client?.name ?? 'Cliente'}</p>
              {b.service && <p className="text-sm text-foreground/60">{b.service.title}</p>}
            </div>
            <span className="w-fit rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              {STATUS_LABEL[b.status] ?? b.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
