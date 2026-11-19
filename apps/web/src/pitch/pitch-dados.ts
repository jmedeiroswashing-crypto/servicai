/**
 * ServiçAi — pitch de 3 minutos.
 *
 * TODO texto, fala, tempo e campo pendente do pitch mora aqui. O telão (/pitch), a
 * janela do apresentador (/pitch/apresentador), o roteiro impresso
 * (`npm run roteiro:ensaio`) e os testes leem deste arquivo.
 *
 * Regras:
 * - Número de mercado, cliente, faturamento ou parceria só entra com fonte. Sem
 *   fonte, o campo fica `null`: a fala mostra `[__ ...]` e a tela mostra `—`.
 * - Só aparece como pronto o que o README diz que funciona. Roadmap só na tela 13,
 *   sempre com a palavra "próximo".
 * - Nas falas, `[pausa]` marca onde respirar.
 *
 * Este arquivo não importa nada: é lido também pelo Node puro (roteiro impresso)
 * e pelos testes da API.
 */

// ---------------------------------------------------------------------------
// PREENCHA AQUI
// ---------------------------------------------------------------------------

export interface PlanoPiloto {
  cidade: string;
  profissionais: string;
  prazo: string;
  metricas: string[];
}

export interface DadoComFonte {
  /** O número grande da tela, ex.: "7 em cada 10". */
  numero: string;
  /** A frase embaixo do número. */
  texto: string;
  /** O que você fala nessa tela (até ~23 palavras). */
  fala: string;
}

export interface ConfigPitch {
  apresentador: string;
  /** PENDENTE: nome da equipe. */
  equipe: string | null;
  /** PENDENTE: saudação curta antes de se apresentar, ex.: "Boa noite!". */
  saudacao: string | null;
  /** PENDENTE: dado da tela 5. Só aparece se `fonteTela5` também estiver preenchida. */
  dadoTela5: DadoComFonte | null;
  /** PENDENTE: fonte do dado da tela 5 (instituição, pesquisa, ano). */
  fonteTela5: string | null;
  /** PENDENTE: plano de piloto da tela 14. */
  planoPiloto: PlanoPiloto | null;
  /** PENDENTE: o que estamos pedindo (tela 15). Uma frase. */
  pedido: string | null;
}

export const CONFIG_PITCH: ConfigPitch = {
  apresentador: 'Matheus Henrique',
  equipe: null,
  saudacao: null,
  dadoTela5: null,
  fonteTela5: null,
  planoPiloto: null,
  pedido: null,
};

// ---------------------------------------------------------------------------
// Ritmo
// ---------------------------------------------------------------------------

/** Ritmo de referência da fala, em palavras por segundo. */
export const PALAVRAS_POR_SEGUNDO = 2.3;
/** Duração total do pitch, em segundos. */
export const DURACAO_TOTAL = 180;
/** No ensaio automático (?auto=1) o pitch termina aqui: entre 2:55 e 3:00. */
export const FIM_ENSAIO_AUTO = 179;

// ---------------------------------------------------------------------------
// Demonstração ao vivo (telas 8 a 11)
// ---------------------------------------------------------------------------

/**
 * Contas criadas por `npm run seed:pitch` (apps/api/src/pitch/seed-pitch.ts) no
 * Postgres LOCAL. Um teste da API confere que estes valores batem com o seed.
 */
export const DEMO_CONTAS = {
  cliente: { email: 'cliente@demo.servicai.local', senha: 'pitch-demo-2026' },
  eletricista: { email: 'eletricista@demo.servicai.local', senha: 'pitch-demo-2026' },
  cidade: 'Recife',
  uf: 'PE',
};

/**
 * O que a demo digita e clica, e quando (segundos desde o início da tela).
 *
 * Sem OPENAI_API_KEY, o /solicitar usa o fallback heurístico da API: a 1ª mensagem
 * precisa ter a palavra "eletricista" (vira categoria, descrição e orçamento) e a
 * cidade vem na 2ª mensagem. Não use outros números além do orçamento na 1ª
 * mensagem: "20h" viraria orçamento de R$ 20. Também sem "hoje": o mural do app mostra essa
 * data um dia antes (grava meia-noite UTC e exibe no fuso local). Um teste da API confere.
 */
