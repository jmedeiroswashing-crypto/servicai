'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Crown, Phone, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

interface ProspectItem {
  name: string;
  phone: string;
  favoritedAt: string;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days < 1) return 'hoje';
  if (days === 1) return 'há 1 dia';
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
}

export default function ProspeccaoPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'PRESTADOR') router.push('/');
  }, [token, user, router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['subscriptions', 'prospecting'],
    enabled: !!token,
    retry: false,
    queryFn: async () => (await api.get<ProspectItem[]>('/subscriptions/me/prospecting')).data,
  });

  const locked = (error as { response?: { status?: number } })?.response?.status === 403;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-accent">
        <Crown size={13} /> Recurso Premium
      </p>
      <h1 className="font-display text-3xl text-ink">Prospecção de possíveis clientes</h1>
      <p className="mt-2 text-foreground-muted">
        Clientes que favoritaram seu perfil — um sinal real de interesse. Nome e telefone para você entrar em contato.
      </p>

      {isLoading && <p className="mt-10 text-foreground-muted">Carregando...</p>}

      {locked && (
        <div className="mt-10 border border-border p-8 text-center">
          <Crown size={28} className="mx-auto text-accent" />
          <p className="mt-3 font-medium text-ink">Exclusivo do plano Premium</p>
          <p className="mt-1 text-sm text-foreground-muted">
            Assine o Premium para ver a lista de clientes que demonstraram interesse no seu perfil.
          </p>
          <Link
            href="/precos"
            className="mt-5 inline-block bg-ink px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85"
          >
            Ver planos
          </Link>
        </div>
      )}

      {data && (
        <div className="mt-10 divide-y divide-border border-t border-border">
          {data.length === 0 && (
            <p className="flex items-center gap-2 py-8 text-foreground-muted">
              <Users size={16} /> Ninguém favoritou seu perfil ainda.
            </p>
          )}
          {data.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium text-ink">{p.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-foreground-muted">
                  <Phone size={13} /> {p.phone}
                </p>
              </div>
              <span className="shrink-0 text-xs text-foreground-muted/70">Favoritou {timeAgo(p.favoritedAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
