/**
 * Roteiro das telas 8 a 11: o que a demo faz no app real, e quando.
 *
 * Tudo acontece em páginas de verdade do app (/solicitar, /buscar, /prestador,
 * /painel/oportunidades, /minhas-solicitacoes, /mensagens), contra a API local.
 * Os painéis ao lado das molduras só mostram dados lidos da própria API.
 */
import { DEMO_ROTEIRO, type IdDemo } from '../pitch-dados';
import { DemoCancelada, JanelaApp, apertarEnter, clicar, digitar, esperar, pausa, porTexto, rolarAte } from './iframe';
import { api, entrarNasDuasContas, type Oportunidade, type Sessao } from './sessao';

export type IdJanela = 'cliente' | 'busca' | 'prestador' | 'privacidade';

export interface Criterios {
  nome: string;
  score: number;
  nota: number;
  avaliacoes: number;
  pontualidade: number;
  qualidade: number;
  preco: number;
  atendimento: number;
}

export interface Privacidade {
  recebidos: { campo: string; valor: string }[];
  ausentes: { rotulo: string; ausente: boolean }[];
}

/** Retângulo (em px do app) para a câmera aproximar. */
export interface Foco {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface InfoDemo {
  criterios: Criterios | null;
  privacidade: Privacidade | null;
  foco: Partial<Record<IdJanela, Foco | null>>;
}

export const INFO_VAZIA: InfoDemo = { criterios: null, privacidade: null, foco: {} };

const PRONTA = {
  solicitar: (d: Document) =>
    porTexto(d, 'button', 'Conversar com a IA') && d.querySelector('input[placeholder="Descreva o que você precisa..."]'),
  buscar: (d: Document) => d.querySelector('main input[placeholder="O que você precisa?"]'),
  oportunidades: (d: Document) =>
    porTexto(d, 'h1', 'Oportunidades') &&
    (porTexto(d, 'button', 'Tenho interesse') || porTexto(d, 'p', 'Proposta enviada') || porTexto(d, 'p', 'Nenhuma oportunidade')),
  mensagens: (d: Document) => porTexto(d, 'h1', 'Mensagens') && !porTexto(d, 'p', 'Carregando'),
};

interface PedidoDemo {
  id: string;
  title: string;
  description: string;
}

/** Retângulo na área visível do iframe (medido depois de rolar). */
function retanguloNoDocumento(el: Element, folga = 24): Foco {
  const r = el.getBoundingClientRect();
  return { x: r.left - folga, y: r.top - folga, w: r.width + folga * 2, h: r.height + folga * 2 };
}

function media(valores: number[]): number {
  return valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : 0;
}

export class DiretorDemo {
  private sessoes: { cliente: Sessao; eletricista: Sessao } | null = null;
  private controle: AbortController | null = null;
  private pedido: PedidoDemo | null = null;
  private recargas: Partial<Record<IdJanela, Promise<void>>> = {};
  private info: InfoDemo = INFO_VAZIA;
  pronta = false;

  constructor(
    private janelas: Record<IdJanela, JanelaApp>,
    private aoMudarInfo: (info: InfoDemo) => void,
    private aoAviso: (aviso: string | null) => void,
  ) {}

  private atualizar(parcial: Partial<InfoDemo>): void {
    this.info = { ...this.info, ...parcial, foco: { ...this.info.foco, ...(parcial.foco ?? {}) } };
    this.aoMudarInfo(this.info);
  }

  private get s() {
    if (!this.sessoes) throw new Error('Demo: sessões não abertas.');
    return this.sessoes;
  }

  private carregarJanela(id: IdJanela, url: string, quem: 'cliente' | 'eletricista', pronta: (d: Document) => unknown) {
    const p = this.janelas[id].carregar(url, this.s[quem], pronta);
    this.recargas[id] = p.catch(() => undefined);
    return p;
  }

  /** Abre as sessões e deixa as três primeiras telas do app carregadas, escondidas. */
  async preparar(): Promise<void> {
    this.aoAviso('Preparando a demo…');
    this.sessoes = await entrarNasDuasContas(() =>
      this.aoAviso('A API limitou os logins (pitch recarregado várias vezes). Esperando para entrar de novo…'),
    );
    await this.cancelarPedidosAbertos();
    // Compila no `next dev` as páginas que a demo abre depois por navegação interna.
    await Promise.all(['/minhas-solicitacoes', '/mensagens', '/prestador'].map((u) => fetch(u).catch(() => undefined)));
    await this.carregarJanela('cliente', '/solicitar', 'cliente', PRONTA.solicitar);
    await this.carregarJanela('busca', '/buscar', 'cliente', PRONTA.buscar);
    await this.carregarJanela('prestador', '/painel/oportunidades', 'eletricista', PRONTA.oportunidades);
    this.pronta = true;
    this.aoAviso(null);
  }

