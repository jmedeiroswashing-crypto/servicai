'use client';

import { useState } from 'react';
import { CalendarCheck, FileText, Handshake, Inbox, MessageCircle, UserRoundPlus } from 'lucide-react';

const STEPS = {
  cliente: [
    { icon: FileText, title: 'Conte o que precisa', text: 'Busque um profissional ou publique seu pedido. A IA ajuda a montar.' },
    { icon: Inbox, title: 'Receba propostas', text: 'Profissionais da sua região enviam valor, prazo e mensagem.' },
    { icon: MessageCircle, title: 'Converse e contrate', text: 'Tire dúvidas pelo chat, escolha e avalie depois do serviço.' },
  ],
  prestador: [
    { icon: UserRoundPlus, title: 'Monte seu perfil', text: 'Adicione foto, profissão e categorias para aparecer nas buscas.' },
    { icon: Handshake, title: 'Envie propostas', text: 'Veja pedidos compatíveis com seus serviços e sua cidade.' },
    { icon: CalendarCheck, title: 'Organize o negócio', text: 'Controle agenda, entradas, saídas e metas em um só lugar.' },
  ],
};

type Audience = keyof typeof STEPS;

const TABS: { id: Audience; label: string }[] = [
  { id: 'cliente', label: 'Sou cliente' },
  { id: 'prestador', label: 'Sou prestador' },
];

export function HowItWorks() {
  const [audience, setAudience] = useState<Audience>('cliente');

  return (
    <section id="como-funciona" aria-labelledby="como-funciona-titulo" className="scroll-mt-20 bg-surface-muted">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="como-funciona-titulo" className="font-display text-title text-ink">
            Como funciona
          </h2>
          <div role="group" aria-label="Escolha seu perfil" className="flex rounded-pill border border-border bg-surface p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={audience === tab.id}
                onClick={() => setAudience(tab.id)}
                className={`min-h-11 flex-1 rounded-pill px-4 text-sm font-semibold transition-colors duration-150 sm:flex-none ${
                  audience === tab.id ? 'bg-accent text-on-accent' : 'text-foreground-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS[audience].map((step, index) => (
            <li key={step.title} className="rounded-card bg-surface p-6 shadow-soft-sm">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
                <step.icon size={28} aria-hidden="true" />
              </span>
              <p className="mt-4 text-sm font-medium text-foreground-muted">Passo {index + 1}</p>
              <h3 className="mt-1 text-lg font-semibold text-ink">{step.title}</h3>
              <p className="mt-1 text-sm text-foreground-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
