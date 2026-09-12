'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { ProviderCard } from '@/components/ProviderCard';
import { AuthForm } from '@/components/AuthForm';
import { CATEGORIES } from '@/lib/categories';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { ProviderProfile, Role } from '@/lib/types';

function RoleChoice({ onChoose }: { onChoose: (role: Role) => void }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:py-28">
      <p className="mb-3 text-sm uppercase tracking-[0.15em] text-foreground-muted">ServiçAi</p>
      <h1 className="font-display max-w-lg text-4xl leading-[1.1] text-ink sm:text-6xl">
        Você quer ser
      </h1>

      <div className="mt-14 divide-y divide-border border-y border-border">
        <button
          onClick={() => onChoose('CLIENTE')}
          className="group flex w-full items-center justify-between py-8 text-left transition-colors hover:bg-surface-muted/50"
        >
          <div>
            <span className="mb-1 block text-xs text-foreground-muted">01</span>
            <span className="font-display block text-3xl text-ink sm:text-4xl">Cliente</span>
            <span className="mt-1 block text-sm text-foreground-muted">Quero contratar um serviço</span>
          </div>
          <ArrowUpRight
            size={28}
            className="shrink-0 text-foreground-muted transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent"
          />
        </button>

        <button
          onClick={() => onChoose('PRESTADOR')}
          className="group flex w-full items-center justify-between py-8 text-left transition-colors hover:bg-surface-muted/50"
        >
          <div>
            <span className="mb-1 block text-xs text-foreground-muted">02</span>
            <span className="font-display block text-3xl text-ink sm:text-4xl">Vendedor</span>
            <span className="mt-1 block text-sm text-foreground-muted">Quero oferecer meus serviços</span>
          </div>
          <ArrowUpRight
            size={28}
            className="shrink-0 text-foreground-muted transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent"
          />
        </button>
      </div>
    </div>
  );
}

function ClientHome() {
  const { data } = useQuery({
    queryKey: ['providers', 'top-rated'],
    queryFn: async () => (await api.get<ProviderProfile[]>('/providers', { params: { take: 8 } })).data,
  });

  return (
    <div>
      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:py-24">
          <h1 className="font-display text-3xl leading-tight text-ink sm:text-5xl">
            O que você está procurando?
          </h1>
          <div className="mt-8">
            <SearchBar large />
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-foreground-muted">
            {CATEGORIES.slice(0, 12).map((c) => (
              <Link key={c.slug} href={`/buscar?q=${encodeURIComponent(c.label)}`} className="link-underline pb-0.5 hover:text-ink">
                {c.label}
              </Link>
            ))}
          </div>
          <p className="mt-8 text-sm text-foreground-muted">
            Não achou quem procurava?{' '}
            <Link href="/solicitar" className="text-accent hover:underline">
              Publique uma solicitação
            </Link>{' '}
            e deixe os profissionais da sua região virem até você.
          </p>
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
  const [step, setStep] = useState<'choose' | 'auth'>('choose');
  const [chosenRole, setChosenRole] = useState<Role>('CLIENTE');

  useEffect(() => {
    if (user?.role === 'PRESTADOR') router.push('/painel');
  }, [user, router]);

  if (user?.role === 'CLIENTE') return <ClientHome />;
  if (user?.role === 'PRESTADOR') return null;

  if (step === 'auth') {
    return (
      <div className="px-4 py-16">
        <AuthForm role={chosenRole} onBack={() => setStep('choose')} />
      </div>
    );
  }

  return (
    <RoleChoice
      onChoose={(role) => {
        setChosenRole(role);
        setStep('auth');
      }}
    />
  );
}
