/**
 * ServiçAi — pitch (roteiro do apresentador: Problema → Solução → Execução).
 *
 * TODO texto, fala, tempo e campo pendente do pitch mora aqui. O telão (/pitch), a
 * janela do apresentador (/pitch/apresentador), o roteiro impresso
 * (`npm run roteiro:ensaio`), os scripts de verificação e os testes leem deste arquivo.
 *
 * Regras:
 * - As falas são o roteiro do apresentador, na ordem dele. Não corte nem reordene.
 * - Número de mercado, cliente, faturamento ou parceria só entra com fonte. Sem
 *   fonte, o campo fica `null`: a fala mostra `[__ ...]` e a tela mostra `—`.
 * - Só aparece como pronto o que o README diz que funciona.
 * - Nas falas, `[pausa]` marca onde respirar.
 *
 * Este arquivo não importa nada: é lido também pelo Node puro (roteiro impresso)
 * e pelos testes da API.
 */

// ---------------------------------------------------------------------------
// PREENCHA AQUI
// ---------------------------------------------------------------------------

export interface ConfigPitch {
  apresentador: string;
  cidade: string;
  /** PENDENTE: o caso real que o apresentador viu, em uma frase (tela 4). */
  casoReal: string | null;
  /** Fonte do dado de informalidade da tela 4 (dada pelo apresentador). */
  fonteInformalidade: string;
}

export const CONFIG_PITCH: ConfigPitch = {
  apresentador: 'João Washing',
  cidade: 'Cruzeiro do Sul',
  casoReal: null,
  fonteInformalidade: 'IBGE',
};

// ---------------------------------------------------------------------------
// Ritmo
// ---------------------------------------------------------------------------

/** Ritmo de referência da fala, em palavras por segundo. */
export const PALAVRAS_POR_SEGUNDO = 2.3;

// ---------------------------------------------------------------------------
// Demonstração ao vivo (telas 7 a 9)
// ---------------------------------------------------------------------------

/**
 * Contas criadas por `npm run seed:pitch` (apps/api/src/pitch/seed-pitch.ts) no
 * Postgres LOCAL. Um teste da API confere que estes valores batem com o seed.
 */
export const DEMO_CONTAS = {
  cliente: { email: 'cliente@demo.servicai.local', senha: 'pitch-demo-2026' },
  eletricista: { email: 'eletricista@demo.servicai.local', senha: 'pitch-demo-2026' },
  cidade: 'Cruzeiro do Sul',
  uf: 'AC',
};

/**
 * O que a demo digita e clica, e quando (segundos desde o início da tela).
 *
 * Sem OPENAI_API_KEY, o /solicitar usa o fallback heurístico da API: a 1ª mensagem
 * precisa ter a palavra "eletricista" (vira categoria, descrição e orçamento) e a
 * cidade vem na 2ª mensagem. Não use outros números além do orçamento na 1ª
 * mensagem: "20h" viraria orçamento de R$ 20. Também sem "hoje": o mural do app
 * mostra essa data um dia antes (grava meia-noite UTC e exibe no fuso local).
 * Um teste da API confere o resultado.
 */
export const DEMO_ROTEIRO = {
  pedido: {
    mensagem1: 'Preciso de um eletricista, o chuveiro queimou. Pago até R$ 200.',
    mensagem2: 'Cruzeiro do Sul, AC',
    esperado: { categoria: 'Eletricista', cidade: 'Cruzeiro do Sul', uf: 'AC', orcamentoMax: 200 },
    tempos: { digitar1: 0.4, digitar2: 4.0, publicar: 6.6 },
  },
  /** Não está mais no roteiro do telão; fica para o teste da busca na API. */
  busca: {
    termo: 'eletricista urgente para o chuveiro',
    tempos: { digitar: 0.4, abrirPerfil: 5.0, rolarGaleria: 8.0, rolarAvaliacoes: 10.5 },
  },
  proposta: {
    valor: '180',
    prazo: 'Hoje',
    disponivel: 'Hoje, às 21h',
    mensagem: 'Boa noite! Sou eletricista em Cruzeiro do Sul e troco a resistência ainda hoje.',
    respostaCliente: 'Pode vir às 21h? Obrigada!',
    tempos: { tenhoInteresse: 0.3, enviar: 3.6, abrirSino: 4.6, abrirPedido: 5.6, conversar: 6.8, responder: 8.2 },
  },
  gestao: {
    /** Páginas do painel do prestador, na ordem da fala. */
    tempos: { agenda: 0, inicio: 3.6, metas: 7.4 },
  },
};