  /** Pedidos abertos de ensaios anteriores saem do mural, para a tela 10 achar só o novo. */
  private async cancelarPedidosAbertos(): Promise<void> {
    const meus = await api.get<{ id: string; status?: string }[]>('/requests/mine', this.s.cliente);
    await Promise.all(
      meus.filter((r) => (r.status ?? 'ABERTA') === 'ABERTA').map((r) => api.patch(`/requests/${r.id}/cancel`, {}, this.s.cliente)),
    );
  }

  parar(): void {
    this.controle?.abort();
    this.controle = null;
  }

  /** Roda a demo da tela. `desdeMs` é o performance.now() de quando a tela entrou no ar. */
  async rodar(demo: IdDemo, desdeMs: number, reiniciar = false): Promise<void> {
    this.parar();
    const controle = new AbortController();
    this.controle = controle;
    const sinal = controle.signal;
    const em = (t: number) => pausa(desdeMs + t * 1000 - performance.now(), sinal);

    try {
      if (!this.pronta) await esperar(() => this.pronta, sinal, 60_000, 'a preparação da demo');
      this.aoAviso(null); // erro de uma demo anterior não fica pendurado nesta
      this.atualizar({ foco: { cliente: null, busca: null, prestador: null, privacidade: null } });
      if (demo === 'pedido') await this.demoPedido(sinal, em, reiniciar);
      if (demo === 'busca') await this.demoBusca(sinal, em, reiniciar);
      if (demo === 'proposta') await this.demoProposta(sinal, em, reiniciar);
      if (demo === 'privacidade') await this.demoPrivacidade(sinal, reiniciar);
      this.aoAviso(null);
    } catch (e) {
      if (e instanceof DemoCancelada) return;
      console.error(e);
      this.aoAviso(e instanceof Error ? e.message : 'A demo falhou.');
    }
  }

  // -------------------------------------------------------------------------
  // Tela 8 — o cliente pede conversando com a IA
  // -------------------------------------------------------------------------

  private async demoPedido(sinal: AbortSignal, em: (t: number) => Promise<void>, reiniciar: boolean) {
    const j = this.janelas.cliente;
    const { mensagem1, mensagem2, tempos } = DEMO_ROTEIRO.pedido;
    if (reiniciar || j.caminho !== '/solicitar' || porTexto(j.doc, 'dd', 'Eletricista')) {
      await this.carregarJanela('cliente', '/solicitar', 'cliente', PRONTA.solicitar);
    }
    const doc = j.doc!;
    const campo = await esperar(
      () => doc.querySelector<HTMLInputElement>('input[placeholder="Descreva o que você precisa..."]'),
      sinal,
      5000,
      'o campo da conversa',
    );
    const grade = campo.closest('.grid') ?? campo;
    await rolarAte(grade, 24);
    this.atualizar({ foco: { cliente: retanguloNoDocumento(grade, 16) } });

    await em(tempos.digitar1);
    await digitar(campo, mensagem1, sinal, 21);
    apertarEnter(campo);
    await esperar(() => porTexto(doc, 'dd', 'Eletricista'), sinal, 8000, 'a categoria no rascunho');

    await em(tempos.digitar2);
    await digitar(campo, mensagem2, sinal, 14);
    apertarEnter(campo);
    await esperar(() => porTexto(doc, 'dd', 'Recife'), sinal, 8000, 'a cidade no rascunho');

    await em(tempos.publicar);
    const publicar = await esperar(
      () => {
        const b = porTexto<HTMLButtonElement>(doc, 'button', 'Publicar solicitação');
        return b && !b.disabled ? b : null;
      },
      sinal,
      5000,
      'o botão Publicar',
    );
    clicar(publicar);
    await esperar(() => j.caminho === '/minhas-solicitacoes', sinal, 10_000, 'a lista de pedidos');
    this.atualizar({ foco: { cliente: null } });

    await this.lembrarPedidoMaisNovo();
    // A tela 10 precisa do mural já com este pedido: recarrega o painel escondido agora.
    void this.carregarJanela('prestador', '/painel/oportunidades', 'eletricista', PRONTA.oportunidades);
  }

