'use client';

import Link from 'next/link';
import { Clock, MapPin, Rocket, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { Avatar } from './Avatar';
import type { ProviderProfile } from '@/lib/types';

function formatResponse(minutes: number) {
  if (minutes < 60) return `Responde em ~${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `Responde em ~${hours} h` : 'Responde em mais de 1 dia';
}

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function ProviderCard({ provider }: { provider: ProviderProfile }) {
  const isBoosted = !!provider.boostExpiresAt && new Date(provider.boostExpiresAt) > new Date();
  const reviewCount = provider.reviewCount ?? 0;
  const state = provider.user.addressState;

  return (
    <Link
      href={`/prestador?id=${provider.id}`}
      className="group flex h-full min-w-0 flex-col rounded-card border border-border bg-surface p-4 shadow-soft-sm transition duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-soft-md"
    >
      {(isBoosted || provider.availableNow) && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {isBoosted && (
            <span className="flex items-center gap-1 rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-strong">
              <Rocket size={12} aria-hidden="true" /> Em destaque
            </span>
          )}
          {provider.availableNow && (
            <span className="flex items-center gap-1 rounded-pill bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" /> Disponível agora
            </span>
          )}
        </div>
      )}

      <div className="flex items-start gap-3">
        <Avatar name={provider.user.name} src={provider.user.avatarUrl} className="h-14 w-14 text-base" />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1 font-semibold text-ink">
            <span className="truncate">{provider.user.name}</span>
          </h3>
          <p className="truncate text-sm text-foreground-muted">{provider.specialty}</p>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-foreground-muted">
            <MapPin size={13} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{state ? `${provider.city}, ${state}` : provider.city}</span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        {reviewCount > 0 ? (
          <span className="flex items-center gap-1 font-semibold text-ink">
            <Star size={14} className="fill-[#f5a524] text-[#f5a524]" aria-hidden="true" />
            {provider.ratingAvg.toFixed(1)}
            <span className="font-normal text-foreground-muted">
              ({reviewCount} {reviewCount === 1 ? 'avaliação' : 'avaliações'})
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-pill bg-cta-soft px-2 py-0.5 text-xs font-semibold text-cta-strong">
            <Sparkles size={12} aria-hidden="true" /> Novo
          </span>
        )}
        {provider.user.identityStatus === 'APROVADO' && (
          <span className="flex items-center gap-1 text-xs font-medium text-accent-strong">
            <ShieldCheck size={14} aria-hidden="true" /> Verificado
          </span>
        )}
      </div>

      {provider.responseMinutes != null && (
        <p className="mt-2 flex items-center gap-1 text-sm text-foreground-muted">
          <Clock size={13} aria-hidden="true" /> {formatResponse(provider.responseMinutes)}
        </p>
      )}

      <div className="mt-auto pt-3">
        {provider.priceFrom != null && (
          <p className="mb-2 text-sm text-foreground-muted">
            a partir de <strong className="text-ink">{formatPrice(provider.priceFrom)}</strong>
          </p>
        )}
        <span className="flex min-h-11 items-center justify-center rounded-lg border border-accent text-sm font-semibold text-accent transition-colors duration-150 group-hover:bg-accent group-hover:text-on-accent">
          Pedir orçamento
        </span>
      </div>
    </Link>
  );
}

export function ProviderCardSkeleton() {
  return (
    <div aria-hidden="true" className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="skeleton h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
        </div>
      </div>
      <div className="skeleton mt-4 h-11 rounded-lg" />
    </div>
  );
}

export function ProviderGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Carregando profissionais" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <ProviderCardSkeleton key={index} />
      ))}
    </div>
  );
}