// ---------------------------------------------------------------------------
// Telas
// ---------------------------------------------------------------------------

export type IdTela =
  | 'problema'
  | 'onde'
  | 'quem-sofre'
  | 'evidencia'
  | 'consequencia'
  | 'solucao'
  | 'demo-pedido'
  | 'demo-resposta'
  | 'demo-gestao'
  | 'beneficiados'
  | 'por-que-resolve'
  | 'resultado'
  | 'etapas'
  | 'recursos'
  | 'quem-onde'
  | 'metricas'
  | 'fechamento';

export type IdDemo = 'pedido' | 'proposta' | 'gestao' | 'busca' | 'privacidade';

export type Secao = 'Problema' | 'Solução' | 'Execução';

export interface Tela {
  n: number;
  id: IdTela;
  secao: Secao;
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
  problema: {
    titulo: 'Em Cruzeiro do Sul, quem presta serviço',
    itens: ['depende quase só de recomendação', 'não tem estrutura para organizar o trabalho'],
  },
  onde: {
    titulo: 'Do Centro aos bairros mais afastados',
    profissoes: ['Eletricista', 'Encanador', 'Diarista', 'Pedreiro', 'Manicure'],
    rodape: 'Todo mundo vive do boca a boca e do WhatsApp.',
  },
  quemSofre: {
    colunas: [
      { titulo: 'Prestadores', texto: 'sem previsibilidade de renda' },
      { titulo: 'Moradores', texto: 'sem saber em quem confiar' },
    ],
  },
  evidencia: {
    numero: 'Mais da metade',
    texto: 'dos trabalhadores da Região Norte está na informalidade.',
  },
  consequencia: {
    frases: ['O bom profissional continua invisível.', 'O morador continua contratando no escuro.'],
  },
  solucao: {
    subtitulo: 'Intermediação de serviços + gestão',
    frase: 'Toda a estrutura do prestador, em um lugar só.',
  },
  beneficiados: {
    colunas: [
      { titulo: 'Prestadores', texto: 'ganham clientes e organização' },
      { titulo: 'Moradores', texto: 'encontram profissionais com mais facilidade e segurança' },
    ],
  },
  porQueResolve: {
    antes: 'Depender só de recomendação',
    depois: ['Ser encontrado pelo app', 'O negócio organizado na palma da mão'],
  },
  resultado: {
    titulo: 'Resultado esperado',
    linhas: [
      { quem: 'Quem presta', texto: 'mais clientes e mais renda' },
      { quem: 'Quem contrata', texto: 'atendimento mais rápido e confiável' },
    ],
  },
  etapas: [
    { titulo: 'Piloto', texto: 'cadastrar os prestadores de Cruzeiro do Sul' },
    { titulo: 'Clientes', texto: 'abrir o app e coletar avaliações' },
    { titulo: 'Expansão', texto: 'mais serviços e outras cidades do Juruá' },
  ],
  recursos: {
    titulo: 'Vamos precisar de',
    itens: ['Servidor para o aplicativo', 'Divulgação local', 'Parcerias com quem já reúne prestadores'],
  },
  quemOnde: {
    quem: { titulo: 'Quem', texto: 'desenvolvimento e operação' },
    onde: { titulo: 'Onde', texto: 'começando pelos bairros com mais prestadores cadastrados' },
  },
  metricas: {
    titulo: 'Como vamos saber se deu certo',
    itens: ['Prestadores ativos', 'Serviços fechados por mês', 'Tempo até o cliente ser atendido', 'Nota média das avaliações'],
  },
  fechamento: { frase: 'Toda a estrutura do prestador em um lugar só.', obrigado: 'Obrigado!' },
  demo: {
    /** Aviso fixo nas telas de demo: os perfis e dados são do seed. */
    selo: 'Sistema real · dados de demonstração',
  },
  /** Mantido para a tela de estágio, se voltar ao roteiro; testado contra o README. */
  estagio: {
    jaFunciona: [
      'Pedido em texto livre, montado pela IA',
      'Busca inteligente com ranking',
      'Mural de oportunidades e propostas',
      'Chat e notificações em tempo real',
      'Agenda com lembretes',
      'Entradas, saídas, metas e lucro calculados',
    ],
    proximo: [] as string[],
  },
};

