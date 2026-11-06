'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeDollarSign, CalendarPlus, CircleDollarSign, ClipboardList, Search, Target, User, X, type LucideIcon } from 'lucide-react';
import type { Modulo } from '@/lib/painel/modulos';
import { useBookings, useClientes } from './dados';

type Item = { id: string; grupo: string; nome: string; sub: string; href: string; icone: LucideIcon };

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const NOVOS = [
  { nome: 'Lançar serviço', sub: 'Serviço feito fora do app', href: '/painel/lancar', icone: BadgeDollarSign, financeiro: true },
  { nome: 'Lançar despesa', sub: 'O que saiu do caixa', href: '/painel/despesas#nova', icone: CircleDollarSign, financeiro: true },
  { nome: 'Novo compromisso', sub: 'Marcar na agenda', href: '/painel/agenda', icone: CalendarPlus },
  { nome: 'Definir meta', sub: 'Meta de lucro do mês', href: '/painel/metas', icone: Target, financeiro: true },
];

/** Busca Ctrl+K: telas, ações, clientes e serviços. */
export function Busca({ menu, financeiro, fechar }: { menu: Modulo[]; financeiro: boolean; fechar: () => void }) {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [marcado, setMarcado] = useState(0);
  const campo = useRef<HTMLInputElement>(null);
  const { data: clientes } = useClientes();
  const { data: bookings } = useBookings();

  useEffect(() => campo.current?.focus(), []);

  const itens = useMemo(() => {
    const q = normalizar(texto.trim());
    const bate = (...partes: (string | null | undefined)[]) => !q || normalizar(partes.filter(Boolean).join(' ')).includes(q);
    const lista: Item[] = [];
    NOVOS.filter((n) => (!n.financeiro || financeiro) && bate(n.nome, n.sub)).forEach((n) => lista.push({ id: n.href, grupo: 'Fazer agora', nome: n.nome, sub: n.sub, href: n.href, icone: n.icone }));
    menu.filter((m) => bate(m.nome, m.frase)).forEach((m) => lista.push({ id: m.id, grupo: 'Telas', nome: m.nome, sub: m.frase, href: m.href, icone: m.icone }));
    if (q) {
      (clientes ?? [])
        .filter((c) => bate(c.name, c.phone))
        .slice(0, 5)
        .forEach((c) => lista.push({ id: `c-${c.clientId}`, grupo: 'Clientes', nome: c.name, sub: c.phone ?? 'Sem telefone', href: '/painel/clientes', icone: User }));
      (bookings ?? [])
        .filter((b) => bate(b.client?.name, b.service?.title, b.notes))
        .slice(0, 5)
        .forEach((b) => lista.push({ id: `b-${b.id}`, grupo: 'Serviços', nome: b.client?.name ?? 'Cliente', sub: b.service?.title ?? 'Serviço', href: '/painel/quadro', icone: ClipboardList }));
    }
    // Quem digita "caixa" quer a tela Caixa, não outra que só cita a palavra na descrição.
    const peloNome = (item: Item) => (normalizar(item.nome).includes(q) ? 0 : 1);
    return q ? lista.sort((a, b) => peloNome(a) - peloNome(b)) : lista;
  }, [texto, menu, financeiro, clientes, bookings]);

  const atual = Math.min(marcado, Math.max(itens.length - 1, 0));

  function abrir(item?: Item) {
    if (!item) return;
    fechar();
    router.push(item.href);
  }

  return (
    <div className="e-fundo" onPointerDown={(e) => e.target === e.currentTarget && fechar()}>
      <div className="e-pal" role="dialog" aria-modal="true" aria-label="Buscar ou fazer algo">
        <div className="e-pal-campo">
          <Search size={20} aria-hidden="true" />
          <input
            ref={campo}
            value={texto}
            placeholder="Buscar ou fazer algo"
            aria-label="Buscar ou fazer algo"
            onChange={(e) => {
              setTexto(e.target.value);
              setMarcado(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMarcado(Math.min(atual + 1, itens.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMarcado(Math.max(atual - 1, 0));
              } else if (e.key === 'Enter') {
                abrir(itens[atual]);
              } else if (e.key === 'Escape') {
                fechar();
              }
            }}
          />
          <button type="button" aria-label="Fechar" onClick={fechar}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="e-pal-corpo">
          {itens.length === 0 && <p className="e-pal-vazio">Nada encontrado para “{texto}”.</p>}
          {itens.map((item, i) => (
            <div key={item.id}>
              {(i === 0 || itens[i - 1].grupo !== item.grupo) && <p className="e-pal-grupo">{item.grupo}</p>}
              <button type="button" className={`e-pal-item${i === atual ? ' ativo' : ''}`} onPointerMove={() => setMarcado(i)} onClick={() => abrir(item)}>
                <span>
                  <item.icone size={18} aria-hidden="true" />
                </span>
                <span>
                  <b>{item.nome}</b>
                  <small>{item.sub}</small>
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A folha do "+": o que se faz o tempo todo, a um toque. */
export function FolhaNovo({ financeiro, fechar }: { financeiro: boolean; fechar: () => void }) {
  const router = useRouter();
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [fechar]);
  return (
    <div className="e-fundo" onPointerDown={(e) => e.target === e.currentTarget && fechar()}>
      <div className="e-folha" role="dialog" aria-modal="true" aria-label="O que você quer fazer?">
        <div className="e-folha-topo">
          <h2>O que você quer fazer?</h2>
          <button type="button" aria-label="Fechar" onClick={fechar}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="e-folha-lista">
          {NOVOS.filter((n) => !n.financeiro || financeiro).map((n) => (
            <a
              key={n.href}
              href={n.href}
              onClick={(e) => {
                e.preventDefault();
                fechar();
                router.push(n.href);
              }}
            >
              <span>
                <n.icone size={20} aria-hidden="true" />
              </span>
              <b>{n.nome}</b>
              <small>{n.sub}</small>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