  private async lembrarPedidoMaisNovo(): Promise<PedidoDemo | null> {
    const meus = await api.get<(PedidoDemo & { status?: string })[]>('/requests/mine', this.s.cliente);
    const aberto = meus.find((r) => (r.status ?? 'ABERTA') === 'ABERTA') ?? null;
    this.pedido = aberto;
    return aberto;
  }

  /**
   * Tela 10 sem a tela 8 antes (pulo, ?tela=10 ou R): publica o mesmo pedido pela
   * API do app — a mesma conversa com a IA e a mesma rota de publicação.
   */
  private async garantirPedidoSemProposta(): Promise<PedidoDemo> {
    const oportunidades = await api.get<Oportunidade[]>('/requests/matches', this.s.eletricista);
    const livre = this.pedido && oportunidades.find((o) => o.id === this.pedido!.id && !o.alreadyProposed);
    if (livre) return this.pedido!;

    await this.cancelarPedidosAbertos();
    const { mensagem1, mensagem2 } = DEMO_ROTEIRO.pedido;
    type Intake = { draft: Record<string, unknown> };
    const r1 = await api.post<Intake>('/requests/ai-intake', { message: mensagem1, draft: {} }, this.s.cliente);
    const r2 = await api.post<Intake>('/requests/ai-intake', { message: mensagem2, draft: r1.draft }, this.s.cliente);
    const criado = await api.post<PedidoDemo>('/requests', r2.draft, this.s.cliente);
    this.pedido = criado;
    return criado;
  }

  // -------------------------------------------------------------------------
  // Tela 9 — o cliente busca e compara
  // -------------------------------------------------------------------------

  private async demoBusca(sinal: AbortSignal, em: (t: number) => Promise<void>, reiniciar: boolean) {
    const j = this.janelas.busca;
    const { termo, tempos } = DEMO_ROTEIRO.busca;
    this.atualizar({ criterios: null });
    if (reiniciar || j.caminho !== '/buscar' || j.win?.location.search) {
      await this.carregarJanela('busca', '/buscar', 'cliente', PRONTA.buscar);
    }
    const doc = () => j.doc!;
    const campo = await esperar(() => PRONTA.buscar(doc()) as HTMLInputElement | null, sinal, 5000, 'a busca');

    await em(tempos.digitar);
    await digitar(campo, termo, sinal, 22);
    await pausa(250, sinal);
    campo.form?.requestSubmit();

    const primeiro = await esperar(
      () => doc().querySelector<HTMLAnchorElement>('main a[href^="/prestador?id="]'),
      sinal,
      10_000,
      'os resultados da busca',
    );
    this.atualizar({ foco: { busca: retanguloNoDocumento(primeiro.parentElement ?? primeiro, 20) } });

    await em(tempos.abrirPerfil);
    const id = new URL(primeiro.href).searchParams.get('id')!;
    this.atualizar({ foco: { busca: null } });
    clicar(primeiro);
    await esperar(() => j.caminho === '/prestador' && porTexto(doc(), 'span', /^Score \d+/), sinal, 10_000, 'o perfil');

    // Notas por critério: o perfil público do app não as mostra separadas, então o
    // painel ao lado lê as avaliações da mesma rota que o perfil usa.
    type Perfil = {
      scoreIA: number;
      ratingAvg: number;
      user: { name: string };
      reviews: { pontualidade: number; qualidade: number; preco: number; atendimento: number }[];
      _count?: { reviews: number };
    };
    const perfil = await api.get<Perfil>(`/providers/${id}`);
    this.atualizar({
      criterios: {
        nome: perfil.user.name,
        score: Math.round(perfil.scoreIA),
        nota: perfil.ratingAvg,
        avaliacoes: perfil._count?.reviews ?? perfil.reviews.length,
        pontualidade: media(perfil.reviews.map((r) => r.pontualidade)),
        qualidade: media(perfil.reviews.map((r) => r.qualidade)),
        preco: media(perfil.reviews.map((r) => r.preco)),
        atendimento: media(perfil.reviews.map((r) => r.atendimento)),
      },
    });

    await em(tempos.rolarGaleria);
    const portfolio = porTexto(doc(), 'h2', 'Portfólio');
    if (portfolio) void rolarAte(portfolio, 40);

    await em(tempos.rolarAvaliacoes);
    const avaliacoes = porTexto(doc(), 'h2', 'Avaliações');
    if (avaliacoes) void rolarAte(avaliacoes, 40);
  }

  // -------------------------------------------------------------------------
  // Tela 10 — o eletricista recebe, propõe, e os dois conversam
  // -------------------------------------------------------------------------

