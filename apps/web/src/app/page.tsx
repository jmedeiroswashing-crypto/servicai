'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { User, Building2, ArrowRight, Star } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { ProviderCard } from '@/components/ProviderCard';
import { AuthForm } from '@/components/AuthForm';
import { CATEGORIES } from '@/lib/categories';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { ProviderProfile, Role } from '@/lib/types';

function RoleChoice({ onChoose }: { onChoose: (role: Role) => void }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      <motion.span
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 rounded-full bg-brand/10 px-4 py-1.5 text-sm font-medium text-brand"
      >
        Bem-vindo ao ServiçAi
      </motion.span>
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="text-4xl font-bold tracking-tight sm:text-5xl"
      >
        Você quer ser
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-10 grid w-full gap-5 sm:grid-cols-2"
      >
        <button
          onClick={() => onChoose('CLIENTE')}
          className="group flex flex-col items-center gap-4 rounded-3xl border border-border bg-surface p-10 transition-all hover:-translate-y-1 hover:border-brand hover:shadow-lg"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand transition-colors group-hover:gradient-brand group-hover:text-white">
            <User size={28} />
          </span>
          <span className="text-xl font-bold">Cliente</span>
          <span className="text-sm text-foreground/60">Quero contratar um serviço</span>
        </button>

        <button
          onClick={() => onChoose('PRESTADOR')}
          className="group flex flex-col items-center gap-4 rounded-3xl border border-border bg-surface p-10 transition-all hover:-translate-y-1 hover:border-brand hover:shadow-lg"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand transition-colors group-hover:gradient-brand group-hover:text-white">
            <Building2 size={28} />
          </span>
          <span className="text-xl font-bold">Vendedor</span>
          <span className="text-sm text-foreground/60">Quero oferecer meus serviços</span>
        </button>
      </motion.div>
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 gradient-brand opacity-[0.08]" />
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-4 pb-16 pt-16 text-center sm:pt-20">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight sm:text-5xl"
          >
            O que você está <span className="text-gradient-brand">procurando?</span>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full max-w-2xl"
          >
            <SearchBar large />
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-2"
          >
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/buscar?q=${encodeURIComponent(c.label)}`}
                className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm hover:border-brand hover:text-brand transition-colors"
              >
                {c.emoji} {c.label}
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {data && data.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-2xl font-semibold">
              <Star size={20} className="fill-amber-400 text-amber-400" /> Empresas mais bem avaliadas
            </h2>
            <Link href="/buscar" className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
