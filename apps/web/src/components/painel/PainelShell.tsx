'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Grip, Home, LogOut, Plus, ReceiptText, Search } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { hoje } from '@/lib/painel/periodo';
import { ABERTOS, atrasado } from '@/lib/painel/numeros';
import { GRUPOS, menuDe, moduloDaRota, temFinanceiro, type Grupo } from '@/lib/painel/modulos';
import { loginUrl } from '@/lib/redirect';
import { hasSession, useAuthStore } from '@/store/auth-store';
import { Busca, FolhaNovo } from './Busca';
import { useBookings, useIntervalo, useProvider } from './dados';
import { Esqueleto } from './pecas';
import { Topo } from './Topo';
import { Tour } from './Tour';

type Tema = 'escuro' | 'claro';
const CHAVE_TEMA = 'servicai:painel-tema';
const ouvintesTema = new Set<() => void>();

function lerTema(): Tema {
  try {
    return localStorage.getItem(CHAVE_TEMA) === 'claro' ? 'claro' : 'escuro';
  } catch {
    return 'escuro';
  }
}

function salvarTema(tema: Tema) {
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    // Sem armazenamento, o tema volta ao padrão na próxima visita.
  }
  ouvintesTema.forEach((f) => f());
}

function useTema() {
  return useSyncExternalStore(
    (f) => {
      ouvintesTema.add(f);
      return () => ouvintesTema.delete(f);
    },
    lerTema,
    () => 'escuro' as Tema,
  );
}

const semAssinatura = () => () => {};

/** O HTML estático não conhece sessão nem data: o conteúdo só aparece no navegador. */
const useNoNavegador = () => useSyncExternalStore(semAssinatura, () => true, () => false);

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

/** Número pequeno ao lado do item do menu: o que está esperando alguém. */
function useContadores() {
  const { data: bookings } = useBookings();
  return useMemo(() => {
    const lista = bookings ?? [];
    const h = hoje();
    const atrasados = lista.filter((b) => atrasado(b, h)).length;
    const novos = lista.filter((b) => b.status === 'SOLICITADO').length;
    const n = atrasados || novos;
    return { quadro: n ? { n, ok: !atrasados, t: atrasados ? `Atrasados: ${atrasados}` : `Pedidos novos: ${novos}` } : null };
  }, [bookings]);
}

export function PainelShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const noNavegador = useNoNavegador();
  const tema = useTema();
  const { user, logout } = useAuthStore();
  const [busca, setBusca] = useState(false);
  const [novo, setNovo] = useState(false);

  useEffect(() => {
    if (!hasSession()) router.push(loginUrl());
    else if (user && user.role !== 'PRESTADOR') router.push('/');
  }, [user, router]);

  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setBusca(true);
      }
    };
    document.addEventListener('keydown', atalho);
    return () => document.removeEventListener('keydown', atalho);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const fecharBusca = useCallback(() => setBusca(false), []);
  const fecharNovo = useCallback(() => setNovo(false), []);

  const pronto = noNavegador && !!user && user.role === 'PRESTADOR';

  return (
    <div className="escala" data-tema={noNavegador ? tema : 'escuro'}>
      {pronto ? (
        <Moldura
          key="moldura"
          pathname={pathname}
          tema={tema}
          busca={busca}
          novo={novo}
          abrirBusca={() => setBusca(true)}
          abrirNovo={() => setNovo(true)}
          fecharBusca={fecharBusca}
          fecharNovo={fecharNovo}
          sair={() => {
            logout();
            queryClient.clear();
            router.push('/');
          }}
        >
          {children}
        </Moldura>
      ) : (
        <div className="e-trabalho" style={{ paddingTop: 32 }}>
          <Esqueleto />
        </div>
      )}
    </div>
  );
}

