'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Clock, MapPin } from 'lucide-react';
import { buildSearchUrl } from '@/components/SearchBar';
import { api } from '@/lib/api';
import { useCityStore } from '@/store/city-store';
import { QUICK_CHIPS } from './HomeHero';

/** Calculado dos pedidos reais da cidade; usa a lista fixa enquanto não há dados. */
export function PopularServices() {
  const city = useCityStore((s) => s.city);
  const { data } = useQuery({
    queryKey: ['categories', 'popular', city],
    queryFn: async () =>
      (await api.get<string[]>('/categories/popular', { params: { city: city ?? undefined } })).data,
  });
  const services = data?.length ? data : QUICK_CHIPS;

  return (
    <section aria-labelledby="buscados-titulo" className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
      <h2 id="buscados-titulo" className="font-display text-title text-ink">
        Serviços mais buscados
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {services.map((service) => (
          <Link
            key={service}
            href={buildSearchUrl(service, city)}
            className="flex min-h-11 items-center rounded-pill border border-border bg-surface px-4 text-sm font-medium text-ink transition-colors duration-150 hover:border-accent"
          >
            {service}
          </Link>
        ))}
      </div>
    </section>
  );
}

interface RecentRequest {
  id: string;
  category: string;
  city: string;
  createdAt: string;
}

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return `há ${Math.max(minutes, 1)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}

/** Dados anonimizados. A API só devolve a lista quando há pelo menos 3 pedidos. */
export function RecentRequests() {
  const city = useCityStore((s) => s.city);
  const { data } = useQuery({
    queryKey: ['categories', 'recent-requests', city],
    queryFn: async () =>
      (await api.get<RecentRequest[]>('/categories/recent-requests', { params: { city: city ?? undefined } })).data,
  });

  if (!data?.length) return null;

  return (
    <section aria-labelledby="pedidos-titulo" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h2 id="pedidos-titulo" className="font-display text-title text-ink">
        Pedidos recentes {city ? `em ${city}` : 'no ServiçAi'}
      </h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((request) => (
          <li key={request.id} className="rounded-card border border-border bg-surface p-4 shadow-soft-sm">
            <p className="font-semibold text-ink">{request.category}</p>
            <p className="mt-1 flex items-center gap-3 text-sm text-foreground-muted">
              <span className="flex items-center gap-1">
                <MapPin size={13} aria-hidden="true" /> {request.city}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={13} aria-hidden="true" /> {timeAgo(request.createdAt)}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
