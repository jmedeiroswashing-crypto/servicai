'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { ScoreBadge } from './ScoreBadge';
import type { ProviderProfile } from '@/lib/types';

export function ProviderCard({ provider }: { provider: ProviderProfile }) {
  const cover = provider.media?.[0]?.url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35 }}
    >
      <Link
        href={`/prestador/${provider.id}`}
        className="group block overflow-hidden rounded-2xl border border-border bg-surface transition-shadow hover:shadow-lg"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-muted">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={provider.specialty}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center gradient-brand text-4xl font-bold text-white/90">
              {provider.user.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{provider.user.name}</h3>
          </div>
          <p className="text-sm text-foreground/60">{provider.specialty}</p>
          <p className="flex items-center gap-1 text-xs text-foreground/50">
            <MapPin size={12} /> {provider.city}
          </p>
          <ScoreBadge rating={provider.ratingAvg} scoreIA={provider.scoreIA} selo={provider.selo} />
        </div>
      </Link>
    </motion.div>
  );
}
