'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Product, ProductStatus } from '@/lib/types';

const STATUS_LABEL: Record<ProductStatus, string> = {
  DISPONIVEL: 'Disponível',
  RESERVADO: 'Reservado',
  VENDIDO: 'Vendido',
};

function ProductRow({ product }: { product: Product }) {
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: async (status: ProductStatus) => (await api.patch(`/products/${product.id}`, { status })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', 'mine'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/products/${product.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', 'mine'] }),
  });

  return (
    <div className="flex items-center gap-4 border border-border p-4">
      <div className="h-16 w-16 shrink-0 overflow-hidden bg-surface-muted">
        {product.photoUrls?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.photoUrls[0]} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Tag size={18} className="text-foreground-muted/40" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/marketplace/produto?id=${product.id}`} className="truncate font-medium text-ink hover:text-accent">
          {product.title}
        </Link>
        <p className="text-sm text-foreground-muted">R$ {product.price.toFixed(0)}</p>
      </div>
      <select
        value={product.status}
        onChange={(e) => statusMutation.mutate(e.target.value as ProductStatus)}
        disabled={statusMutation.isPending}
        className="border border-border bg-transparent px-2 py-1.5 text-xs outline-none focus:border-ink"
      >
        {Object.entries(STATUS_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
        className="shrink-0 p-2 text-foreground-muted hover:text-danger"
        aria-label="Excluir anúncio"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

export default function MeusAnunciosPage() {
  const { token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'mine'],
    enabled: !!token,
    queryFn: async () => (await api.get<Product[]>('/products/mine')).data,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink">Meus anúncios</h1>
        <div className="flex gap-2">
          <Link
            href="/marketplace/mensagens"
            className="flex items-center gap-1.5 border border-border px-4 py-2 text-sm font-medium text-ink hover:border-ink"
          >
            Mensagens
          </Link>
          <Link href="/marketplace/anunciar" className="flex items-center gap-1.5 bg-ink px-4 py-2 text-sm font-medium text-background hover:opacity-85">
            <Plus size={15} /> Novo
          </Link>
        </div>
      </div>

      <div className="mt-10 space-y-3">
        {isLoading && <p className="text-foreground-muted">Carregando...</p>}
        {products && products.length === 0 && (
          <p className="text-foreground-muted">
            Você ainda não publicou nenhum anúncio.{' '}
            <Link href="/marketplace/anunciar" className="text-accent hover:underline">
              Anunciar agora
            </Link>
          </p>
        )}
        {products?.map((p) => (
          <ProductRow key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
