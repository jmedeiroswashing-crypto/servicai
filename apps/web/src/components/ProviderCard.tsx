'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { ScoreBadge } from './ScoreBadge';
import type { ProviderProfile } from '@/lib/types';

export function ProviderCard({ provider }: { provider: ProviderProfile }) {
  const cover = provider.media?.[0]?.url;

  return (
    <Link href={`/prestador/${provider.id}`} className="group block">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={provider.specialty}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center border border-border">
            <span className="font-display text-4xl text-foreground-muted/50">{provider.user.name.charAt(0)}</span>
          </div>
        )}
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
