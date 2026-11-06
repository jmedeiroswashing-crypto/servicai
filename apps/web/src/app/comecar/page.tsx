'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Briefcase, Search } from 'lucide-react';
import { MinimalLogo } from '@/components/MinimalLogo';
import { safeNext, withNext } from '@/lib/redirect';

const BUSINESS_OPTIONS = [
  {
    image: '/comecar/gestao.png',
    title: 'Organizar meu negócio',
    description: 'Já tenho clientes e quero cuidar de agenda, receitas e despesas em um só lugar.',
    href: '/cadastro?tipo=PRESTADOR&modo=GESTAO',
  },
  {
    image: '/comecar/completo.png',
    title: 'Organizar e conseguir clientes',
    description: 'Quero as ferramentas de gestão e também receber novos clientes pelo ServiçAi.',
    href: '/cadastro?tipo=PRESTADOR&modo=COMPLETO',
  },
  {
    image: '/comecar/contratacao.png',
    title: 'Só conseguir clientes',
    description: 'Minha rotina já está organizada. Só quero aparecer para novos clientes.',
    href: '/cadastro?tipo=PRESTADOR&modo=CONTRATACAO',
  },
];

const cardClass =
  'group flex items-center gap-4 rounded-card border border-border bg-surface p-4 transition duration-150 hover:-translate-y-0.5 hover:border-accent hover:shadow-soft-md sm:p-5';

function ComecarContent() {
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const isBusiness = params.get('tipo') === 'empresario';

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <MinimalLogo />

      {isBusiness ? (
        <>
          <Link
            href={withNext('/comecar', next)}
            className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-foreground-muted hover:text-ink"
          >
            <ArrowLeft size={14} aria-hidden="true" /> Voltar
          </Link>
          <h1 className="font-display text-3xl text-ink">O que você quer fazer no ServiçAi?</h1>
          <p className="mt-2 text-foreground-muted">Você pode mudar isso depois.</p>
          <div className="mt-8 space-y-3">
            {BUSINESS_OPTIONS.map((option) => (
              <Link key={option.href} href={withNext(option.href, next)} className={cardClass}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={option.image} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover sm:h-20 sm:w-20" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{option.title}</span>
                  <span className="mt-0.5 block text-sm text-foreground-muted">{option.description}</span>
                </span>
                <ArrowRight size={18} aria-hidden="true" className="shrink-0 text-foreground-muted group-hover:text-accent" />
              </Link>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl text-ink">Como você quer usar o ServiçAi?</h1>
          <div className="mt-8 space-y-3">
            <Link href={withNext('/cadastro?tipo=CLIENTE', next)} className={cardClass}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                <Search size={22} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">Quero contratar</span>
                <span className="mt-0.5 block text-sm text-foreground-muted">Encontrar um profissional para resolver algo.</span>
              </span>
              <ArrowRight size={18} aria-hidden="true" className="shrink-0 text-foreground-muted group-hover:text-accent" />
            </Link>
            <Link href={withNext('/comecar?tipo=empresario', next)} className={cardClass}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                <Briefcase size={22} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">Sou empresário</span>
                <span className="mt-0.5 block text-sm text-foreground-muted">Sou profissional autônomo ou tenho uma empresa.</span>
              </span>
              <ArrowRight size={18} aria-hidden="true" className="shrink-0 text-foreground-muted group-hover:text-accent" />
            </Link>
          </div>
        </>
      )}

      <p className="mt-8 text-center text-sm text-foreground-muted">
        Já tem conta?{' '}
        <Link href={withNext('/login', next)} className="font-medium text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}

export default function ComecarPage() {
  return (
    <Suspense fallback={null}>
      <ComecarContent />
    </Suspense>
  );
}
