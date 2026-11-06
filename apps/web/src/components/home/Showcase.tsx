'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, MapPin, RotateCw } from 'lucide-react';
import { ProviderCard, ProviderGridSkeleton } from '@/components/ProviderCard';
import { api } from '@/lib/api';
import { extractErrorMessage } from '@/lib/error-message';
import type { ProviderProfile } from '@/lib/types';
import { useCityStore } from '@/store/city-store';

const MIN_REVIEWS_FOR_RATING_TITLE = 3;

/** Mensagem para quando ainda não há profissionais públicos na região. */
export function ComingSoon({ city }: { city: string | null }) {
  const inviteText = encodeURIComponent(
    `Conhece um bom profissional${city ? ` em ${city}` : ''}? Ele pode se cadastrar no ServiçAi: https://servicai.vercel.app/comecar?tipo=empresario`,
  );
  return (
    <div className="rounded-card border border-border bg-surface-muted p-6 text-center md:p-10">
      <MapPin size={28} className="mx-auto text-accent" aria-hidden="true" />
      <h3 className="mt-3 text-lg font-semibold text-ink">
        {city ? `Ainda estamos chegando em ${city}` : 'Ainda estamos chegando na sua região'}
      </h3>
      <p className="mt-1 text-sm text-foreground-muted">Publique seu pedido para os profissionais da região poderem enviar propostas.</p>
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/solicitar"
          className="flex min-h-11 items-center justify-center rounded-lg bg-cta px-5 text-sm font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-strong"
        >
          Publicar pedido mesmo assim
        </Link>
        <a
          href={`https://wa.me/?text=${inviteText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-ink transition-colors duration-150 hover:border-accent"
        >
          Indique um profissional
        </a>
      </div>
    </div>
  );
}

export function Showcase() {
  const city = useCityStore((s) => s.city);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['providers', 'showcase', city],
    queryFn: async () =>
      (await api.get<ProviderProfile[]>('/providers/showcase', { params: { city: city ?? undefined, take: 8 } })).data,
  });

  const allWellRated =
    !!data && data.length > 0 && data.every((p) => (p.reviewCount ?? 0) >= MIN_REVIEWS_FOR_RATING_TITLE);
  const place = city ? `em ${city}` : 'no ServiçAi';
  const title = allWellRated ? `Melhor avaliados ${place}` : `Profissionais ${place}`;

  return (
    <section aria-labelledby="vitrine-titulo" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 id="vitrine-titulo" className="font-display text-title text-ink">
          {title}
        </h2>
        {!!data?.length && (
          <Link href="/buscar" className="flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-accent hover:underline">
            Buscar <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>

      {isLoading && <ProviderGridSkeleton />}

      {isError && (
        <div className="flex flex-col items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-5">
          <p className="flex items-center gap-2 text-danger">
            <AlertTriangle size={16} aria-hidden="true" /> {extractErrorMessage(error, 'Não foi possível carregar agora.')}
          </p>
          <button
            onClick={() => refetch()}
            className="flex min-h-11 items-center gap-1.5 rounded-lg border border-danger px-4 text-sm font-medium text-danger hover:bg-danger hover:text-white"
          >
            <RotateCw size={14} aria-hidden="true" /> Tentar de novo
          </button>
        </div>
      )}

      {data?.length === 0 && <ComingSoon city={city} />}

      {!!data?.length && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      )}
    </section>
  );
}
