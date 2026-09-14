'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Hammer,
  Home as HomeIcon,
  Car,
  Sparkles,
  HeartPulse,
  Scale,
  Code2,
  GraduationCap,
} from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { ProviderCard } from '@/components/ProviderCard';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { ProviderProfile } from '@/lib/types';

const CATEGORY_GROUPS = [
  { label: 'Reformas e reparos', query: 'eletricista, encanador, pedreiro, pintor', icon: Hammer },
  { label: 'Casa', query: 'limpeza, mudanças, ar-condicionado', icon: HomeIcon },
  { label: 'Autos', query: 'mecânico, lava rápido', icon: Car },
  { label: 'Beleza', query: 'estética, salão, barbeiro', icon: Sparkles },
  { label: 'Saúde', query: 'médico, psicólogo, odontologia', icon: HeartPulse },
  { label: 'Consultoria', query: 'advogado', icon: Scale },
  { label: 'Tecnologia', query: 'desenvolvedor, designer', icon: Code2 },
  { label: 'Aulas', query: 'professor particular', icon: GraduationCap },
];

function ClientHome() {
  const { data } = useQuery({
    queryKey: ['providers', 'top-rated'],
    queryFn: async () => (await api.get<ProviderProfile[]>('/providers', { params: { take: 8 } })).data,
  });

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="grid grid-cols-4 gap-x-2 gap-y-6 sm:grid-cols-8">
            {CATEGORY_GROUPS.map(({ label, query, icon: Icon }) => (
              <Link
                key={label}
                href={`/buscar?q=${encodeURIComponent(query)}`}
                className="group flex flex-col items-center gap-2 text-center"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent-strong transition-colors group-hover:bg-accent group-hover:text-white">
                  <Icon size={24} strokeWidth={1.75} />
                </span>
                <span className="text-xs leading-tight text-foreground-muted group-hover:text-ink">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
          <p className="mb-3 text-sm uppercase tracking-[0.15em] text-foreground-muted">ServiçAi</p>
          <h1 className="font-display text-3xl leading-tight text-ink sm:text-5xl">
            Mais de 20 tipos de serviço em um só lugar.
          </h1>
          <p className="mt-4 max-w-xl text-foreground-muted">
            Encontre profissionais verificados perto de você e contrate com avaliações reais.
          </p>
          <div className="mt-8">
            <SearchBar large />
          </div>
          <p className="mt-8 text-sm text-foreground-muted">
            Não achou quem procurava?{' '}
            <Link href="/solicitar" className="text-accent hover:underline">
              Publique uma solicitação
            </Link>{' '}
            e deixe os profissionais da sua região virem até você.
          </p>
          </div>

          <div className="hidden justify-self-center lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero-worker.png"
              alt="Profissional ServiçAi"
              className="max-h-[420px] w-auto"
            />
          </div>
        </div>
      </section>

      {data && data.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-8 flex items-end justify-between border-b border-border pb-4">
            <h2 className="font-display text-2xl text-ink">Melhor avaliados</h2>
            <Link href="/buscar" className="flex items-center gap-1 text-sm text-foreground-muted hover:text-ink">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {data.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === 'PRESTADOR') router.push('/painel');
  }, [user, router]);

  if (user?.role === 'PRESTADOR') return null;

  return <ClientHome />;
}
