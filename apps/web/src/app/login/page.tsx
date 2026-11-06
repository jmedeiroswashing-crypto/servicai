'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Briefcase, Search } from 'lucide-react';
import { MinimalLogo } from '@/components/MinimalLogo';
import { safeNext, withNext } from '@/lib/redirect';

function LoginChoice() {
  const next = safeNext(useSearchParams().get('next'));

  const options = [
    {
      href: withNext('/login/cliente', next),
      icon: Search,
      title: 'Sou cliente',
      description: 'Quero encontrar e contratar profissionais.',
    },
    {
      href: withNext('/login/empresario', next),
      icon: Briefcase,
      title: 'Sou empresário',
      description: 'Sou profissional autônomo ou tenho uma empresa.',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <MinimalLogo />
      <h1 className="font-display text-2xl text-ink">Como você quer entrar?</h1>
      <div className="mt-6 space-y-3">
        {options.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={title}
            href={href}
            className="group flex items-center gap-4 rounded-card border border-border bg-surface p-5 transition duration-150 hover:-translate-y-0.5 hover:border-accent hover:shadow-soft-md"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
              <Icon size={22} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{title}</span>
              <span className="mt-0.5 block text-sm text-foreground-muted">{description}</span>
            </span>
            <ArrowRight size={18} aria-hidden="true" className="shrink-0 text-foreground-muted group-hover:text-accent" />
          </Link>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-foreground-muted">
        Ainda não tem conta?{' '}
        <Link href={withNext('/comecar', next)} className="font-medium text-accent hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginChoice />
    </Suspense>
  );
}
