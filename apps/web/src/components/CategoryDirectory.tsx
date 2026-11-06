'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { buildSearchUrl } from './SearchBar';
import { useCategoryCounts } from './home/CategoryGrid';
import { TAXONOMY } from '@/lib/taxonomy';
import { useCityStore } from '@/store/city-store';

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function CategoryDirectory() {
  const [query, setQuery] = useState('');
  const city = useCityStore((s) => s.city);
  const { data: counts } = useCategoryCounts(city);
  const term = normalize(query.trim());

  const visible = TAXONOMY.map((category) => ({
    ...category,
    subcategories: normalize(category.label).includes(term)
      ? category.subcategories
      : category.subcategories.filter((s) => normalize(s.label).includes(term)),
  })).filter((category) => category.subcategories.length > 0);

  return (
    <>
      <div className="relative mt-6 max-w-xl">
        <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar categoria"
          placeholder="Buscar categoria ou serviço"
          className="h-12 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-base outline-none focus:border-accent"
        />
      </div>

      {visible.length === 0 && <p className="mt-8 text-foreground-muted">Nenhum serviço encontrado.</p>}

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((category) => {
          const categoryCounts = counts?.find((c) => c.slug === category.slug);
          return (
            <section key={category.slug} className="rounded-card border border-border bg-surface p-5 shadow-soft-sm">
              <h2 className="font-semibold text-ink">
                <Link href={buildSearchUrl(category.label, city)} className="hover:text-accent">
                  {category.label}
                </Link>
              </h2>
              <ul className="mt-2">
                {category.subcategories.map((sub) => {
                  const count = categoryCounts?.subcategories.find((s) => s.slug === sub.slug)?.providerCount ?? 0;
                  return (
                    <li key={sub.slug}>
                      <Link
                        href={buildSearchUrl(sub.label, city)}
                        className="flex min-h-11 items-center justify-between gap-3 text-sm text-foreground-muted hover:text-accent"
                      >
                        {sub.label}
                        {count > 0 && <span className="text-xs">{count}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
