'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MapPin, BadgeCheck, MessageCircle, Heart, Tag } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { ReportButton } from '@/components/ReportButton';
import type { Product } from '@/lib/types';

const CONDITION_LABEL: Record<string, string> = {
  NOVO: 'Novo',
  USADO: 'Usado',
};

const STATUS_LABEL: Record<string, string> = {
  DISPONIVEL: 'Disponível',
  RESERVADO: 'Reservado',
  VENDIDO: 'Vendido',
};

function ProductDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    enabled: !!id,
    queryFn: async () => (await api.get<Product>(`/products/${id}`)).data,
  });

  const chatMutation = useMutation({
    mutationFn: async () => (await api.post('/marketplace-chat/conversations', { productId: id })).data,
    onSuccess: (conversation) => router.push(`/marketplace/mensagens?c=${conversation.id}`),
    onSettled: () => setStarting(false),
  });

  const favoriteMutation = useMutation({
    mutationFn: async () => (await api.post(`/products/${id}/favorite`)).data,
  });

  if (isLoading || !product) {
    return <div className="mx-auto max-w-4xl px-4 py-20 text-foreground-muted">Carregando anúncio...</div>;
  }

  const isOwner = user?.id === product.sellerId;

  function handleContact() {
    if (!token) {
      router.push('/login');
      return;
    }
    setStarting(true);
    chatMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <div className="aspect-square w-full overflow-hidden bg-surface-muted">
            {product.photoUrls?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.photoUrls[0]}
                alt={product.title}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Tag size={40} className="text-foreground-muted/40" />
              </div>
            )}
          </div>
          {product.photoUrls && product.photoUrls.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {product.photoUrls.slice(1).map((url, i) => (
                <div key={i} className="aspect-square overflow-hidden bg-surface-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          {product.status !== 'DISPONIVEL' && (
            <span className="mb-2 inline-block border border-border px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-foreground-muted">
              {STATUS_LABEL[product.status]}
            </span>
          )}
          <p className="font-display text-3xl text-ink">R$ {product.price.toFixed(2).replace('.', ',')}</p>
          <h1 className="mt-2 text-xl text-ink">{product.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground-muted">
            <span className="flex items-center gap-1">
              <MapPin size={13} /> {product.city}
              {product.state ? ` - ${product.state}` : ''}
            </span>
            <span>{CONDITION_LABEL[product.condition]}</span>
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <h2 className="mb-1 text-sm font-medium text-foreground-muted">Descrição</h2>
            <p className="whitespace-pre-line text-sm text-ink">{product.description}</p>
          </div>

          <div className="mt-6 flex items-center gap-2 border-t border-border pt-4">
            <div className="flex h-9 w-9 items-center justify-center border border-border bg-surface-muted text-sm font-medium text-foreground-muted">
              {product.seller?.name?.charAt(0) ?? '?'}
            </div>
            <div>
              <p className="flex items-center gap-1 text-sm font-medium text-ink">
                {product.seller?.name}
                {product.seller?.verified && <BadgeCheck size={13} className="text-accent" />}
              </p>
              <p className="text-xs text-foreground-muted">Vendedor</p>
            </div>
          </div>

          {!isOwner && (
            <div className="mt-6 flex gap-2">
              <button
                onClick={handleContact}
                disabled={starting || product.status !== 'DISPONIVEL'}
                className="flex items-center gap-2 bg-ink px-5 py-2.5 text-sm font-medium text-background hover:opacity-85 disabled:opacity-40"
              >
                <MessageCircle size={16} /> {starting ? 'Abrindo...' : 'Conversar com o vendedor'}
              </button>
              <button
                onClick={() => favoriteMutation.mutate()}
                disabled={!token || favoriteMutation.isPending}
                className="flex items-center gap-2 border border-border px-4 py-2.5 text-sm font-medium hover:border-ink disabled:opacity-50"
              >
                <Heart size={16} className={favoriteMutation.isSuccess ? 'fill-accent text-accent' : ''} />
              </button>
            </div>
          )}
          {isOwner && <p className="mt-6 text-sm text-foreground-muted">Este é o seu anúncio.</p>}
          {!isOwner && (
            <div className="mt-4">
              <ReportButton targetType="PRODUTO" targetId={product.id} label="Denunciar anúncio" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={null}>
      <ProductDetailContent />
    </Suspense>
  );
}
