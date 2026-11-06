import { useSyncExternalStore } from 'react';

/** Hoje · 7 dias · 30 dias · Este mês · Este ano · Desde o início · Escolher, com o período anterior para comparar. */
export type TipoPeriodo = 'hoje' | '7d' | '30d' | 'mes' | 'ano' | 'tudo' | 'livre';
export type Periodo = { tipo: TipoPeriodo; de?: string; ate?: string };
export type Intervalo = {
  de: string;
  ate: string;
  ant: { de: string; ate: string };
  rotulo: string;
  comparacao: string;
  dias: number;
};

export const OPCOES: { tipo: TipoPeriodo; nome: string }[] = [
  { tipo: 'hoje', nome: 'Hoje' },
  { tipo: '7d', nome: '7 dias' },
  { tipo: '30d', nome: '30 dias' },
  { tipo: 'mes', nome: 'Este mês' },
  { tipo: 'ano', nome: 'Este ano' },
  { tipo: 'tudo', nome: 'Desde o início' },
];

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const nomeMes = (aaaamm: string) => MESES[Number(aaaamm.slice(5, 7)) - 1];

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** Dia no fuso do aparelho: em UTC, um serviço das 21h no Acre cairia no dia seguinte. */
export function diaDe(valor: string | Date): string {
  const d = new Date(valor);
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}
export const hoje = () => diaDe(new Date());

/** Meio-dia local: um "AAAA-MM-DD" puro vira meia-noite UTC e voltaria um dia no Acre. */
export const dataParaApi = (dia: string) => new Date(`${dia}T12:00:00`).toISOString();

export function somaDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const diasEntre = (de: string, ate: string) =>
  Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 864e5) + 1;
export const dataCurta = (dia: string) => `${Number(dia.slice(8, 10))}/${dia.slice(5, 7)}`;

export function intervalo(p: Periodo, h = hoje(), primeiroDia = somaDias(h, -182)): Intervalo {
  const nMes = nomeMes(h);
  switch (p.tipo) {
    case 'hoje':
      return { de: h, ate: h, ant: { de: somaDias(h, -7), ate: somaDias(h, -7) }, rotulo: 'Números de hoje até agora', comparacao: 'que o mesmo dia da semana passada', dias: 1 };
    case '7d':
      return { de: somaDias(h, -6), ate: h, ant: { de: somaDias(h, -13), ate: somaDias(h, -7) }, rotulo: 'Últimos 7 dias', comparacao: 'que os 7 dias antes', dias: 7 };
    case '30d':
      return { de: somaDias(h, -29), ate: h, ant: { de: somaDias(h, -59), ate: somaDias(h, -30) }, rotulo: 'Últimos 30 dias', comparacao: 'que os 30 dias antes', dias: 30 };
    case 'mes': {
      const de = `${h.slice(0, 7)}-01`;
      const n = diasEntre(de, h);
      const antDe = `${somaDias(de, -1).slice(0, 7)}-01`;
      // Dia 31 contra um mês de 30: o período anterior não pode invadir o mês atual.
      const antAte = somaDias(antDe, n - 1) < de ? somaDias(antDe, n - 1) : somaDias(de, -1);
      return { de, ate: h, ant: { de: antDe, ate: antAte }, rotulo: `Números de ${nMes} até agora`, comparacao: `que ${nomeMes(antDe)} no mesmo ponto`, dias: n };
    }
    case 'ano': {
      const de = `${h.slice(0, 4)}-01-01`;
      const ano = Number(h.slice(0, 4)) - 1;
      return { de, ate: h, ant: { de: `${ano}-01-01`, ate: `${ano}${h.slice(4)}` }, rotulo: `Números de ${h.slice(0, 4)} até agora`, comparacao: `que ${ano} no mesmo ponto`, dias: diasEntre(de, h) };
    }
    case 'tudo': {
      const n = diasEntre(primeiroDia, h);
      return { de: primeiroDia, ate: h, ant: { de: somaDias(primeiroDia, -n), ate: somaDias(primeiroDia, -1) }, rotulo: 'Desde o início', comparacao: '', dias: n };
    }
    case 'livre': {
      const de = p.de ?? h;
      const ate = p.ate && p.ate >= de ? p.ate : de;
      const n = diasEntre(de, ate);
      return { de, ate, ant: { de: somaDias(de, -n), ate: somaDias(de, -1) }, rotulo: `De ${dataCurta(de)} a ${dataCurta(ate)}`, comparacao: `que os ${n} dias antes`, dias: n };
    }
  }
}

// O período escolhido vale para todas as telas e fica lembrado neste aparelho.
const CHAVE = 'servicai:painel-periodo';
const PADRAO: Periodo = { tipo: 'mes' };
const ouvintes = new Set<() => void>();
let atual: Periodo | null = null;

function ler(): Periodo {
  if (atual) return atual;
  atual = PADRAO;
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as Periodo | null;
    if (salvo && (salvo.tipo === 'livre' || OPCOES.some((o) => o.tipo === salvo.tipo))) atual = salvo;
  } catch {
    // Sem armazenamento (janela anônima, por exemplo): fica no padrão.
  }
  return atual;
}

export function mudarPeriodo(p: Periodo) {
  atual = p;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(p));
  } catch {
    // O período continua valendo até fechar a página.
  }
  ouvintes.forEach((f) => f());
}

export function usePeriodo(): Periodo {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    ler,
    () => PADRAO,
  );
}
