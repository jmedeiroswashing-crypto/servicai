'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { ProviderCard } from '@/components/ProviderCard';
import { api } from '@/lib/api';
import type { ProviderProfile, SearchIntent } from '@/lib/types';

function SearchResults() {
  const params = useSearchParams();
  const q = params.get('q') ?? '';

  const { data, isFetching } = useQuery({
    queryKey: ['search', q],
    enabled: q.length > 0,
    queryFn: async () => {
      const res = await api.get<{ intent: SearchIntent | null; providers: ProviderProfile[] }>('/search', {
        params: { q },
      });
      return res.data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mx-auto mb-8 max-w-2xl">
        <SearchBar initialValue={q} large />
      </div>

      {q && data?.intent && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mb-8 flex max-w-2xl flex-wrap items-center justify-center gap-2 text-sm text-foreground/60"
        >
          <span className="flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 font-medium text-brand">
            <Zap size={13} /> Categoria: {data.intent.category}
          </span>
          {data.intent.urgency === 'alta' && (
            <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-600">Urgente</span>
          )}
          {data.intent.location && (
            <span className="rounded-full bg-surface-muted px-3 py-1">📍 {data.intent.location}</span>
          )}
        </motion.div>
      )}

      {isFetching && <p className="text-center text-foreground/50">Buscando os melhores profissionais...</p>}

      {!isFetching && data && data.providers.length === 0 && (
        <p className="text-center text-foreground/50">
          Nenhum profissional encontrado para &quot;{q}&quot; ainda. Tente outra busca.
        </p>
      )}

      {data && data.providers.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      )}

      {!q && <p className="text-center text-foreground/50">Digite o que você precisa na busca acima.</p>}
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
