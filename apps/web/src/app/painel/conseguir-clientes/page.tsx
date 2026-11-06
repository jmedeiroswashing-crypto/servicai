'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Sparkles, Zap, Target } from 'lucide-react';
import OportunidadesPage from '../oportunidades/page';
import VagasUltimaHoraPainelPage from '../vagas-ultima-hora/page';
import ProspeccaoPage from '../prospeccao/page';

type Tab = 'oportunidades' | 'vagas' | 'prospeccao';

const TABS: { id: Tab; label: string; icon: typeof Sparkles }[] = [
  { id: 'oportunidades', label: 'Oportunidades', icon: Sparkles },
  { id: 'vagas', label: 'Vagas de última hora', icon: Zap },
  { id: 'prospeccao', label: 'Prospecção', icon: Target },
];

function ConseguirClientesContent() {
  const aba = useSearchParams().get('aba');
  const tab: Tab = TABS.some((t) => t.id === aba) ? (aba as Tab) : 'oportunidades';

  return (
    <div>
      <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16">
        <h1 className="font-display text-3xl text-ink">Conseguir clientes</h1>
        <p className="mt-2 text-foreground-muted">
          Tudo pra fechar o próximo serviço num só lugar: pedidos abertos, encaixes de última hora e busca ativa.
        </p>

        <div className="mt-6 flex gap-1 border-b border-border">
          {TABS.map(({ id, label, icon: Icon }) => (
            <Link
              key={id}
              href={`/painel/conseguir-clientes?aba=${id}`}
              scroll={false}
              aria-current={tab === id ? 'page' : undefined}
              className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 border-b-2 px-2 py-2 text-center text-sm font-medium transition-colors sm:flex-none sm:px-4 ${
                tab === id ? 'border-accent text-ink' : 'border-transparent text-foreground-muted hover:text-ink'
              }`}
            >
              <Icon size={15} className="hidden shrink-0 sm:block" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
      </div>

      {tab === 'oportunidades' && <OportunidadesPage embedded />}
      {tab === 'vagas' && <VagasUltimaHoraPainelPage embedded />}
      {tab === 'prospeccao' && <ProspeccaoPage embedded />}
    </div>
  );
}

export default function ConseguirClientesPage() {
  return (
    <Suspense fallback={null}>
      <ConseguirClientesContent />
    </Suspense>
  );
}
