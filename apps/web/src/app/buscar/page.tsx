'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Radio, AlertTriangle, RotateCw, Zap } from 'lucide-react';
import { ComingSoon } from '@/components/home/Showcase';
import { ProviderCard, ProviderGridSkeleton } from '@/components/ProviderCard';
import { SearchBar } from '@/components/SearchBar';
import { api } from '@/lib/api';
import { extractErrorMessage } from '@/lib/error-message';
import type { ProviderProfile, SearchIntent } from '@/lib/types';

const chipClass =
  'flex min-h-11 w-fit items-center gap-1.5 rounded-pill border px-4 text-sm font-medium transition-colors duration-150';

function SearchResults() {
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const city = params.get('cidade') ?? '';
  const [availableNow, setAvailableNow] = useState(false);

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['search', q, city, availableNow],
    enabled: q.length > 0,
    queryFn: async () => {
      const res = await api.get<{ intent: SearchIntent | null; providers: ProviderProfile[] }>('/search', {
        params: { q, city: city || undefined, availableNow: availableNow || undefined },
      });
      return res.data;
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
      <h1 className="font-display text-3xl text-ink">
        {q ? `Resultados para "${q}"${city ? ` em ${city}` : ''}` : 'Buscar profissionais'}
      </h1>

      <div className="mt-5 max-w-2xl">
        <SearchBar key={q} initialValue={q} large />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setAvailableNow((v) => !v)}
          aria-pressed={availableNow}
          className={`${chipClass} ${
            availableNow ? 'border-success bg-success/10 text-success' : 'border-border text-foreground-muted hover:border-accent'
          }`}
        >
          <Radio size={14} aria-hidden="true" /> Disponível agora
        </button>
        <Link href="/vagas-ultima-hora" className={`${chipClass} border-cta text-cta-strong hover:bg-cta-soft`}>
          <Zap size={14} aria-hidden="true" /> Urgente
        </Link>
      </div>

      {q && data?.intent?.urgency === 'alta' && <p className="mt-3 text-sm font-medium text-danger">Pedido urgente</p>}

      <div className="mt-8">
        {isFetching && <ProviderGridSkeleton />}

        {!isFetching && isError && (
          <div className="flex flex-col items-start gap-3 rounded-card border border-danger/30 bg-danger/5 p-5">
            <p className="flex items-center gap-2 text-danger">
              <AlertTriangle size={16} aria-hidden="true" /> {extractErrorMessage(error, 'Não foi possível buscar agora.')}
            </p>
            <button
              onClick={() => refetch()}
              className="flex min-h-11 items-center gap-1.5 rounded-lg border border-danger px-4 text-sm font-medium text-danger hover:bg-danger hover:text-white"
            >
              <RotateCw size={14} aria-hidden="true" /> Tentar de novo
            </button>
          </div>
        )}

        {!isFetching && !isError && data && data.providers.length === 0 &&
          (availableNow ? (
            <p className="text-foreground-muted">
              Ninguém disponível agora para essa busca. Desative o filtro para ver todos os profissionais.
            </p>
          ) : (
            <ComingSoon city={city || null} />
          ))}

        {!isFetching && data && data.providers.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        )}

        {!q && <p className="text-foreground-muted">Digite o que você precisa na busca acima.</p>}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResults />
    </Suspense>
  );
}
