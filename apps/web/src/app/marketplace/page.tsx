'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Tag } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { CategorySelect } from '@/components/CategorySelect';
import { PRODUCT_CATEGORIES } from '@/lib/product-categories';
import type { Product } from '@/lib/types';

const inputClass = 'border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-ink';

function ProductCard({ product }: { product: Product }) {
  const cover = product.photoUrls?.[0];
  return (
    <Link href={`/marketplace/produto?id=${product.id}`} className="group block">
      <div className="aspect-square w-full overflow-hidden bg-surface-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Tag size={28} className="text-foreground-muted/40" />
          </div>
        )}
      </div>
      <div className="space-y-1 border-b border-border pb-4 pt-3">
        <p className="font-display text-lg text-ink">R$ {product.price.toFixed(0)}</p>
        <h3 className="text-sm text-ink group-hover:text-accent">{product.title}</h3>
        <p className="text-xs text-foreground-muted">{product.city}</p>
      </div>
    </Link>
  );
}

function MarketplaceContent() {
  const { token } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', q, category, city],
    queryFn: async () =>
      (
        await api.get<Product[]>('/products', {
          params: { q: q || undefined, category: category || undefined, city: city || undefined },
        })
      ).data,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">Marketplace</h1>
          <p className="mt-2 text-foreground-muted">Compre e venda direto com outros usuários, com negociação pelo chat.</p>
        </div>
        <button
          onClick={() => (token ? router.push('/marketplace/anunciar') : router.push('/login'))}
          className="flex shrink-0 items-center gap-1.5 bg-ink px-4 py-2 text-sm font-medium text-background hover:opacity-85"
        >
          <Plus size={15} /> Anunciar produto
        </button>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 border border-border px-3 py-2 sm:max-w-sm">
          <Search size={14} className="shrink-0 text-foreground-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar produto..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-foreground-muted/50"
          />
        </div>
        <CategorySelect
          categories={PRODUCT_CATEGORIES}
          value={category}
          onChange={setCategory}
          allowEmpty
          emptyLabel="Todas as categorias"
          className="w-56"
        />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade" className={`${inputClass} w-44`} />
      </div>

      <div className="mt-10">
        {isLoading && <p className="text-foreground-muted">Carregando anúncios...</p>}
        {products && products.length === 0 && <p className="text-foreground-muted">Nenhum anúncio encontrado.</p>}
        {products && products.length > 0 && (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={null}>
      <MarketplaceContent />
    </Suspense>
  );
}