export const DEMO_ROTEIRO = {
  pedido: {
    mensagem1: 'Preciso de um eletricista, o chuveiro queimou. Pago até R$ 200.',
    mensagem2: 'Recife, PE',
    esperado: { categoria: 'Eletricista', cidade: 'Recife', uf: 'PE', orcamentoMax: 200 },
    tempos: { digitar1: 0.6, digitar2: 6.2, publicar: 11.5 },
  },
  busca: {
    termo: 'eletricista urgente para o chuveiro',
    tempos: { digitar: 0.4, abrirPerfil: 5.0, rolarGaleria: 8.0, rolarAvaliacoes: 10.5 },
  },
  proposta: {
    valor: '180',
    prazo: 'Hoje',
    disponivel: 'Hoje, às 21h',
    mensagem: 'Boa noite! Sou eletricista em Recife e troco a resistência hoje ainda.',
    respostaCliente: 'Pode vir às 21h? Obrigada!',
    tempos: { tenhoInteresse: 0.4, enviar: 4.0, abrirSino: 5.0, abrirPedido: 6.0, conversar: 7.2, responder: 8.6 },
  },
  privacidade: {
    tempos: { destacar: 0.6 },
  },
};

// ---------------------------------------------------------------------------
// Telas
// ---------------------------------------------------------------------------

export type IdTela =
  | 'abertura'
  | 'apresentacao'
  | 'problema-cliente'
  | 'problema-prestador'
  | 'numero'
  | 'virada'
  | 'servicai'
  | 'demo-pedido'
  | 'demo-busca'
  | 'demo-proposta'
  | 'demo-privacidade'
  | 'modelo'
  | 'estagio'
  | 'piloto'
  | 'pedido'
  | 'fechamento';

export type IdDemo = 'pedido' | 'busca' | 'proposta' | 'privacidade';

export interface Tela {
  n: number;
  id: IdTela;
  titulo: string;
  tipo: 'dados' | 'demo';
  /** Segundos que a tela fica no ar. */
  duracao: number;
  /** Fala já com os campos pendentes resolvidos. Pode conter `[pausa]` e `[__ ...]`. */
  fala: string;
  /** Telas de demo: qual roteiro roda e a legenda de uma linha embaixo da moldura. */
  demo?: IdDemo;
  legenda?: string;
}

export const PENDENTE_TELA = '—';
const pendente = (rotulo: string) => `[__ ${rotulo}]`;

export const TEXTOS = {
  abertura: { grande: 'Sábado, 20h.' },
  problemaCliente: {
    titulo: 'Achar alguém de confiança depende de',
    frases: ['Indicação.', 'Grupo.', 'Sorte.'],
  },
  problemaPrestador: { titulo: 'Bom de serviço.', subtitulo: 'Mas ninguém encontra.' },
  numero: { semFonte: 'Quem é bom nem sempre é quem aparece.' },
  virada: { pergunta: 'E se pedir um serviço fosse tão simples quanto contar o problema?' },
  servicai: {
    frase: 'Conecta quem precisa com quem resolve.',
    passos: [
      { rotulo: 'Pedir', detalhe: 'em texto livre' },
      { rotulo: 'Comparar', detalhe: 'Score de 0 a 100' },
      { rotulo: 'Contratar', detalhe: 'proposta e chat' },
    ],
  },
  modelo: {
    titulo: 'O cliente não paga nada.',
    planos: [
      { nome: 'Grátis', preco: 'R$ 0', detalhe: '5 propostas por mês' },
      { nome: 'Profissional', preco: 'R$ 29,90', detalhe: '60 propostas por mês' },
      { nome: 'Premium', preco: 'R$ 59,90', detalhe: 'propostas ilimitadas' },
      { nome: 'Impulso', preco: 'R$ 5', detalhe: 'topo da busca por 7 dias' },
    ],
    nota: 'No ranking, a avaliação pesa tanto quanto o plano.',
  },
  estagio: {
    /** Só itens que o README lista como funcionando. */
    jaFunciona: [
      'Pedido em texto livre, montado pela IA',
      'Busca inteligente com ranking',
      'Score de 0 a 100 com avaliações por critério',
      'Mural de oportunidades e propostas',
      'Chat e notificações em tempo real',
      'Verificação de documento com revisão',
    ],
    /** Roadmap do README. Sempre com "Próximo". */
    proximo: [
      'Próximo: pagamento seguro na plataforma',
      'Próximo: verificação por selfie',
      'Próximo: app nativo',
    ],
  },
  piloto: {
    rotulos: { cidade: 'Cidade', profissionais: 'Profissionais', prazo: 'Prazo', metricas: 'O que vamos medir' },
  },
  fechamento: { grande: 'Sábado, 20h.', frase: 'Você conta o problema. O ServiçAi encontra quem resolve.' },
  demo: {
    /** Aviso fixo nas telas de demo: os perfis e avaliações são do seed. */
    selo: 'Sistema real · dados de demonstração',
  },
};

