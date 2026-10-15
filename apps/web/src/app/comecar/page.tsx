'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, Search, Wallet, Briefcase } from 'lucide-react';

const OPTIONS = [
  {
    id: 'cliente',
    title: 'Contratar serviços',
    description: 'Quero encontrar e contratar um profissional pra resolver algo.',
    icon: Search,
    href: '/cadastro?tipo=CLIENTE',
  },
  {
    id: 'gestao',
    title: 'Gestão inteligente do meu negócio',
    description: 'Já tenho clientes — quero organizar agenda, receita e despesas num só lugar.',
    icon: Wallet,
    href: '/cadastro?tipo=PRESTADOR&modo=GESTAO',
  },
  {
    id: 'completo',
    title: 'Gestão inteligente e contratação dos meus serviços',
    description: 'Quero organizar meu negócio e também receber novos clientes pelo ServiçAi.',
    icon: Briefcase,
    href: '/cadastro?tipo=PRESTADOR&modo=COMPLETO',
  },
];

export default function ComecarPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="font-display text-3xl text-ink">Qual seu objetivo com o ServiçAi?</h1>
      <p className="mt-2 text-foreground-muted">Isso ajuda a montar a experiência certa pra você.</p>

      <div className="mt-10 space-y-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => router.push(opt.href)}
            className="group flex w-full items-center justify-between gap-4 border border-border p-5 text-left transition-colors hover:border-ink"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-border bg-surface-muted text-foreground-muted group-hover:border-ink group-hover:text-ink">
                <opt.icon size={18} />
              </div>
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
