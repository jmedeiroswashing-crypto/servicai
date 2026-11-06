'use client';

import { useQuery } from '@tanstack/react-query';
import { ComingSoon } from './home/Showcase';
import { ProviderCard, ProviderGridSkeleton } from './ProviderCard';
import { api } from '@/lib/api';
import type { ProviderProfile } from '@/lib/types';

export function ServiceCityResults({ service, city }: { service: string; city: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['providers', 'service-city', service, city],
    queryFn: async () =>
      (await api.get<ProviderProfile[]>('/providers', { params: { category: service, city, take: 24 } })).data,
  });

  if (isLoading) return <ProviderGridSkeleton />;
  if (isError) return <p className="text-foreground-muted">Não foi possível carregar os profissionais agora.</p>;
  if (!data?.length) return <ComingSoon city={city} />;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {data.map((provider) => (
        <ProviderCard key={provider.id} provider={provider} />
      ))}
    </div>
  );
}