/** Dado da tela 5 só aparece com fonte. */
export function dadoTela5Valido(config: ConfigPitch = CONFIG_PITCH): (DadoComFonte & { fonte: string }) | null {
  if (!config.dadoTela5 || !config.fonteTela5) return null;
  return { ...config.dadoTela5, fonte: config.fonteTela5 };
}

export function montarTelas(config: ConfigPitch = CONFIG_PITCH): Tela[] {
  const dado = dadoTela5Valido(config);
  const piloto = config.planoPiloto;

  const telas: Omit<Tela, 'n'>[] = [
    {
      id: 'abertura',
      titulo: 'Abertura',
      tipo: 'dados',
      duracao: 12,
      fala: 'Sábado, oito da noite. [pausa] O chuveiro queima. [pausa] Você abre o WhatsApp e pergunta no grupo: alguém conhece um eletricista?',
    },
    {
      id: 'apresentacao',
      titulo: 'Apresentação',
      tipo: 'dados',
      duracao: 6,
      fala: `${config.saudacao ?? pendente('saudação')} Eu sou o ${config.apresentador}, e este é o ServiçAi.`,
    },
    {
      id: 'problema-cliente',
      titulo: 'Problema do cliente',
      tipo: 'dados',
      duracao: 16,
      fala: 'Hoje, achar um profissional de confiança depende de indicação, de grupo e de sorte. [pausa] Você não sabe o preço, não sabe se ele é bom e não sabe se vai aparecer.',
    },
    {
      id: 'problema-prestador',
      titulo: 'Problema do prestador',
      tipo: 'dados',
      duracao: 12,
      fala: 'Do outro lado, o bom profissional vive do boca a boca. [pausa] Ele é bom, mas ninguém encontra ele.',
    },
    {
      id: 'numero',
      titulo: 'Número',
      tipo: 'dados',
      duracao: 10,
      fala: dado ? dado.fala : TEXTOS.numero.semFonte,
    },
    {
      id: 'virada',
      titulo: 'Virada',
      tipo: 'dados',
      duracao: 8,
      fala: '[pausa] E se pedir um serviço fosse tão simples quanto contar o problema?',
    },
    {
      id: 'servicai',
      titulo: 'ServiçAi',
      tipo: 'dados',
      duracao: 8,
      fala: 'O ServiçAi conecta quem precisa com quem resolve, com avaliação de verdade e reputação.',
    },
    {
      id: 'demo-pedido',
      titulo: 'Demo 1 — cliente pede',
      tipo: 'demo',
      demo: 'pedido',
      duracao: 16,
      fala: 'O cliente só escreve o que precisa, do jeito dele. [pausa] O sistema entende a categoria, a cidade e o orçamento e monta o pedido sozinho.',
      legenda: 'O cliente descreve o problema; o rascunho do pedido se monta ao lado.',
    },
    {
      id: 'demo-busca',
      titulo: 'Demo 2 — cliente compara',
      tipo: 'demo',
      demo: 'busca',
      duracao: 14,
      fala: 'Ele também pode buscar. [pausa] Cada profissional tem uma nota de 0 a 100, feita de avaliações de clientes: pontualidade, qualidade, preço e atendimento.',
      legenda: 'Busca em linguagem natural, lista ranqueada e perfil com o Score ServiçAi.',
    },
    {
      id: 'demo-proposta',
      titulo: 'Demo 3 — prestador recebe',
      tipo: 'demo',
      demo: 'proposta',
      duracao: 14,
      fala: 'O eletricista recebe a oportunidade da cidade dele, manda a proposta com valor e prazo, [pausa] e os dois conversam na hora.',
      legenda: 'O mesmo pedido chega ao eletricista; a proposta avisa o cliente na hora.',
    },
    {
      id: 'demo-privacidade',
      titulo: 'Demo 4 — confiança',
      tipo: 'demo',
      demo: 'privacidade',
      duracao: 8,
      fala: 'E o pedido chega sem o nome, o telefone e o endereço do cliente.',
      legenda: 'O que o eletricista recebe da API: nenhum dado pessoal do cliente.',
    },
    {
      id: 'modelo',
      titulo: 'Modelo de negócio',
      tipo: 'dados',
      duracao: 14,
      fala: 'O cliente não paga nada. [pausa] O profissional usa de graça ou assina para mandar mais propostas. [pausa] Mas o ranking não é só dinheiro: a avaliação pesa tanto quanto o plano.',
    },
    {
      id: 'estagio',
      titulo: 'Estágio',
      tipo: 'dados',
      duracao: 12,
      fala: 'Tudo o que vocês viram já funciona. [pausa] O próximo passo é o pagamento seguro dentro da plataforma e a verificação por selfie.',
    },
    {
      id: 'piloto',
      titulo: 'Plano de piloto',
      tipo: 'dados',
      duracao: 10,
      fala: piloto
        ? `Vamos começar em ${piloto.cidade}, com ${piloto.profissionais} profissionais, em ${piloto.prazo}. [pausa] Vamos medir ${piloto.metricas.join(', ')}.`
        : pendente('plano de piloto: cidade, nº de profissionais, prazo e métricas'),
    },
    {
      id: 'pedido',
      titulo: 'Pedido',
      tipo: 'dados',
      duracao: 8,
      fala: config.pedido ?? pendente('o que estamos pedindo'),
    },
    {
      id: 'fechamento',
      titulo: 'Fechamento',
      tipo: 'dados',
      duracao: 12,
      fala: 'Sábado, oito da noite. [pausa] O chuveiro queima. [pausa] Dessa vez, você conta o problema, e o ServiçAi encontra quem resolve.',
    },
  ];

  return telas.map((t, i) => ({ ...t, n: i + 1 }));
}

