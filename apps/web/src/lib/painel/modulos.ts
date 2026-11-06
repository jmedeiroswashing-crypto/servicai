import {
  BadgeDollarSign,
  CalendarDays,
  CalendarRange,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileBarChart,
  Home,
  Megaphone,
  MessageCircle,
  ReceiptText,
  Target,
  UserRoundCog,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { BusinessMode } from '../types';

/** O mapa do painel: onde cada módulo aparece, o que faz e a ajuda do "?". */
export type Grupo = 'operacao' | 'atendimento' | 'financeiro' | 'relacionamento' | 'negocio';

export const GRUPOS: Record<Grupo, string> = {
  operacao: 'Operação',
  atendimento: 'Atendimento',
  financeiro: 'Financeiro',
  relacionamento: 'Relacionamento',
  negocio: 'Meu negócio',
};

export type Modulo = {
  id: string;
  nome: string;
  href: string;
  frase: string;
  ajuda: string[];
  icone: LucideIcon;
  grupo: Grupo;
  /** A tela mostra números: tem seletor de período no cabeçalho. */
  periodo?: boolean;
  /** Outras rotas que abrem dentro deste módulo. */
  match?: string[];
  acao?: { href: string; nome: string };
  /** Só para quem usa as ferramentas de gestão. */
  financeiro?: boolean;
  /** Só para quem quer ser encontrado por novos clientes. */
  captacao?: boolean;
};

export const MODULOS: Modulo[] = [
  {
    id: 'inicio',
    nome: 'Início',
    href: '/painel',
    frase: 'Faturamento, lucro e o que pede atenção hoje.',
    ajuda: [
      'Troque o período no cabeçalho: vale para todas as telas com números.',
      'A setinha compara com o período anterior do mesmo tamanho.',
      'Lucro é o faturamento menos as despesas que você lançou.',
      'O faturamento é o que foi combinado ou lançado: o ServiçAi não processa pagamentos.',
    ],
    icone: Home,
    grupo: 'operacao',
    periodo: true,
    acao: { href: '/painel/lancar', nome: 'Lançar serviço' },
  },
  {
    id: 'lancar',
    nome: 'Lançar serviço',
    href: '/painel/lancar',
    frase: 'Registre um serviço feito fora do app e gere o recibo.',
    ajuda: [
      'Serviço concluído no Quadro já entra sozinho: aqui é para o que foi combinado por fora.',
      'O nome do cliente e a forma de pagamento são opcionais, mas ajudam nos relatórios.',
      'Depois de lançar, baixe o recibo ou envie pelo WhatsApp.',
    ],
    icone: BadgeDollarSign,
    grupo: 'operacao',
    financeiro: true,
  },
  {
    id: 'feitos',
    nome: 'Serviços feitos',
    href: '/painel/feitos',
    frase: 'Tudo que entrou no período, com recibo.',
    ajuda: ['Busque pelo serviço ou pelo cliente.', 'O lançamento manual pode ser apagado aqui. O que veio de uma reserva concluída fica registrado.'],
    icone: ReceiptText,
    grupo: 'operacao',
    periodo: true,
    financeiro: true,
    acao: { href: '/painel/lancar', nome: 'Lançar serviço' },
  },
  {
    id: 'caixa',
    nome: 'Caixa do dia',
    href: '/painel/caixa',
    frase: 'Abra com o troco, registre o que entra e sai, e feche conferindo o esperado.',
    ajuda: ['Abra o caixa com o troco antes do primeiro serviço.', 'No fechamento, conte a gaveta: a diferença fica registrada.'],
    icone: Wallet,
    grupo: 'operacao',
    financeiro: true,
  },
  {
    id: 'calendario',
    nome: 'Calendário',
    href: '/painel/calendario',
    frase: 'Cada dia do mês com o que entrou e o que saiu.',
    ajuda: ['Verde é dia com lucro, vermelho é dia com prejuízo.', 'Toque no dia para ver os detalhes.'],
    icone: CalendarRange,
    grupo: 'operacao',
    financeiro: true,
  },
  {
    id: 'quadro',
    nome: 'Quadro de serviços',
    href: '/painel/quadro',
    frase: 'Do pedido novo ao concluído, com um toque para avançar.',
    ajuda: [
      'Cada serviço anda no quadro: Novos pedidos, Confirmados, Em andamento e Concluídos.',
      'O botão do cartão leva para a próxima etapa. Concluir com valor combinado já lança o faturamento.',
      'O botão do WhatsApp abre a mensagem pronta para o cliente.',
    ],
    icone: ClipboardList,
    grupo: 'atendimento',
  },
  {
    id: 'agenda',
    nome: 'Agenda',
    href: '/painel/agenda',
    frase: 'Reservas e compromissos, por dia.',
    ajuda: ['Adicione compromissos seus: eles avisam na hora marcada.', 'As reservas dos clientes aparecem aqui sozinhas.'],
    icone: CalendarDays,
    grupo: 'atendimento',
  },
  {
    id: 'mensagens',
    nome: 'Mensagens',
    href: '/mensagens',
    frase: 'Conversas com os clientes.',
    ajuda: ['Responda por aqui para manter o histórico da conversa.'],
    icone: MessageCircle,
    grupo: 'atendimento',
  },
  {
    id: 'despesas',
    nome: 'Despesas',
    href: '/painel/despesas',
    frase: 'O que saiu, por categoria, com despesa que repete todo mês.',
    ajuda: ['Lance a despesa e escolha a categoria.', 'Marque "repetir todo mês" para aluguel, internet e outras contas fixas.'],
    icone: CircleDollarSign,
    grupo: 'financeiro',
    periodo: true,
    financeiro: true,
  },
  {
    id: 'metas',
    nome: 'Metas',
    href: '/painel/metas',
    frase: 'Meta de lucro do mês e projeção de fechamento.',
    ajuda: ['A projeção leva o ritmo do mês até hoje ao último dia.', 'A marca na barra mostra quanto do mês já passou.'],
    icone: Target,
    grupo: 'financeiro',
    financeiro: true,
  },
  {
    id: 'relatorios',
    nome: 'Relatórios',
    href: '/painel/relatorios',
    frase: 'Dia a dia, por serviço, por forma de pagamento, despesas e clientes.',
    ajuda: ['Escolha o relatório e o período no cabeçalho.', '"Baixar planilha" serve para o contador; "Imprimir" para guardar.'],
    icone: FileBarChart,
    grupo: 'financeiro',
    periodo: true,
    financeiro: true,
  },
  {
    id: 'clientes',
    nome: 'Clientes',
    href: '/painel/clientes',
    frase: 'Quem já fechou serviço com você, com listas prontas para manter contato.',
    ajuda: ['As listas Fiéis e Sumidos já vêm com mensagem pronta no WhatsApp.'],
    icone: Users,
    grupo: 'relacionamento',
  },
  {
    id: 'conseguir',
    nome: 'Conseguir clientes',
    href: '/painel/conseguir-clientes',
    frase: 'Oportunidades, vagas de última hora e prospecção.',
    ajuda: ['Em Oportunidades, envie proposta para quem está procurando seu serviço.', 'Tem horário livre? Publique uma vaga de última hora.'],
    icone: Megaphone,
    grupo: 'relacionamento',
    match: ['/painel/oportunidades', '/painel/vagas-ultima-hora', '/painel/prospeccao'],
    captacao: true,
  },
  {
    id: 'perfil',
    nome: 'Perfil e serviços',
    href: '/painel/perfil',
    frase: 'Os serviços que você oferece, preços, fotos e dados do negócio.',
    ajuda: ['Só aparece para os clientes o perfil completo: foto, descrição, cidade e serviço.'],
    icone: UserRoundCog,
    grupo: 'negocio',
  },
  {
    id: 'plano',
    nome: 'Meu plano',
    href: '/painel/plano',
    frase: 'O que seu plano inclui e como mudar.',
    ajuda: ['Veja os limites do seu plano e o que muda em cada um.'],
    icone: CreditCard,
    grupo: 'negocio',
  },
];

export const temFinanceiro = (modo?: BusinessMode | null) => modo !== 'CONTRATACAO';
export const temCaptacao = (modo?: BusinessMode | null) => modo !== 'GESTAO';

export function menuDe(modo?: BusinessMode | null): Modulo[] {
  return MODULOS.filter((m) => (!m.financeiro || temFinanceiro(modo)) && (!m.captacao || temCaptacao(modo)));
}

export function moduloDaRota(pathname: string): Modulo | undefined {
  const limpo = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  return MODULOS.find((m) => m.href === limpo || m.match?.includes(limpo));
}
