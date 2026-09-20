'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Clock, Users, MessageCircle, Phone, CalendarCheck, Star, Navigation, Heart, Timer } from 'lucide-react';
import { ScoreBadge } from '@/components/ScoreBadge';
import { ReportButton } from '@/components/ReportButton';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { openRouteToProvider } from '@/lib/maps';
import type { ProviderProfile } from '@/lib/types';

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return raw;
}

function ProviderProfileContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [requesting, setRequesting] = useState(false);
  const [locating, setLocating] = useState(false);

  const { data: provider, isLoading } = useQuery({
    queryKey: ['provider', id],
    queryFn: async () => {
      const res = await api.get<ProviderProfile>(`/providers/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: favorites } = useQuery({
    queryKey: ['favorites', 'mine'],
    enabled: user?.role === 'CLIENTE',
    queryFn: async () => (await api.get<{ provider: { id: string } }[]>('/providers/favorites/mine')).data,
  });
  const isFavorited = !!favorites?.some((f) => f.provider.id === id);

  const favoriteMutation = useMutation({
    mutationFn: async () =>
      isFavorited ? api.delete(`/providers/${id}/favorite`) : api.post(`/providers/${id}/favorite`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites', 'mine'] }),
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/bookings', { providerId: id });
      return res.data;
    },
    onSuccess: () => setRequesting(false),
    onError: () => setRequesting(false),
  });

  const chatMutation = useMutation({
    mutationFn: async () => (await api.post('/chat/conversations', { providerId: id })).data,
    onSuccess: (conversation) => router.push(`/mensagens?c=${conversation.id}`),
  });

  if (isLoading || !provider) {
    return <div className="mx-auto max-w-4xl px-4 py-20 text-foreground-muted">Carregando perfil...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-start">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center border border-border">
          <span className="font-display text-3xl text-ink">{provider.user.name.charAt(0)}</span>
        </div>
        <div className="flex-1 space-y-2">
          <h1 className="font-display text-3xl text-ink">{provider.user.name}</h1>
          <p className="text-foreground-muted">{provider.specialty}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-muted">
            <span className="flex items-center gap-1">
              <MapPin size={14} /> {provider.city}
            </span>
            <button
              disabled={locating}
              onClick={async () => {
                setLocating(true);
                await openRouteToProvider(provider);
                setLocating(false);
              }}
              className="flex items-center gap-1 text-accent hover:underline disabled:opacity-50"
            >
              <Navigation size={13} /> {locating ? 'Localizando...' : 'Traçar rota'}
            </button>
            <span className="flex items-center gap-1">
              <Clock size={14} /> {provider.yearsExperience} anos de experiência
            </span>
            <span className="flex items-center gap-1">
              <Users size={14} /> {provider.clientsCount} clientes atendidos
            </span>
          </div>
          {provider.user.phone && (
            <a
              href={`https://wa.me/55${provider.user.phone.replace(/\D/g, '')}`}
              target="_blank"
              className="flex w-fit items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              <Phone size={13} /> Entrar em contato · {formatPhone(provider.user.phone)}
            </a>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <ScoreBadge rating={provider.ratingAvg} scoreIA={provider.scoreIA} selo={provider.selo} />
            {provider.availableNow && (
              <span className="flex items-center gap-1.5 border border-success/40 bg-success/10 px-2 py-1 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 bg-success" /> Disponível agora
              </span>
            )}
            {provider.respondsWithinHour && (
              <span className="flex items-center gap-1 border border-success/40 bg-success/10 px-2 py-1 text-xs font-medium text-success">
                <Timer size={12} /> Responde em até 1 hora
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          disabled={!user || requesting}
          onClick={() => {
            setRequesting(true);
            bookingMutation.mutate();
          }}
          className="flex items-center gap-2 bg-ink px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          <CalendarCheck size={16} />
          {bookingMutation.isSuccess ? 'Solicitado!' : 'Contratar agora'}
        </button>
        <button
          disabled={!user || chatMutation.isPending}
          onClick={() => chatMutation.mutate()}
          className="flex items-center gap-2 border border-border px-5 py-2.5 text-sm font-medium hover:border-ink disabled:opacity-50"
        >
          <MessageCircle size={16} /> {chatMutation.isPending ? 'Abrindo...' : 'Enviar mensagem'}
        </button>
        {user?.role === 'CLIENTE' && (
          <button
            disabled={favoriteMutation.isPending}
            onClick={() => favoriteMutation.mutate()}
            className={`flex items-center gap-2 border px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              isFavorited ? 'border-accent text-accent' : 'border-border hover:border-ink'
            }`}
          >
            <Heart size={16} className={isFavorited ? 'fill-accent' : ''} />
            {isFavorited ? 'Favoritado' : 'Favoritar'}
          </button>
        )}
      </div>
      {user?.role === 'CLIENTE' && (
        <p className="mt-2 text-xs text-foreground-muted/70">
          Favoritar avisa este prestador do seu interesse — prestadores no plano Premium podem ver seu nome e telefone
          para prospecção.
        </p>
      )}
      {user && user.id !== provider.userId && (
        <div className="mt-3">
          <ReportButton targetType="USUARIO" targetId={provider.userId} label="Denunciar este prestador" />
        </div>
      )}

      {provider.bio && (
        <div className="mt-10">
          <h2 className="font-display mb-2 text-xl text-ink">Sobre</h2>
          <p className="text-foreground-muted">{provider.bio}</p>
        </div>
      )}

      {provider.media && provider.media.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display mb-4 text-xl text-ink">Portfólio</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {provider.media.map((m) => (
              <div key={m.id}>
                <div className="aspect-square overflow-hidden bg-surface-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.url}
                    alt={m.title ?? m.caption ?? ''}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                {m.title && <p className="mt-1.5 text-sm font-medium text-ink">{m.title}</p>}
                {m.caption && <p className="text-xs text-foreground-muted">{m.caption}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {provider.services && provider.services.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display mb-4 text-xl text-ink">Serviços oferecidos</h2>
          <div className="divide-y divide-border border-t border-border">
            {provider.services.map((s) => (
              <div key={s.id} className="py-5">
                <h3 className="font-medium text-ink">{s.title}</h3>
                <p className="mt-1 text-sm text-foreground-muted">{s.description}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  {s.priceMin && (
                    <span className="font-medium text-ink">
                      R$ {s.priceMin} {s.priceMax ? `– R$ ${s.priceMax}` : ''}
                    </span>
                  )}
                  {s.estimatedTime && <span className="text-foreground-muted">{s.estimatedTime}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {provider.reviews && provider.reviews.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display mb-4 text-xl text-ink">Avaliações</h2>
          <div className="divide-y divide-border border-t border-border">
            {provider.reviews.map((r) => (
              <div key={r.id} className="py-5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-medium text-ink">{r.client?.name ?? 'Cliente'}</span>
                  <span className="flex items-center gap-1 text-sm text-foreground-muted">
                    <Star size={13} className="fill-accent text-accent" /> {r.rating.toFixed(1)}
                  </span>
                </div>
                {r.comment && <p className="text-sm text-foreground-muted">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProviderProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProviderProfileContent />
    </Suspense>
  );
}
