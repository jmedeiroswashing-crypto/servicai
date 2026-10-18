'use client';

import { useState } from 'react';
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

export default function ConseguirClientesPage() {
  const [tab, setTab] = useState<Tab>('oportunidades');

  return (
    <div>
      <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16">
        <h1 className="font-display text-3xl text-ink">Conseguir clientes</h1>
        <p className="mt-2 text-foreground-muted">
          Tudo pra fechar o próximo serviço num só lugar: pedidos abertos, encaixes de última hora e busca ativa.
        </p>

        <div className="mt-6 flex gap-1 border-b border-border">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === id ? 'border-ink text-ink' : 'border-transparent text-foreground-muted hover:text-ink'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'oportunidades' && <OportunidadesPage embedded />}
      {tab === 'vagas' && <VagasUltimaHoraPainelPage embedded />}
      {tab === 'prospeccao' && <ProspeccaoPage embedded />}
    </div>
  );
}