export const TELAS: Tela[] = montarTelas();

/** Segundo (desde o começo do pitch) em que cada tela começa. */
export function inicioDaTela(n: number, telas: Tela[] = TELAS): number {
  return telas.slice(0, n - 1).reduce((soma, t) => soma + t.duracao, 0);
}

/** Tela que deveria estar no ar no segundo `t` do pitch. */
export function telaNoTempo(t: number, telas: Tela[] = TELAS): number {
  let acumulado = 0;
  for (const tela of telas) {
    acumulado += tela.duracao;
    if (t < acumulado) return tela.n;
  }
  return telas.length;
}

/** "1:04" */
export function formatarTempo(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Fala sem as marcações, como ela é dita. */
export function falaLimpa(fala: string): string {
  return fala.replace(/\[pausa\]\s*/g, '').replace(/\s+/g, ' ').trim();
}

export function contarPalavras(fala: string): number {
  const limpa = falaLimpa(fala).replace(/\[__[^\]]*\]/g, '');
  return limpa.split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length;
}

/** Quantas palavras cabem na tela no ritmo de referência. */
export function palavrasQueCabem(tela: Tela): number {
  return Math.floor(tela.duracao * PALAVRAS_POR_SEGUNDO);
}

/** O que ainda falta preencher no CONFIG_PITCH. */
export function listarPendentes(config: ConfigPitch = CONFIG_PITCH): string[] {
  const faltando: string[] = [];
  if (!dadoTela5Valido(config)) faltando.push('Dado e fonte da tela 5 (CONFIG_PITCH.dadoTela5 e fonteTela5)');
  if (!config.planoPiloto) faltando.push('Plano de piloto: cidade, nº de profissionais, prazo e métricas (CONFIG_PITCH.planoPiloto)');
  if (!config.pedido) faltando.push('O que estamos pedindo (CONFIG_PITCH.pedido)');
  if (!config.equipe) faltando.push('Nome da equipe (CONFIG_PITCH.equipe)');
  if (!config.saudacao) faltando.push('Saudação (CONFIG_PITCH.saudacao)');
  return faltando;
}
