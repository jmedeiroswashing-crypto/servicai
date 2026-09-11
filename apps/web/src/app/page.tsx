'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Video, BrainCircuit, Wallet, ArrowRight } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { ProviderCard } from '@/components/ProviderCard';
import { CATEGORIES } from '@/lib/categories';
import { api } from '@/lib/api';
import type { ProviderProfile } from '@/lib/types';

const PILLARS = [
  {
    icon: ShieldCheck,
    title: 'Confiança',
    description: 'Identidade verificada, avaliações autenticadas, garantia digital e pagamento protegido.',
  },
  {
    icon: Video,
    title: 'Conteúdo',
    description: 'Vídeos, antes e depois, portfólio e bastidores para você ver o trabalho antes de contratar.',
  },
  {
    icon: BrainCircuit,
    title: 'Inteligência',
    description: 'IA para busca, orçamento automático, recomendações e prevenção de fraudes.',
  },
];

export default function HomePage() {
  const { data } = useQuery({
    queryKey: ['providers', 'featured'],
    queryFn: async () => {
      const res = await api.get<ProviderProfile[]>('/providers', { params: { take: 8 } });
      return res.data;
    },
  });

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 gradient-brand opacity-[0.08]" />
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 pb-20 pt-16 text-center sm:pt-24">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-full bg-brand/10 px-4 py-1.5 text-sm font-medium text-brand"
          >
            Contratação de serviços, potencializada por IA
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl font-bold tracking-tight sm:text-6xl"
          >
            Encontre o profissional certo <span className="text-gradient-brand">em minutos</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl text-lg text-foreground/60"
          >
            Do eletricista ao advogado, do salão à clínica — conecte-se a empresas e autônomos verificados,
            com reputação digital real e negociação protegida do início ao fim.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
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
            {CATEGORIES.slice(0, 8).map((c) => (
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

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border bg-surface p-6"
            >
              <p.icon className="mb-4 text-brand" size={28} />
              <h3 className="mb-2 text-lg font-semibold">{p.title}</h3>
              <p className="text-sm text-foreground/60">{p.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {data && data.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Profissionais em destaque</h2>
            <Link href="/buscar" className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-center gap-6 rounded-3xl gradient-brand p-10 text-center text-white sm:p-16">
          <Wallet size={32} />
          <h2 className="text-3xl font-bold">É prestador de serviço?</h2>
          <p className="max-w-xl text-white/85">
            Publique seu perfil, mostre seu trabalho com fotos e vídeos, receba avaliações verificadas e
            aumente sua renda com a ajuda da nossa IA.
          </p>
          <Link
            href="/cadastro?tipo=PRESTADOR"
            className="rounded-full bg-white px-6 py-3 font-semibold text-brand transition-transform hover:scale-[1.03]"
          >
            Criar perfil profissional
          </Link>
        </div>
      </section>
    </div>
  );
}
