'use client';

import { use, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MapPin, Clock, Users, MessageCircle, Phone, CalendarCheck, Star } from 'lucide-react';
import { ScoreBadge } from '@/components/ScoreBadge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { ProviderProfile } from '@/lib/types';

export default function ProviderProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuthStore();
  const [requesting, setRequesting] = useState(false);

  const { data: provider, isLoading } = useQuery({
    queryKey: ['provider', id],
    queryFn: async () => {
      const res = await api.get<ProviderProfile>(`/providers/${id}`);
      return res.data;
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/bookings', { providerId: id });
      return res.data;
    },
    onSuccess: () => setRequesting(false),
    onError: () => setRequesting(false),
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
            <span className="flex items-center gap-1">
              <Clock size={14} /> {provider.yearsExperience} anos de experiência
            </span>
            <span className="flex items-center gap-1">
              <Users size={14} /> {provider.clientsCount} clientes atendidos
            </span>
          </div>
          <ScoreBadge rating={provider.ratingAvg} scoreIA={provider.scoreIA} selo={provider.selo} />
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
        <button className="flex items-center gap-2 border border-border px-5 py-2.5 text-sm font-medium hover:border-ink">
          <MessageCircle size={16} /> Enviar mensagem
        </button>
        {provider.user.phone && (
          <a
            href={`https://wa.me/${provider.user.phone.replace(/\D/g, '')}`}
            target="_blank"
            className="flex items-center gap-2 border border-border px-5 py-2.5 text-sm font-medium hover:border-ink"
          >
            <Phone size={16} /> WhatsApp
          </a>
        )}
      </div>

      {provider.bio && (
        <div className="mt-10">
          <h2 className="font-display mb-2 text-xl text-ink">Sobre</h2>
          <p className="text-foreground-muted">{provider.bio}</p>
        </div>
      )}

      {provider.media && provider.media.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display mb-4 text-xl text-ink">Galeria</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {provider.media.map((m) => (
              <div key={m.id} className="aspect-square overflow-hidden bg-surface-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.caption ?? ''} className="h-full w-full object-cover" />
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