  private cartaoDoPedido(doc: Document | null, pedido: PedidoDemo): HTMLElement | null {
    if (!doc) return null;
    const cartoes = Array.from(doc.querySelectorAll<HTMLElement>('div.p-5'));
    return cartoes.find((c) => (c.textContent ?? '').includes(pedido.description)) ?? null;
  }

  private async demoProposta(sinal: AbortSignal, em: (t: number) => Promise<void>, reiniciar: boolean) {
    const { valor, prazo, disponivel, mensagem, respostaCliente, tempos } = DEMO_ROTEIRO.proposta;
    const prestador = this.janelas.prestador;
    const cliente = this.janelas.cliente;

    await this.recargas.prestador;
    const pedido = await this.garantirPedidoSemProposta();
    const cartaoPronto = () => {
      const c = this.cartaoDoPedido(prestador.doc, pedido);
      return c && porTexto(c, 'button', 'Tenho interesse') ? c : null;
    };
    if (reiniciar || prestador.caminho !== '/painel/oportunidades' || !cartaoPronto()) {
      await this.carregarJanela('prestador', '/painel/oportunidades', 'eletricista', (d) =>
        PRONTA.oportunidades(d) && this.cartaoDoPedido(d, pedido),
      );
    }
    if (reiniciar || cliente.caminho !== '/minhas-solicitacoes') {
      await this.carregarJanela('cliente', '/minhas-solicitacoes', 'cliente', (d) => porTexto(d, 'h1', 'Minhas solicitações'));
    }

    const cartao = await esperar(cartaoPronto, sinal, 8000, 'o pedido no mural do eletricista');
    await rolarAte(cartao, 30);
    this.atualizar({ foco: { prestador: retanguloNoDocumento(cartao, 14) } });

    // Eletricista
    await em(tempos.tenhoInteresse);
    clicar(porTexto(cartao, 'button', 'Tenho interesse')!);
    const campos = await esperar(
      () => {
        const preco = cartao.querySelector<HTMLInputElement>('input[type="number"]');
        const textos = cartao.querySelectorAll<HTMLInputElement>('input:not([type="number"])');
        const msg = cartao.querySelector<HTMLTextAreaElement>('textarea');
        return preco && textos.length >= 2 && msg ? { preco, prazo: textos[0], disponivel: textos[1], msg } : null;
      },
      sinal,
      4000,
      'o formulário de proposta',
    );
    this.atualizar({ foco: { prestador: retanguloNoDocumento(cartao, 14) } });
    await digitar(campos.preco, valor, sinal, 12);
    await digitar(campos.prazo, prazo, sinal, 18);
    await digitar(campos.disponivel, disponivel, sinal, 26);
    await digitar(campos.msg, mensagem, sinal, 40);

    await em(tempos.enviar);
    clicar(porTexto(cartao, 'button', 'Enviar proposta')!);
    await esperar(() => porTexto(prestador.doc, 'p', 'Proposta enviada'), sinal, 8000, 'a confirmação da proposta');
    this.atualizar({ foco: { prestador: null } });
    // A tela 11 mostra este mesmo mural: carrega escondido agora.
    void this.carregarJanela('privacidade', '/painel/oportunidades', 'eletricista', (d) =>
      PRONTA.oportunidades(d) && this.cartaoDoPedido(d, pedido),
    );

    // Cliente: o sino acende sozinho (WebSocket de notificações do app).
    const cd = () => cliente.doc!;
    const sino = await esperar(
      () => {
        const b = cd().querySelector<HTMLButtonElement>('button[aria-label="Notificações"]');
        return b && b.querySelector('span') ? b : null;
      },
      sinal,
      8000,
      'a notificação no sino',
    );
    await em(tempos.abrirSino);
    clicar(sino);
    const aviso = await esperar(() => porTexto<HTMLButtonElement>(cd(), 'button', 'Nova proposta'), sinal, 4000, 'o aviso de proposta');

    await em(tempos.abrirPedido);
    clicar(aviso);
    const cabecalho = await esperar(
      () => porTexto<HTMLButtonElement>(cd(), 'main button', pedido.title),
      sinal,
      6000,
      'o pedido do cliente',
    );
    clicar(cabecalho);
    const conversar = await esperar(() => porTexto<HTMLButtonElement>(cd(), 'button', 'Conversar'), sinal, 6000, 'a proposta recebida');
    void rolarAte(conversar, 200);

    await em(tempos.conversar);
    clicar(conversar);
    await esperar(() => cliente.caminho === '/mensagens', sinal, 8000, 'o chat do cliente');
    // A rolagem da página anterior continua: volta ao topo para o chat aparecer inteiro.
    cliente.win?.scrollTo({ top: 0 });

    // O eletricista abre as mensagens dele e vê a conversa chegar.
    const abrirChatPrestador = (async () => {
      await this.carregarJanela('prestador', '/mensagens', 'eletricista', PRONTA.mensagens);
      const nomeCliente = this.s.cliente.user.name;
      const conversa = await esperar(() => porTexto<HTMLButtonElement>(prestador.doc, 'button', nomeCliente), sinal, 6000, 'a conversa');
      prestador.win?.scrollTo({ top: 0 });
      clicar(conversa);
    })();

    await em(tempos.responder);
    const campoMsg = await esperar(
      () => cd().querySelector<HTMLInputElement>('input[placeholder="Escreva uma mensagem..."]'),
      sinal,
      6000,
      'o campo de mensagem',
    );
    await digitar(campoMsg, respostaCliente, sinal, 28);
    apertarEnter(campoMsg);
    await abrirChatPrestador;
    await esperar(() => porTexto(prestador.doc, 'div', respostaCliente), sinal, 6000, 'a mensagem no chat do eletricista');
    // O chat do app rola a janela até a última mensagem (scrollIntoView), o que esconde a
    // conversa sob a barra do topo nesta altura de tela: volta as duas janelas ao topo.
    for (let i = 0; i < 6; i++) {
      await pausa(150, sinal);
      cliente.win?.scrollTo({ top: 0 });
      prestador.win?.scrollTo({ top: 0 });
    }
  }

