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
  FileText,
  Inbox,
  MessageCircle,
  Star,
  ShieldCheck,
  Lock,
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
      <section className="border-b border-border">
        {/* TESTE VISUAL: imagem completa com card de avaliacao fabricado (Carlos Mendes) -
            NAO e uma avaliacao real, e so pra ver o layout tipo GetNinjas. Trocar depois. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-worker-transparent.png"
          alt="Teste de layout"
          className="mx-auto w-full max-w-2xl"
        />
        <div className="mx-auto max-w-xl px-4 py-10 text-center sm:px-6">
          <SearchBar large />
          <p className="mt-8 text-sm text-foreground-muted">
            Não achou quem procurava?{' '}
            <Link href="/solicitar" className="text-accent hover:underline">
              Publique uma solicitação
            </Link>{' '}
            e deixe os profissionais da sua região virem até você.
          </p>
        </div>
      </section>

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

      <section className="border-t border-border bg-surface-muted">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-2xl text-ink">Como funciona</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: FileText, title: 'Descreva o que precisa', text: 'Preencha o formulário ou converse com a IA — ela monta o pedido pra você.' },
              { icon: Inbox, title: 'Receba propostas', text: 'Prestadores da sua região e categoria enviam valor, prazo e mensagem.' },
              { icon: MessageCircle, title: 'Compare e contrate', text: 'Converse pelo chat, tire dúvidas e escolha quem contratar.' },
              { icon: Star, title: 'Avalie o serviço', text: 'Sua nota ajuda a formar o Score do prestador pra próxima pessoa.' },
            ].map((step, i) => (
              <div key={step.title}>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                    <step.icon size={18} strokeWidth={1.75} />
                  </span>
                  <span className="text-xs font-medium text-foreground-muted">Passo {i + 1}</span>
                </div>
                <h3 className="mt-3 font-medium text-ink">{step.title}</h3>
                <p className="mt-1 text-sm text-foreground-muted">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-2xl text-ink">Por que confiar no ServiçAi</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <div>
              <ShieldCheck size={22} className="text-accent" strokeWidth={1.75} />
              <h3 className="mt-3 font-medium text-ink">Score ServiçAi</h3>
              <p className="mt-1 text-sm text-foreground-muted">
                Calculado a partir de avaliações reais de pontualidade, qualidade, preço e atendimento — não só uma média de estrelas.
              </p>
            </div>
            <div>
              <MessageCircle size={22} className="text-accent" strokeWidth={1.75} />
              <h3 className="mt-3 font-medium text-ink">Converse antes de contratar</h3>
              <p className="mt-1 text-sm text-foreground-muted">
                Chat direto com o prestador pra tirar dúvidas e combinar detalhes antes de fechar negócio.
              </p>
            </div>
            <div>
              <Lock size={22} className="text-accent" strokeWidth={1.75} />
              <h3 className="mt-3 font-medium text-ink">Sua privacidade primeiro</h3>
              <p className="mt-1 text-sm text-foreground-muted">
                Telefone, e-mail e endereço só aparecem pro prestador depois que você decide seguir com a conversa.
              </p>
            </div>
          </div>
        </div>
      </section>
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
