/**
 * Controle do app real dentro de um iframe da mesma origem: digita nos campos de
 * verdade, clica nos botões de verdade e espera a tela responder. Nada aqui
 * simula resultado: o que aparece vem do app e da API.
 */
import { gravarSessaoDoApp, type Sessao } from './sessao';

export class DemoCancelada extends Error {
  constructor() {
    super('demo cancelada');
  }
}

export function checar(sinal: AbortSignal): void {
  if (sinal.aborted) throw new DemoCancelada();
}

export function pausa(ms: number, sinal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (sinal.aborted) return reject(new DemoCancelada());
    const t = setTimeout(resolve, Math.max(0, ms));
    sinal.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DemoCancelada());
    }, { once: true });
  });
}

/** Espera `teste` devolver algo verdadeiro (checa a cada 60 ms). */
export async function esperar<T>(
  teste: () => T | null | undefined | false,
  sinal: AbortSignal,
  timeoutMs = 10_000,
  descricao = 'elemento',
): Promise<T> {
  const fim = Date.now() + timeoutMs;
  for (;;) {
    checar(sinal);
    let valor: T | null | undefined | false = null;
    try {
      valor = teste();
    } catch {
      valor = null;
    }
    if (valor) return valor;
    if (Date.now() > fim) throw new Error(`Demo: não encontrei ${descricao} a tempo.`);
    await pausa(60, sinal);
  }
}

export function porTexto<T extends HTMLElement = HTMLElement>(
  raiz: ParentNode | null | undefined,
  seletor: string,
  texto: string | RegExp,
): T | null {
  if (!raiz) return null;
  const lista = Array.from(raiz.querySelectorAll<T>(seletor));
  return (
    lista.find((el) => {
      const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      return typeof texto === 'string' ? t.includes(texto) : texto.test(t);
    }) ?? null
  );
}

function janelaDe(el: Element): Window & typeof globalThis {
  return el.ownerDocument.defaultView as Window & typeof globalThis;
}

/** Muda o valor como o navegador faria, para o React perceber (onChange). */
export function definirValor(el: HTMLInputElement | HTMLTextAreaElement, valor: string): void {
  const win = janelaDe(el);
  const proto = el instanceof win.HTMLTextAreaElement ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, valor);
  el.dispatchEvent(new win.Event('input', { bubbles: true }));
}

export async function digitar(
  el: HTMLInputElement | HTMLTextAreaElement,
  texto: string,
  sinal: AbortSignal,
  letrasPorSegundo = 20,
): Promise<void> {
  // Sem el.focus(): o foco fica no telão, e as setas continuam avançando o pitch.
  definirValor(el, '');
  const intervalo = 1000 / letrasPorSegundo;
  for (let i = 1; i <= texto.length; i++) {
    checar(sinal);
    definirValor(el, texto.slice(0, i));
    await pausa(intervalo, sinal);
  }
}

export function apertarEnter(el: HTMLElement): void {
  const win = janelaDe(el);
  el.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
}

/** Clica e deixa um contorno rápido no elemento, para a sala ver onde foi o clique. */
export function clicar(el: HTMLElement): void {
  el.classList.add('pitch-toque');
  setTimeout(() => el.classList.remove('pitch-toque'), 700);
  el.click();
}

/** Rola suave até o elemento e resolve quando a rolagem para (no máximo 1,2 s). */
export function rolarAte(el: Element, margemTopo = 90): Promise<void> {
  const win = janelaDe(el);
  const y = el.getBoundingClientRect().top + win.scrollY - margemTopo;
  win.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  return new Promise((resolve) => {
    const limite = Date.now() + 1200;
    let ultimo = -1;
    let parado = 0;
    const checar = () => {
      const atual = win.scrollY;
      parado = atual === ultimo ? parado + 1 : 0;
      ultimo = atual;
      if (parado >= 3 || Date.now() > limite) resolve();
      else setTimeout(checar, 50);
    };
    setTimeout(checar, 50);
  });
}

const ESTILO_DEMO = `
.splash-intro, nextjs-portal { display: none !important; }
.pitch-toque { outline: 4px solid #f0652b !important; outline-offset: 3px; transition: outline-color .2s; }
.pitch-destaque { outline: 5px solid #f0652b !important; outline-offset: 6px; border-radius: 6px; }
html { scroll-behavior: smooth; }
`;

function prepararDocumento(doc: Document): void {
  if (doc.getElementById('pitch-estilo')) return;
  const estilo = doc.createElement('style');
  estilo.id = 'pitch-estilo';
  estilo.textContent = ESTILO_DEMO;
  (doc.head ?? doc.documentElement).appendChild(estilo);
}

/**
 * Carregamentos de página passam por esta fila: gravamos a sessão do iframe, ele
 * carrega e lê a sessão, e só então o próximo iframe pode gravar a dele.
 */
let fila: Promise<unknown> = Promise.resolve();

export class JanelaApp {
  readonly iframe: HTMLIFrameElement;
  private aoTeclaPressionada: ((e: KeyboardEvent) => void) | null = null;

  constructor(iframe: HTMLIFrameElement) {
    this.iframe = iframe;
  }

  get doc(): Document | null {
    try {
      return this.iframe.contentDocument;
    } catch {
      return null;
    }
  }

  get win(): Window | null {
    return this.iframe.contentWindow;
  }

  get caminho(): string {
    try {
      return this.win?.location.pathname ?? '';
    } catch {
      return '';
    }
  }

  /** Teclas apertadas dentro do iframe (foco no app) também controlam o pitch. */
  definirAoTecla(fn: ((e: KeyboardEvent) => void) | null): void {
    this.aoTeclaPressionada = fn;
  }

  /**
   * Carrega `url` com a `sessao` dada e espera `pronta` ficar verdadeira.
   * Serializado com os outros iframes (ver `fila`).
   */
  carregar(url: string, sessao: Sessao | null, pronta: (doc: Document) => unknown, timeoutMs = 25_000): Promise<void> {
    const tarefa = fila.then(
      () =>
        new Promise<void>((resolve, reject) => {
          gravarSessaoDoApp(sessao);
          const controle = new AbortController();
          const timer = setTimeout(() => {
            controle.abort();
            reject(new Error(`Demo: ${url} não carregou a tempo.`));
          }, timeoutMs);

          const aoCarregar = () => {
            const doc = this.doc;
            // O about:blank do recarregamento também dispara "load": ignora.
            if (!doc || doc.location.href === 'about:blank') return;
            this.iframe.removeEventListener('load', aoCarregar);
            prepararDocumento(doc);
            // O foco pode estar dentro do app: as teclas de verdade (não as que a
            // demo simula) voltam para o pitch, que decide o que fazer com elas.
            doc.addEventListener('keydown', (e) => {
              if (e.isTrusted) this.aoTeclaPressionada?.(e);
            });
            esperar(() => (this.doc ? pronta(this.doc) : null), controle.signal, timeoutMs, `a página ${url}`)
              .then(() => {
                clearTimeout(timer);
                resolve();
              })
              .catch((e) => {
                clearTimeout(timer);
                reject(e);
              });
          };
          this.iframe.addEventListener('load', aoCarregar);
          // Recarrega mesmo se for a mesma URL.
          this.iframe.src = 'about:blank';
          requestAnimationFrame(() => {
            this.iframe.src = url;
          });
        }),
    );
    fila = tarefa.catch(() => undefined);
    return tarefa;
  }
}
