'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CircleHelp, ExternalLink, Moon, Plus, Search, Sun } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { serie } from '@/lib/painel/numeros';
import type { Modulo } from '@/lib/painel/modulos';
import { OPCOES, mudarPeriodo, somaDias, usePeriodo } from '@/lib/painel/periodo';
import { caminhoCurva } from './pecas';
import { useExpenses, useIncomes, useIntervalo } from './dados';

function usePopover() {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false);
    };
    document.addEventListener('pointerdown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);
  return { aberto, setAberto, ref };
}

function Ajuda({ modulo }: { modulo: Modulo }) {
  const { aberto, setAberto, ref } = usePopover();
  return (
    <div className="e-pop-ancora" ref={ref}>
      <button type="button" className="e-icone-bt" aria-label={`Ajuda: ${modulo.nome}`} aria-expanded={aberto} onClick={() => setAberto(!aberto)} data-tour="ajuda">
        <CircleHelp size={20} aria-hidden="true" />
      </button>
      {aberto && (
        <div className="e-pop" role="dialog" aria-label={`Ajuda: ${modulo.nome}`}>
          <p className="e-pop-t">{modulo.nome}</p>
          <p>{modulo.frase}</p>
          <ul>
            {modulo.ajuda.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <p className="e-pop-pe">
            Atalho: <kbd>Ctrl</kbd> + <kbd>K</kbd> busca qualquer coisa. Dúvidas? <Link href="/ajuda" className="underline">Central de ajuda</Link>.
          </p>
        </div>
      )}
    </div>
  );
}

function Seletor() {
  const p = usePeriodo();
  const iv = useIntervalo();
  const { aberto, setAberto, ref } = usePopover();
  const [de, setDe] = useState(iv.de);
  const [ate, setAte] = useState(iv.ate);
  return (
    <div className="e-periodo-linha" ref={ref}>
      <div className="e-periodo" role="group" aria-label="Período" data-tour="periodo">
        {OPCOES.map((o) => (
          <button key={o.tipo} type="button" aria-pressed={p.tipo === o.tipo} onClick={() => mudarPeriodo({ tipo: o.tipo })}>
            {o.nome}
          </button>
        ))}
        <button type="button" aria-pressed={p.tipo === 'livre'} aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
          <CalendarDays size={15} aria-hidden="true" />
          {p.tipo === 'livre' ? iv.rotulo.replace('De ', '') : 'Escolher'}
        </button>
      </div>
      {aberto && (
        <form
          className="e-pop e-pop--esq e-form"
          aria-label="Escolher as datas"
          onSubmit={(e) => {
            e.preventDefault();
            mudarPeriodo({ tipo: 'livre', de, ate: ate < de ? de : ate });
            setAberto(false);
          }}
        >
          <p className="e-pop-t">Escolher as datas</p>
          <label className="e-campo">
            De
            <input type="date" value={de} max={ate} onChange={(e) => setDe(e.target.value)} required />
          </label>
          <label className="e-campo">
            Até
            <input type="date" value={ate} min={de} onChange={(e) => setAte(e.target.value)} required />
          </label>
          <button type="submit" className="e-bt e-bt--forte">
            Ver esse período
          </button>
        </form>
      )}
    </div>
  );
}

function Curva() {
  const iv = useIntervalo();
  const { data: incomes } = useIncomes();
  const { data: expenses } = useExpenses();
  const { atual, anterior } = useMemo(() => {
    const entradas = incomes ?? [];
    const saidas = expenses ?? [];
    // Um dia só não faz curva: mostra a semana que termina nele.
    const de = iv.dias < 7 ? somaDias(iv.ate, -6) : iv.de;
    const deAnt = iv.dias < 7 ? somaDias(iv.ant.ate, -6) : iv.ant.de;
    const a = serie(entradas, saidas, de, iv.ate).pontos.map((x) => x.fat);
    const b = iv.comparacao ? serie(entradas, saidas, deAnt, iv.ant.ate).pontos.map((x) => x.fat) : [];
    const teto = Math.max(1, ...a, ...b) * 1.08;
    return { atual: caminhoCurva(a, teto), anterior: b.length > 1 ? caminhoCurva(b, teto) : '' };
  }, [iv, incomes, expenses]);
  return (
    <div className="e-curva-caixa" aria-hidden="true">
      <svg className="e-curva" viewBox="0 0 100 40" preserveAspectRatio="none">
        <path className="area" d={`${atual}L100 40L0 40Z`} />
        {anterior && <path className="anterior" d={anterior} />}
        <path className="traco" d={atual} />
      </svg>
    </div>
  );
}

export type DadosTopo = {
  titulo: string;
  sub?: string;
  modulo?: Modulo;
  comPeriodo: boolean;
  acao?: { href: string; nome: string };
  perfilPublico?: string;
  empresa: { nome: string; local: string; avatar?: string | null };
  tema: 'escuro' | 'claro';
  trocarTema: () => void;
  abrirBusca: () => void;
  abrirNovo: () => void;
};

export function Topo(d: DadosTopo) {
  return (
    <header className={`e-topo${d.comPeriodo ? '' : ' e-topo--baixo'}`}>
      {d.comPeriodo && <Curva />}
      <div className="so-cel e-cel-topo">
        <span className="e-empresa">
          <span className="e-avatar">{d.empresa.nome.slice(0, 1).toUpperCase()}</span>
          <span>
            <b>{d.empresa.nome}</b>
            <small>{d.empresa.local}</small>
          </span>
        </span>
        <button type="button" className="e-icone-bt" aria-label="Buscar ou fazer algo" onClick={d.abrirBusca} data-tour="busca-cel">
          <Search size={20} aria-hidden="true" />
        </button>
      </div>
      <div className="e-topo-linha">
        <div className="e-topo-titulo">
          <h1>{d.titulo}</h1>
          {d.sub && <p className="e-sub">{d.sub}</p>}
        </div>
        <div className="e-topo-acoes">
          {d.acao && (
            <Link className="e-bt-branco" href={d.acao.href}>
              <Plus size={18} aria-hidden="true" />
              {d.acao.nome}
            </Link>
          )}
          {d.perfilPublico && (
            <Link className="e-bt-vidro so-pc" href={d.perfilPublico} target="_blank">
              <ExternalLink size={17} aria-hidden="true" />
              Ver meu perfil
            </Link>
          )}
          {d.modulo && <Ajuda modulo={d.modulo} />}
          <button type="button" className="e-icone-bt" aria-label={d.tema === 'escuro' ? 'Usar o tema claro' : 'Usar o tema escuro'} onClick={d.trocarTema}>
            {d.tema === 'escuro' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
          </button>
          <NotificationBell />
          <button type="button" className="e-icone-bt so-pc" aria-label="Novo: serviço, despesa, compromisso" onClick={d.abrirNovo} data-tour="novo">
            <Plus size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
      {d.comPeriodo && <Seletor />}
    </header>
  );
}
