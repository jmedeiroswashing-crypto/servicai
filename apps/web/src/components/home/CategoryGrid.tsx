'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { buildSearchUrl } from '@/components/SearchBar';
import { api } from '@/lib/api';
import { categoryImage } from '@/lib/images';
import { TAXONOMY } from '@/lib/taxonomy';
import { useCityStore } from '@/store/city-store';

export interface CategoryCount {
  slug: string;
  providerCount: number;
  subcategories: { slug: string; providerCount: number }[];
}

export function useCategoryCounts(city: string | null) {
  return useQuery({
    queryKey: ['categories', city],
    queryFn: async () =>
      (await api.get<CategoryCount[]>('/categories', { params: { city: city ?? undefined } })).data,
  });
}

export function CategoryGrid() {
  const city = useCityStore((s) => s.city);
  const { data: counts } = useCategoryCounts(city);

  return (
    <section aria-labelledby="categorias-titulo" className="mx-auto max-w-7xl py-12 md:px-6">
      <div className="mb-6 flex items-end justify-between gap-4 px-4 md:px-0">
        <h2 id="categorias-titulo" className="font-display text-title text-ink">
          Categorias
        </h2>
        <Link href="/categorias" className="flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-accent hover:underline">
          Ver todas as categorias <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      <ul className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0">
        {TAXONOMY.map((category) => {
          const image = categoryImage(category.slug);
          const count = counts?.find((c) => c.slug === category.slug)?.providerCount ?? 0;
          return (
            <li key={category.slug} className="w-[70vw] max-w-72 shrink-0 snap-start md:w-auto md:max-w-none">
              <Link
                href={buildSearchUrl(category.label, city)}
                className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-card bg-gradient-to-br from-[#123a6b] to-brand-dark p-4 shadow-soft-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-soft-md"
              >
                {image && (
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    loading="lazy"
                    sizes="(min-width: 768px) 25vw, 70vw"
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                )}
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
                <span className="relative font-semibold text-white">{category.label}</span>
                {count > 0 && (
                  <span className="relative text-sm text-white/85">
                    {count} {count === 1 ? 'prestador' : 'prestadores'}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        <li className="w-[70vw] max-w-72 shrink-0 snap-start md:col-span-3 md:w-auto md:max-w-none">
          <Link
            href="/categorias"
            className="flex h-full min-h-32 items-center justify-center gap-2 rounded-card border border-border bg-surface-muted p-4 text-center font-semibold text-ink transition duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-soft-md"
          >
            Ver todas as categorias e serviços <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </li>
      </ul>
    </section>
  );
}
