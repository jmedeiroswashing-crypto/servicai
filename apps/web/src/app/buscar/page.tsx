'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Radio } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { ProviderCard } from '@/components/ProviderCard';
import { api } from '@/lib/api';
import type { ProviderProfile, SearchIntent } from '@/lib/types';

function SearchResults() {
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const [availableNow, setAvailableNow] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ['search', q, availableNow],
    enabled: q.length > 0,
    queryFn: async () => {
      const res = await api.get<{ intent: SearchIntent | null; providers: ProviderProfile[] }>('/search', {
        params: { q, availableNow: availableNow || undefined },
      });
      return res.data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="max-w-2xl">
        <SearchBar initialValue={q} large />
      </div>

      <button
        onClick={() => setAvailableNow((v) => !v)}
        className={`mt-4 flex w-fit items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-colors ${
          availableNow ? 'border-success bg-success/10 text-success' : 'border-border text-foreground-muted hover:border-ink'
        }`}
      >
        <Radio size={12} /> Disponível agora
      </button>

      {q && data?.intent && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground-muted">
          <span>
            Categoria: <span className="text-ink">{data.intent.category}</span>
          </span>
          {data.intent.urgency === 'alta' && <span className="text-danger">Urgente</span>}
          {data.intent.location && <span>Em {data.intent.location}</span>}
        </div>
      )}

      <div className="mt-12">
        {isFetching && <p className="text-foreground-muted">Buscando os melhores profissionais...</p>}

        {!isFetching && data && data.providers.length === 0 && (
          <p className="text-foreground-muted">
            {availableNow
              ? 'Ninguém disponível agora para essa busca. Desative o filtro pra ver todos os profissionais.'
              : `Nenhum profissional encontrado para "${q}" ainda. Tente outra busca.`}
          </p>
        )}

        {data && data.providers.length > 0 && (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
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
