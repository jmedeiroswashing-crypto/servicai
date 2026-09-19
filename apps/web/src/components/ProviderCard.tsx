'use client';

import Link from 'next/link';
import { MapPin, Rocket } from 'lucide-react';
import { ScoreBadge } from './ScoreBadge';
import { CategoryArt } from './CategoryArt';
import type { ProviderProfile } from '@/lib/types';

export function ProviderCard({ provider }: { provider: ProviderProfile }) {
  const isBoosted = !!provider.boostExpiresAt && new Date(provider.boostExpiresAt) > new Date();

  return (
    <Link href={`/prestador?id=${provider.id}`} className="group block">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {isBoosted && (
          <span className="absolute left-2 top-2 z-10 flex items-center gap-1 bg-ink px-2 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-background">
            <Rocket size={10} /> Em destaque
          </span>
        )}
        {provider.availableNow && (
          <span className="absolute right-2 top-2 z-10 flex items-center gap-1 bg-success px-2 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-white">
            <span className="h-1.5 w-1.5 bg-white" /> Disponível agora
          </span>
        )}
        <CategoryArt
          category={provider.categories?.[0] ?? provider.specialty}
          className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="space-y-1.5 border-b border-border pb-4 pt-3">
        <h3 className="font-medium text-ink group-hover:text-accent">{provider.user.name}</h3>
        <p className="text-sm text-foreground-muted">{provider.specialty}</p>
        <p className="flex items-center gap-1 text-xs text-foreground-muted/80">
          <MapPin size={11} /> {provider.city}
        </p>
        <div className="pt-1">
          <ScoreBadge rating={provider.ratingAvg} scoreIA={provider.scoreIA} selo={provider.selo} />
        </div>
      </div>
    </Link>
  );
}
