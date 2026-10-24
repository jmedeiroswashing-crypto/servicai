'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { MinimalLogo } from '@/components/MinimalLogo';

const SPLASH_VISIBLE_MS = 1800;
const SPLASH_TRANSITION_MS = 400;

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
  {
    id: 'contratacao',
    title: 'Contratação dos meus serviços',
    description: 'Já tenho minha rotina organizada — só quero aparecer e receber novos clientes pelo ServiçAi.',
    image: '/comecar/contratacao.png',
    href: '/cadastro?tipo=PRESTADOR&modo=CONTRATACAO',
  },
];

/**
 * Transição básica: entra com fade+leve zoom, fica parada um instante, sai
 * com fade — só pra marcar a passagem de uma área (abertura) pra outra
 * (perguntas). Clicável pra quem não quiser esperar.
 */
function Splash({ onDone }: { onDone: () => void }) {
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const enterFrame = requestAnimationFrame(() => setEntered(true));
    const leaveTimer = setTimeout(() => setLeaving(true), SPLASH_VISIBLE_MS);
    const doneTimer = setTimeout(onDone, SPLASH_VISIBLE_MS + SPLASH_TRANSITION_MS);
    return () => {
      cancelAnimationFrame(enterFrame);
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  function skip() {
    setLeaving(true);
    setTimeout(onDone, SPLASH_TRANSITION_MS);
  }

  return (
    <button
      onClick={skip}
      aria-label="Pular introdução"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-ink transition-opacity duration-[400ms] ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/comecar/splash.png"
        alt="ServiçAi — Conectando pessoas a soluções"
        className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ease-out ${
          entered && !leaving ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
        }`}
      />
    </button>
  );
}

export default function ComecarPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <Splash onDone={() => setShowSplash(false)} />;
  }

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
