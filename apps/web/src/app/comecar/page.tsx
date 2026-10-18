'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { MinimalLogo } from '@/components/MinimalLogo';

const OPTIONS = [
  {
    id: 'cliente',
    title: 'Contratar serviços',
    description: 'Quero encontrar e contratar um profissional pra resolver algo.',
    image: '/comecar/contratar.png',
    href: '/cadastro?tipo=CLIENTE',
  },
  {
    id: 'gestao',
    title: 'Gestão inteligente do meu negócio',
    description: 'Já tenho clientes — quero organizar agenda, receita e despesas num só lugar.',
    image: '/comecar/gestao.png',
    href: '/cadastro?tipo=PRESTADOR&modo=GESTAO',
  },
  {
    id: 'completo',
    title: 'Gestão inteligente e contratação dos meus serviços',
    description: 'Quero organizar meu negócio e também receber novos clientes pelo ServiçAi.',
    image: '/comecar/completo.png',
    href: '/cadastro?tipo=PRESTADOR&modo=COMPLETO',
  },
];

export default function ComecarPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
      <MinimalLogo />

      <h1 className="font-display text-3xl text-ink">Qual seu objetivo com o ServiçAi?</h1>
      <p className="mt-2 text-foreground-muted">Isso ajuda a montar a experiência certa pra você.</p>

      <div className="mt-10 space-y-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => router.push(opt.href)}
            className="group flex w-full items-center justify-between gap-4 border border-border p-4 text-left transition-colors hover:border-ink sm:p-5"
          >
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={opt.image}
                alt=""
                className="h-16 w-16 shrink-0 rounded-lg object-cover transition-transform group-hover:scale-[1.03] sm:h-20 sm:w-20"
              />
              <div>
                <p className="font-medium text-ink">{opt.title}</p>
                <p className="mt-0.5 text-sm text-foreground-muted">{opt.description}</p>
              </div>
            </div>
            <ArrowRight size={18} className="shrink-0 text-foreground-muted/50 transition-colors group-hover:text-ink" />
          </button>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-foreground-muted">
        Já tem conta?{' '}
        <button onClick={() => router.push('/login')} className="font-medium text-accent hover:underline">
          Entrar
        </button>
      </p>
    </div>
  );
}
