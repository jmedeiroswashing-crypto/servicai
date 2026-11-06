'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search } from 'lucide-react';
import { useCityStore } from '@/store/city-store';

export function buildSearchUrl(q: string, city: string | null) {
  const params = new URLSearchParams({ q });
  if (city) params.set('cidade', city);
  return `/buscar?${params.toString()}`;
}

export function SearchBar({
  initialValue = '',
  large = false,
  compact = false,
}: {
  initialValue?: string;
  large?: boolean;
  compact?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const city = useCityStore((s) => s.city);
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    router.push(buildSearchUrl(value.trim(), city));
  }

  if (compact) {
    return (
      <form role="search" onSubmit={handleSubmit} className="relative w-full">
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="O que você precisa?"
          placeholder="O que você precisa?"
          className="h-11 w-full rounded-pill border border-transparent bg-surface pl-10 pr-4 text-sm text-foreground outline-none transition-colors duration-150 placeholder:text-foreground-muted focus:border-accent"
        />
      </form>
    );
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={`flex w-full items-center gap-2 rounded-card border border-border bg-surface px-4 transition-colors duration-150 focus-within:border-accent ${
        large ? 'py-2' : 'py-1'
      }`}
    >
      <Search size={18} aria-hidden="true" className="shrink-0 text-foreground-muted" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="O que você precisa?"
        placeholder="O que você precisa?"
        className={`h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:text-foreground-muted ${large ? 'text-base' : 'text-sm'}`}
      />
      <button
        type="submit"
        className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-accent transition-colors duration-150 hover:text-accent-strong"
      >
        Buscar
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </form>
  );
}