  // -------------------------------------------------------------------------
  // Tela 11 — o que o eletricista NÃO recebe
  // -------------------------------------------------------------------------

  private async demoPrivacidade(sinal: AbortSignal, reiniciar: boolean) {
    const j = this.janelas.privacidade;
    this.atualizar({ privacidade: null });
    const pedido = this.pedido ?? (await this.lembrarPedidoMaisNovo()) ?? (await this.garantirPedidoSemProposta());

    await this.recargas.privacidade;
    if (reiniciar || !this.cartaoDoPedido(j.doc, pedido)) {
      await this.carregarJanela('privacidade', '/painel/oportunidades', 'eletricista', (d) =>
        PRONTA.oportunidades(d) && this.cartaoDoPedido(d, pedido),
      );
    }
    const cartao = await esperar(() => this.cartaoDoPedido(j.doc, pedido), sinal, 8000, 'o pedido no mural');
    await rolarAte(cartao, 30);
    cartao.classList.add('pitch-destaque');
    this.atualizar({ foco: { privacidade: retanguloNoDocumento(cartao, 18) } });

    // O que a API entrega ao eletricista, comparado com os dados do cliente.
    const [oportunidades, eu] = await Promise.all([
      api.get<Oportunidade[]>('/requests/matches', this.s.eletricista),
      api.get<Record<string, unknown>>('/users/me', this.s.cliente),
    ]);
    const op = oportunidades.find((o) => o.id === pedido.id);
    if (!op) {
      throw new Error(`Demo: o pedido ${pedido.id} não está no mural do eletricista (mural: ${oportunidades.map((o) => o.id).join(', ') || 'vazio'}).`);
    }
    const texto = JSON.stringify(op).toLowerCase();
    const chaves = Object.keys(op).map((k) => k.toLowerCase());
    const contem = (valor: unknown) => typeof valor === 'string' && valor.length > 0 && texto.includes(valor.toLowerCase());
    const temChave = (...partes: string[]) => chaves.some((k) => partes.some((p) => k.includes(p)));

    const orcamento = op.budgetMax ? `até R$ ${op.budgetMax}` : '—';
    this.atualizar({
      privacidade: {
        recebidos: [
          { campo: 'Serviço', valor: String(op.category) },
          { campo: 'Pedido', valor: String(op.title) },
          { campo: 'Cidade', valor: `${op.city}${op.state ? ` - ${op.state}` : ''}` },
          { campo: 'Orçamento', valor: orcamento },
        ],
        ausentes: [
          { rotulo: 'Nome', ausente: !contem(eu.name) && !temChave('name', 'client') },
          { rotulo: 'Telefone', ausente: !contem(eu.phone) && !temChave('phone') },
          { rotulo: 'E-mail', ausente: !contem(eu.email) && !temChave('email') },
          { rotulo: 'Endereço', ausente: !contem(eu.addressStreet) && !temChave('address') },
        ],
      },
    });
  }
}
