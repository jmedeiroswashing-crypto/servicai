import type { Booking, ClientSummary, Expense, FinancialGoal, Income } from '../types';
import { dataCurta, diaDe, diasEntre, somaDias } from './periodo';

/** Conta do painel: faturamento − despesas = lucro. Nenhum número aqui é pagamento confirmado. */
export const FORMAS = ['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Fiado'] as const;

export const brl = (v: number, casas = false) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas ? 2 : 0, maximumFractionDigits: casas ? 2 : 0 });
export const pct = (v: number, casas = 0) =>
  `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;

const noIntervalo = (dia: string, de: string, ate: string) => dia >= de && dia <= ate;

export function resumo(incomes: Income[], expenses: Expense[], de: string, ate: string) {
  const entradas = incomes.filter((i) => noIntervalo(diaDe(i.date), de, ate));
  const faturamento = entradas.reduce((t, i) => t + i.amount, 0);
  const despesas = expenses.filter((e) => noIntervalo(diaDe(e.date), de, ate)).reduce((t, e) => t + e.amount, 0);
  return {
    faturamento,
    despesas,
    lucro: faturamento - despesas,
    servicos: entradas.length,
    ticket: entradas.length ? faturamento / entradas.length : 0,
  };
}

export type Ponto = { dia: string; rot: string; fat: number; desp: number; lucro: number };

/** Até 31 dias mostra dia a dia; até 120, por semana; acima disso, por mês. */
export function serie(incomes: Income[], expenses: Expense[], de: string, ate: string): { pontos: Ponto[]; passo: 1 | 7 | 30 } {
  const dias = diasEntre(de, ate);
  const passo: 1 | 7 | 30 = dias <= 31 ? 1 : dias <= 120 ? 7 : 30;
  const pontos = new Map<string, Ponto>();
  const chave = (dia: string) => {
    if (passo === 30) return `${dia.slice(0, 7)}-01`;
    if (passo === 7) return somaDias(de, Math.floor((diasEntre(de, dia) - 1) / 7) * 7);
    return dia;
  };
  for (let d = de; d <= ate; d = somaDias(d, 1)) {
    const k = chave(d);
    if (!pontos.has(k)) {
      const rot = passo === 30 ? `${k.slice(5, 7)}/${k.slice(2, 4)}` : passo === 7 ? dataCurta(k) : String(Number(k.slice(8)));
      pontos.set(k, { dia: k, rot, fat: 0, desp: 0, lucro: 0 });
    }
  }
  for (const i of incomes) {
    const dia = diaDe(i.date);
    if (noIntervalo(dia, de, ate)) pontos.get(chave(dia))!.fat += i.amount;
  }
  for (const e of expenses) {
    const dia = diaDe(e.date);
    if (noIntervalo(dia, de, ate)) pontos.get(chave(dia))!.desp += e.amount;
  }
  for (const p of pontos.values()) p.lucro = p.fat - p.desp;
  return { pontos: [...pontos.values()], passo };
}

export const ABERTOS: Booking['status'][] = ['SOLICITADO', 'ACEITO', 'EM_ANDAMENTO'];

/** Combinado em serviços confirmados ou em andamento, que ainda não virou faturamento. */
export const aReceber = (bookings: Booking[]) =>
  bookings.filter((b) => b.status === 'ACEITO' || b.status === 'EM_ANDAMENTO').reduce((t, b) => t + (b.priceQuoted ?? 0), 0);

export const atrasado = (b: Booking, h: string) => !!b.scheduledAt && ABERTOS.includes(b.status) && diaDe(b.scheduledAt) < h;

/** Primeiro dia com movimento, para o "Desde o início" não começar num período vazio. */
export function primeiroDia(incomes: Income[], expenses: Expense[], fallback: string): string {
  return [...incomes.map((i) => diaDe(i.date)), ...expenses.map((e) => diaDe(e.date))].reduce((m, d) => (d < m ? d : m), fallback);
}

// O lançamento guarda serviço, cliente e forma de pagamento no texto da descrição.
const SEPARADOR = ' · ';

export function montarDescricao(partes: { servico: string; cliente?: string; forma?: string }): string {
  return [partes.servico.trim(), partes.cliente?.trim(), partes.forma].filter(Boolean).join(SEPARADOR);
}

export function lerDescricao(descricao: string): { servico: string; cliente?: string; forma?: string } {
  const partes = descricao.split(SEPARADOR);
  const forma = (FORMAS as readonly string[]).includes(partes[partes.length - 1]) && partes.length > 1 ? partes.pop() : undefined;
  return { servico: partes[0], cliente: partes.slice(1).join(SEPARADOR) || undefined, forma };
}

export function agrupar<T>(itens: T[], chave: (item: T) => string, valor: (item: T) => number) {
  const grupos = new Map<string, { nome: string; total: number; qtd: number }>();
  for (const item of itens) {
    const nome = chave(item);
    const g = grupos.get(nome) ?? { nome, total: 0, qtd: 0 };
    g.total += valor(item);
    g.qtd += 1;
    grupos.set(nome, g);
  }
  return [...grupos.values()].sort((a, b) => b.total - a.total);
}

export type Alerta = { id: string; tipo: 'sai' | 'ate' | 'inf'; titulo: string; texto: string; href: string };

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

/** Só o que pede uma ação hoje. Tudo vem de dado real: sem dado, sem alerta. */
export function alertasDoDia(args: {
  bookings: Booking[];
  h: string;
  caixaFechadoHoje?: boolean;
  usaCaixa?: boolean;
  meta?: FinancialGoal;
  lucroDoMes?: number;
}): Alerta[] {
  const { bookings, h, usaCaixa, caixaFechadoHoje, meta, lucroDoMes = 0 } = args;
  const lista: Alerta[] = [];
  const atrasados = bookings.filter((b) => atrasado(b, h));
  if (atrasados.length) {
    lista.push({
      id: 'atrasados',
      tipo: 'sai',
      titulo: `${atrasados.length} ${plural(atrasados.length, 'serviço atrasado', 'serviços atrasados')}`,
      texto: atrasados.slice(0, 2).map((b) => b.client?.name ?? 'Cliente').join(', '),
      href: '/painel/quadro',
    });
  }
  const novos = bookings.filter((b) => b.status === 'SOLICITADO');
  if (novos.length) {
    lista.push({
      id: 'novos',
      tipo: 'ate',
      titulo: `${novos.length} ${plural(novos.length, 'pedido esperando', 'pedidos esperando')} resposta`,
      texto: 'Responder rápido ajuda a fechar o serviço.',
      href: '/painel/quadro',
    });
  }
  const deHoje = bookings.filter((b) => b.scheduledAt && diaDe(b.scheduledAt) === h && ABERTOS.includes(b.status));
  if (deHoje.length) {
    lista.push({
      id: 'hoje',
      tipo: 'inf',
      titulo: `${deHoje.length} ${plural(deHoje.length, 'serviço marcado', 'serviços marcados')} para hoje`,
      texto: deHoje.slice(0, 2).map((b) => b.client?.name ?? 'Cliente').join(', '),
      href: '/painel/agenda',
    });
  }
  const semValor = bookings.filter((b) => b.status === 'CONCLUIDO' && b.priceQuoted == null);
  if (semValor.length) {
    lista.push({
      id: 'sem-valor',
      tipo: 'ate',
      titulo: `${semValor.length} ${plural(semValor.length, 'serviço concluído', 'serviços concluídos')} sem valor`,
      texto: 'Sem o valor combinado, não entra no faturamento. Lance o que recebeu.',
      href: '/painel/lancar',
    });
  }
  if (usaCaixa && caixaFechadoHoje === false) {
    lista.push({ id: 'caixa', tipo: 'inf', titulo: 'O caixa de hoje ainda não foi aberto', texto: 'Abra com o troco antes do primeiro serviço.', href: '/painel/caixa' });
  }
  if (meta && !meta.reachedAt && meta.targetAmount > 0) {
    const diasNoMes = new Date(Number(h.slice(0, 4)), Number(h.slice(5, 7)), 0).getDate();
    const passou = Number(h.slice(8)) / diasNoMes;
    const feito = lucroDoMes / meta.targetAmount;
    if (feito < passou - 0.1) {
      lista.push({ id: 'meta', tipo: 'ate', titulo: 'Meta do mês abaixo do ritmo', texto: `${pct(Math.max(feito, 0))} da meta, com ${pct(passou)} do mês já passado.`, href: '/painel/metas' });
    }
  }
  return lista;
}

export type Mensagem = { id: string; tipo: 'lembrete' | 'obrigado' | 'sumido'; titulo: string; sub: string; telefone: string; texto: string };

const primeiroNome = (nome: string) => nome.split(' ')[0];
const DIAS_SUMIDO = 120;

/** As mensagens que o sistema monta para o dia: lembrete, agradecimento e cliente sumido. */
export function mensagensDoDia(bookings: Booking[], clientes: ClientSummary[], h: string): Mensagem[] {
  const lista: Mensagem[] = [];
  const amanha = somaDias(h, 1);
  for (const b of bookings) {
    const telefone = b.client?.phone;
    if (!telefone || !b.client) continue;
    const nome = primeiroNome(b.client.name);
    if (b.status === 'ACEITO' && b.scheduledAt && diaDe(b.scheduledAt) === amanha) {
      const hora = new Date(b.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      lista.push({ id: `lembrete-${b.id}`, tipo: 'lembrete', titulo: b.client.name, sub: `Serviço amanhã às ${hora}`, telefone, texto: `Olá, ${nome}! Passando para confirmar nosso serviço de amanhã às ${hora}. Tudo certo?` });
    }
    const concluidoEm = (b as Booking & { updatedAt?: string }).updatedAt;
    if (b.status === 'CONCLUIDO' && !b.review && concluidoEm && diaDe(concluidoEm) >= somaDias(h, -3)) {
      lista.push({ id: `obrigado-${b.id}`, tipo: 'obrigado', titulo: b.client.name, sub: 'Serviço concluído nos últimos dias', telefone, texto: `Olá, ${nome}! Obrigado pela confiança. Se puder, deixe sua avaliação no ServiçAi: isso ajuda muito o meu trabalho.` });
    }
  }
  for (const c of clientes) {
    if (!c.phone || diasEntre(diaDe(c.lastServiceAt), h) - 1 < DIAS_SUMIDO) continue;
    lista.push({ id: `sumido-${c.clientId}`, tipo: 'sumido', titulo: c.name, sub: `Último serviço há mais de ${DIAS_SUMIDO} dias`, telefone: c.phone, texto: `Olá, ${primeiroNome(c.name)}! Faz um tempo que a gente não trabalha junto. Precisando de algo, estou à disposição.` });
  }
  return lista;
}

export const linkWhats = (telefone: string, texto?: string) =>
  `https://wa.me/55${telefone.replace(/\D/g, '')}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
