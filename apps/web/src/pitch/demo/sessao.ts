/**
 * Fala com a API local de verdade (as mesmas rotas do app) e prepara o
 * localStorage que o app lê ao carregar. O app guarda a sessão numa chave só
 * (`servicai-auth`, store do zustand), então cada iframe é carregado logo depois de
 * gravarmos a sessão dele: o cliente e o eletricista ficam logados ao mesmo tempo,
 * cada um na memória do próprio iframe.
 */
import { DEMO_CONTAS } from '../pitch-dados';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

/**
 * A demo só roda contra a API local (Postgres local + seed do pitch). Se o site for
 * publicado apontando para a API de produção, o pitch nem tenta logar: usa o vídeo.
 */
export const API_E_LOCAL = ['localhost', '127.0.0.1'].includes(new URL(API_URL).hostname);

export interface Sessao {
  token: string;
  user: { id: string; email: string; role: 'CLIENTE' | 'PRESTADOR' | 'ADMIN'; name: string; businessMode?: string | null };
}

export async function apiNoAr(timeoutMs = 2500): Promise<boolean> {
  try {
    const r = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
    return r.ok;
  } catch {
    return false;
  }
}

async function chamar<T>(caminho: string, opcoes: { token?: string; corpo?: unknown; metodo?: string } = {}): Promise<T> {
  const r = await fetch(`${API_URL}${caminho}`, {
    method: opcoes.metodo ?? (opcoes.corpo ? 'POST' : 'GET'),
    headers: {
      ...(opcoes.corpo ? { 'Content-Type': 'application/json' } : {}),
      ...(opcoes.token ? { Authorization: `Bearer ${opcoes.token}` } : {}),
    },
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`${caminho}: HTTP ${r.status}`);
  return (await r.json()) as T;
}

/**
 * Login de verdade. A API limita a 10 logins por minuto: se ela responder 429
 * (pitch recarregado várias vezes seguidas), espera e tenta de novo por até 70 s.
 */
export async function entrar(conta: { email: string; senha: string }, aoEsperar?: () => void): Promise<Sessao> {
  const limite = Date.now() + 70_000;
  for (;;) {
    try {
      const r = await chamar<{ accessToken: string; user: Sessao['user'] }>('/auth/login', {
        corpo: { email: conta.email, password: conta.senha },
      });
      return { token: r.accessToken, user: r.user };
    } catch (e) {
      if (!(e instanceof Error) || !e.message.includes('HTTP 429') || Date.now() > limite) throw e;
      aoEsperar?.();
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

const CHAVE_SESSOES = 'servicai-pitch:sessoes';

/** Reaproveita a sessão guardada se o token ainda vale (depois de um seed, não vale mais). */
async function sessaoGuardada(papel: 'cliente' | 'eletricista', email: string): Promise<Sessao | null> {
  try {
    const guardadas = JSON.parse(localStorage.getItem(CHAVE_SESSOES) ?? '{}') as Record<string, Sessao>;
    const s = guardadas[papel];
    if (!s || s.user.email !== email) return null;
    await chamar('/users/me', { token: s.token });
    return s;
  } catch {
    return null;
  }
}

export const api = {
  get: <T>(caminho: string, s?: Sessao) => chamar<T>(caminho, { token: s?.token }),
  post: <T>(caminho: string, corpo: unknown, s?: Sessao) => chamar<T>(caminho, { token: s?.token, corpo }),
  patch: <T>(caminho: string, corpo: unknown, s?: Sessao) => chamar<T>(caminho, { token: s?.token, corpo, metodo: 'PATCH' }),
};

/** Grava no localStorage o que o app precisa encontrar ao carregar dentro do iframe. */
export function gravarSessaoDoApp(sessao: Sessao | null): void {
  const estado = sessao ? { token: sessao.token, user: sessao.user } : { token: null, user: null };
  localStorage.setItem('servicai-auth', JSON.stringify({ state: estado, version: 0 }));
  // Cidade do topo do site: é ela que a busca usa quando a frase não diz a cidade.
  localStorage.setItem('servicai-city', JSON.stringify({ state: { city: DEMO_CONTAS.cidade }, version: 0 }));
  // Tour de primeira visita e tema do painel: sem eles, um aviso cobriria a demo.
  localStorage.setItem('servicai:painel-tour', '1');
  localStorage.setItem('servicai:painel-tema', 'claro');
}

export async function entrarNasDuasContas(aoEsperar?: () => void): Promise<{ cliente: Sessao; eletricista: Sessao }> {
  const [cliente, eletricista] = await Promise.all(
    (['cliente', 'eletricista'] as const).map(
      async (papel) =>
        (await sessaoGuardada(papel, DEMO_CONTAS[papel].email)) ?? (await entrar(DEMO_CONTAS[papel], aoEsperar)),
    ),
  );
  localStorage.setItem(CHAVE_SESSOES, JSON.stringify({ cliente, eletricista }));
  return { cliente, eletricista };
}

/** Uma oportunidade como `GET /requests/matches` devolve ao prestador. */
export type Oportunidade = Record<string, unknown> & {
  id: string;
  category: string;
  title: string;
  description: string;
  alreadyProposed: boolean;
};
