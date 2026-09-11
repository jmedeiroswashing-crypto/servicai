'use client';

import { use, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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
    return <div className="mx-auto max-w-4xl px-4 py-20 text-center text-foreground/50">Carregando perfil...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6 rounded-3xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:p-8"
      >
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full gradient-brand text-3xl font-bold text-white">
          {provider.user.name.charAt(0)}
        </div>
        <div className="flex-1 space-y-2">
          <h1 className="text-2xl font-bold">{provider.user.name}</h1>
          <p className="text-foreground/60">{provider.specialty}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-foreground/50">
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
      </motion.div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          disabled={!user || requesting}
          onClick={() => {
            setRequesting(true);
            bookingMutation.mutate();
          }}
          className="flex items-center gap-2 rounded-full gradient-brand px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-50"
        >
          <CalendarCheck size={16} />
          {bookingMutation.isSuccess ? 'Solicitado!' : 'Contratar agora'}
        </button>
        <button className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-surface-muted">
          <MessageCircle size={16} /> Enviar mensagem
        </button>
        {provider.user.phone && (
          <a
            href={`https://wa.me/${provider.user.phone.replace(/\D/g, '')}`}
            target="_blank"
            className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-surface-muted"
          >
            <Phone size={16} /> WhatsApp
          </a>
        )}
      </div>

      {provider.bio && (
        <div className="mt-8">
          <h2 className="mb-2 text-lg font-semibold">Sobre</h2>
          <p className="text-foreground/70">{provider.bio}</p>
        </div>
      )}

      {provider.media && provider.media.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Galeria</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {provider.media.map((m) => (
              <div key={m.id} className="aspect-square overflow-hidden rounded-xl bg-surface-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.caption ?? ''} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {provider.services && provider.services.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Serviços oferecidos</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {provider.services.map((s) => (
              <div key={s.id} className="rounded-2xl border border-border bg-surface p-5">
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-foreground/60">{s.description}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  {s.priceMin && (
                    <span className="font-semibold text-brand">
                      R$ {s.priceMin} {s.priceMax ? `– R$ ${s.priceMax}` : ''}
                    </span>
                  )}
                  {s.estimatedTime && <span className="text-foreground/50">{s.estimatedTime}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {provider.reviews && provider.reviews.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Avaliações</h2>
          <div className="space-y-4">
            {provider.reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-surface p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{r.client?.name ?? 'Cliente'}</span>
                  <span className="flex items-center gap-1 text-sm">
                    <Star size={14} className="fill-amber-400 text-amber-400" /> {r.rating.toFixed(1)}
                  </span>
                </div>
                {r.comment && <p className="text-sm text-foreground/70">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