function Moldura({
  pathname,
  tema,
  busca,
  novo,
  abrirBusca,
  abrirNovo,
  fecharBusca,
  fecharNovo,
  sair,
  children,
}: {
  pathname: string;
  tema: Tema;
  busca: boolean;
  novo: boolean;
  abrirBusca: () => void;
  abrirNovo: () => void;
  fecharBusca: () => void;
  fecharNovo: () => void;
  sair: () => void;
  children: ReactNode;
}) {
  const user = useAuthStore((s) => s.user)!;
  const modo = user.businessMode;
  const financeiro = temFinanceiro(modo);
  const menu = useMemo(() => menuDe(modo), [modo]);
  const modulo = moduloDaRota(pathname);
  const rota = pathname.replace(/\/$/, '') || '/';
  const { data: provider } = useProvider();
  const iv = useIntervalo();
  const contadores = useContadores();
  const { data: bookings } = useBookings();

  const empresa = {
    nome: user.name,
    local: provider ? [provider.specialty, provider.city].filter(Boolean).join(' · ') : 'Prestador',
    avatar: provider?.user.avatarUrl,
  };

  const comPeriodo = !!modulo?.periodo && (modulo.id !== 'inicio' || financeiro);
  const ehInicio = modulo?.id === 'inicio';
  const hojeTexto = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' });
  const abertos = (bookings ?? []).filter((b) => ABERTOS.includes(b.status)).length;

  const titulo = ehInicio ? `${saudacao()}, ${user.name.split(' ')[0]}` : rota === '/painel/mais' ? 'Tudo do painel' : (modulo?.nome ?? 'Painel');
  const sub = ehInicio
    ? financeiro
      ? `${hojeTexto}. ${iv.rotulo}.`
      : `${hojeTexto}. ${abertos} ${abertos === 1 ? 'serviço aberto' : 'serviços abertos'}.`
    : rota === '/painel/mais'
      ? 'Todas as partes do seu negócio em um lugar.'
      : comPeriodo
        ? `${modulo?.frase} ${iv.rotulo}.`
        : modulo?.frase;
  const acao = ehInicio && !financeiro ? { href: '/painel/quadro', nome: 'Ver quadro' } : modulo?.acao;

  const grupos = (Object.keys(GRUPOS) as Grupo[]).map((g) => ({ g, itens: menu.filter((m) => m.grupo === g) }));
  // As telas que vieram do painel antigo seguem com a lógica delas, no desenho novo.
  const legado = !!modulo && ['caixa', 'calendario', 'clientes', 'agenda', 'conseguir', 'perfil', 'plano'].includes(modulo.id);
  const naBarra = rota === '/painel' || rota === '/painel/quadro' || rota === '/painel/feitos';

  return (
    <div className="e-casca">
      <aside className="e-lado" aria-label="Menu do painel" data-tour="menu">
        <Link href="/painel" aria-label="ServiçAi, início do painel" className="e-marca">
          <Logo onDark />
        </Link>
        <div className="e-empresa">
          <span className="e-avatar">
            {empresa.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={empresa.avatar} alt="" />
            ) : (
              empresa.nome.slice(0, 1).toUpperCase()
            )}
          </span>
          <span>
            <b>{empresa.nome}</b>
            <small>{empresa.local}</small>
          </span>
        </div>
        <button type="button" className="e-lado-busca" onClick={abrirBusca} data-tour="busca">
          <Search size={18} aria-hidden="true" />
          <span>Buscar ou fazer algo</span>
          <kbd>Ctrl K</kbd>
        </button>
        <nav className="e-lado-nav">
          {grupos.map(({ g, itens }) =>
            itens.length ? (
              <div key={g} className="e-lado-grupo">
                <p>{GRUPOS[g]}</p>
                {itens.map((m) => {
                  const cont = m.id === 'quadro' ? contadores.quadro : null;
                  return (
                    <Link key={m.id} className="e-lado-item" href={m.href} aria-current={modulo?.id === m.id ? 'page' : undefined}>
                      <m.icone size={18} aria-hidden="true" />
                      <span>{m.nome}</span>
                      {cont && (
                        <span className={`e-cnt${cont.ok ? ' ok' : ''}`} title={cont.t}>
                          {cont.n}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : null,
          )}
        </nav>
        <div className="e-lado-pe">
          <span className="e-avatar" aria-hidden="true">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <span>
            <b>{user.name}</b>
            <small>
              <Link href="/" className="underline">
                Ver o site
              </Link>
            </small>
          </span>
          <button type="button" className="e-sair" aria-label="Sair da conta" onClick={sair}>
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <main className="e-trabalho" id="conteudo">
        <Topo
          titulo={titulo}
          sub={sub}
          modulo={modulo}
          comPeriodo={comPeriodo}
          acao={acao}
          perfilPublico={provider ? `/prestador?id=${provider.id}` : undefined}
          empresa={empresa}
          tema={tema}
          trocarTema={() => salvarTema(tema === 'escuro' ? 'claro' : 'escuro')}
          abrirBusca={abrirBusca}
          abrirNovo={abrirNovo}
        />
        <div className={`e-corpo${legado ? ' e-legado' : ''}`}>{children}</div>
      </main>

      <nav className="e-baixo" aria-label="Menu principal" data-tour="menu-cel">
        <Link href="/painel" aria-current={rota === '/painel' ? 'page' : undefined}>
          <Home size={22} aria-hidden="true" />
          Início
        </Link>
        <Link href={financeiro ? '/painel/feitos' : '/painel/agenda'} aria-current={rota === '/painel/feitos' || (!financeiro && rota === '/painel/agenda') ? 'page' : undefined}>
          <ReceiptText size={22} aria-hidden="true" />
          {financeiro ? 'Feitos' : 'Agenda'}
        </Link>
        <button type="button" aria-label="Novo: serviço, despesa, compromisso" onClick={abrirNovo} data-tour="novo-cel">
          <Plus size={24} aria-hidden="true" />
        </button>
        <Link href="/painel/quadro" aria-current={rota === '/painel/quadro' ? 'page' : undefined}>
          <ClipboardList size={22} aria-hidden="true" />
          Quadro
        </Link>
        <Link href="/painel/mais" aria-current={!naBarra ? 'page' : undefined}>
          <Grip size={22} aria-hidden="true" />
          Mais
        </Link>
      </nav>

      {busca && <Busca menu={menu} financeiro={financeiro} fechar={fecharBusca} />}
      {novo && <FolhaNovo financeiro={financeiro} fechar={fecharNovo} />}
      <Tour />
    </div>
  );
}