export function montarTelas(config: ConfigPitch = CONFIG_PITCH): Tela[] {
  const caso = config.casoReal ?? pendente('um caso real que você viu, em uma frase');

  const telas: Omit<Tela, 'n'>[] = [
    // ------------------------------------------------------------ PROBLEMA
    {
      id: 'problema',
      secao: 'Problema',
      titulo: 'O problema',
      tipo: 'dados',
      duracao: 14,
      fala: `O problema é que quem trabalha prestando serviço em ${config.cidade} depende quase só de recomendação para conseguir cliente, [pausa] e não tem nenhuma estrutura para organizar o próprio trabalho.`,
    },
    {
      id: 'onde',
      secao: 'Problema',
      titulo: 'Onde acontece',
      tipo: 'dados',
      duracao: 11,
      fala: 'Acontece na cidade toda, do Centro aos bairros mais afastados. [pausa] Eletricista, encanador, diarista, pedreiro, manicure: todo mundo vive do boca a boca e do WhatsApp.',
    },
    {
      id: 'quem-sofre',
      secao: 'Problema',
      titulo: 'Quem sofre',
      tipo: 'dados',
      duracao: 12,
      fala: 'Quem sofre com isso são os prestadores, que ficam sem previsibilidade de renda, [pausa] e os moradores, que não sabem em quem confiar quando precisam de alguém.',
    },
    {
      id: 'evidencia',
      secao: 'Problema',
      titulo: 'Como eu sei',
      tipo: 'dados',
      duracao: 15,
      fala: `Eu sei disso porque, segundo o ${config.fonteInformalidade}, mais da metade dos trabalhadores da Região Norte está na informalidade. [pausa] E ${caso}`,
    },
    {
      id: 'consequencia',
      secao: 'Problema',
      titulo: 'Se nada for feito',
      tipo: 'dados',
      duracao: 9,
      fala: 'Se nada for feito, o bom profissional continua invisível, perde cliente e dinheiro, [pausa] e o morador continua contratando no escuro.',
    },
    // ------------------------------------------------------------ SOLUÇÃO
    {
      id: 'solucao',
      secao: 'Solução',
      titulo: 'A solução',
      tipo: 'dados',
      duracao: 13,
      fala: 'A minha solução é o ServiçAi, um aplicativo de intermediação de serviços e gestão [pausa] que dá ao prestador toda a estrutura de que ele precisa, em um lugar só.',
    },
    {
      id: 'demo-pedido',
      secao: 'Solução',
      titulo: 'Demo — o cliente pede',
      tipo: 'demo',
      demo: 'pedido',
      duracao: 10,
      fala: 'Funciona assim: o cliente busca um profissional ou envia um pedido,',
      legenda: 'O cliente descreve o problema; o pedido se monta sozinho.',
    },
    {
      id: 'demo-resposta',
      secao: 'Solução',
      titulo: 'Demo — o prestador responde',
      tipo: 'demo',
      demo: 'proposta',
      duracao: 12,
      fala: 'e os prestadores recebem e respondem pelo app.',
      legenda: 'O prestador recebe o pedido e responde; o cliente é avisado na hora.',
    },
    {
      id: 'demo-gestao',
      secao: 'Solução',
      titulo: 'Demo — a gestão do prestador',
      tipo: 'demo',
      demo: 'gestao',
      duracao: 11,
      fala: 'Dentro do mesmo aplicativo, o prestador tem a agenda com lembretes, o controle de entradas e saídas, as metas e as finanças calculadas automaticamente.',
      legenda: 'No mesmo app: agenda, entradas e saídas, lucro e metas.',
    },
    {
      id: 'beneficiados',
      secao: 'Solução',
      titulo: 'Quem se beneficia',
      tipo: 'dados',
      duracao: 11,
      fala: 'Quem se beneficia são os prestadores de serviço, que ganham clientes e organização, [pausa] e os moradores, que encontram profissionais com mais facilidade e segurança.',
    },
    {
      id: 'por-que-resolve',
      secao: 'Solução',
      titulo: 'Por que resolve',
      tipo: 'dados',
      duracao: 13,
      fala: 'Ele resolve o problema porque o prestador deixa de depender somente de recomendação: [pausa] passa a ser encontrado pelo app e a ter o negócio organizado na palma da mão.',
    },
    {
      id: 'resultado',
      secao: 'Solução',
      titulo: 'Resultado esperado',
      tipo: 'dados',
      duracao: 10,
      fala: 'O resultado esperado é mais clientes e mais renda para quem presta o serviço, [pausa] e atendimento mais rápido e confiável para quem contrata.',
    },
    // ------------------------------------------------------------ EXECUÇÃO
    {
      id: 'etapas',
      secao: 'Execução',
      titulo: 'Etapas',
      tipo: 'dados',
      duracao: 17,
      fala: `Primeiro, vamos cadastrar os prestadores de ${config.cidade} em um piloto. [pausa] Depois, abrir o app para os clientes e coletar avaliações. [pausa] Depois, ampliar os tipos de serviço e levar o ServiçAi para outras cidades do Juruá.`,
    },
    {
      id: 'recursos',
      secao: 'Execução',
      titulo: 'Recursos',
      tipo: 'dados',
      duracao: 8,
      fala: 'Vamos precisar de servidor para o aplicativo, divulgação local e parcerias com quem já reúne prestadores na cidade.',
    },
    {
      id: 'quem-onde',
      secao: 'Execução',
      titulo: 'Quem e onde',
      tipo: 'dados',
      duracao: 12,
      fala: `Quem vai fazer sou eu, ${config.apresentador}, cuidando do desenvolvimento e da operação. [pausa] Vai ser feito em ${config.cidade}, começando pelos bairros com mais prestadores cadastrados.`,
    },
    {
      id: 'metricas',
      secao: 'Execução',
      titulo: 'Como medir',
      tipo: 'dados',
      duracao: 13,
      fala: 'Vamos saber se deu certo medindo o número de prestadores ativos, os serviços fechados por mês, o tempo até o cliente ser atendido e a nota média das avaliações.',
    },
    {
      id: 'fechamento',
      secao: 'Execução',
      titulo: 'Fechamento',
      tipo: 'dados',
      duracao: 6,
      fala: 'ServiçAi: toda a estrutura do prestador em um lugar só. [pausa] Obrigado!',
    },
  ];

  return telas.map((t, i) => ({ ...t, n: i + 1 }));
}

export const TELAS: Tela[] = montarTelas();

/** Duração total do pitch, em segundos (soma das telas). */
export const DURACAO_TOTAL = TELAS.reduce((s, t) => s + t.duracao, 0);
/** No ensaio automático (?auto=1) o pitch termina 1 s antes do total. */
export const FIM_ENSAIO_AUTO = DURACAO_TOTAL - 1;

/** Telas de demo em sequência (a gravação do plano B cobre da primeira à última). */
export const TELAS_DEMO = TELAS.filter((t) => t.tipo === 'demo').map((t) => t.n);

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
  if (!config.casoReal) faltando.push('O caso real da tela 4, em uma frase (CONFIG_PITCH.casoReal)');
  return faltando;
}
