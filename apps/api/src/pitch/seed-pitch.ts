/**
 * Dados da demonstração ao vivo do pitch (apps/web/src/app/pitch).
 *
 * Só roda em banco local (ver `assertBancoLocal`). Todas as contas usam o domínio
 * DEMO_DOMINIO; rodar de novo apaga tudo o que essas contas criaram (inclusive o
 * pedido, a proposta e as mensagens feitos durante uma apresentação) e recria o
 * estado inicial, para toda apresentação começar igual.
 *
 * O Score ServiçAi e a "completude" do perfil são calculados pelo código do próprio
 * app (ProvidersService.recalculateScore e refreshProfileComplete), não escritos à mão.
 */
import * as bcrypt from 'bcryptjs';
import {
  BookingStatus,
  BusinessMode,
  Plan,
  Role,
  Selo,
  SubscriptionStatus,
} from '../generated/prisma/enums.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ProvidersService } from '../providers/providers.service.js';
import { refreshProfileComplete } from '../providers/public-visibility.js';

export const DEMO_DOMINIO = 'demo.servicai.local';
export const DEMO_SENHA = 'pitch-demo-2026';
export const DEMO_CIDADE = 'Cruzeiro do Sul';
export const DEMO_UF = 'AC';
export const DEMO_EMAIL_CLIENTE = `cliente@${DEMO_DOMINIO}`;
export const DEMO_EMAIL_ELETRICISTA = `eletricista@${DEMO_DOMINIO}`;

const HOSTS_LOCAIS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
  'postgres',
  'host.docker.internal',
]);

/** Recusa qualquer banco que não seja local: o seed apaga e recria dados. */
export function assertBancoLocal(url: string | undefined): void {
  if (!url)
    throw new Error(
      'DATABASE_URL não definida. O seed do pitch só roda no Postgres local (docker-compose).',
    );
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error('DATABASE_URL inválida.');
  }
  if (!HOSTS_LOCAIS.has(host)) {
    throw new Error(
      `Seed do pitch recusado: o banco "${host}" não é local. Ele só roda no Postgres do docker-compose (localhost).`,
    );
  }
}

interface PrestadorDemo {
  chave: string;
  nome: string;
  especialidade: string;
  categoria: string;
  bio: string;
  anos: number;
  selo: Selo;
  plano: Plan;
  avatar: string;
  galeria: { url: string; titulo: string }[];
  servico: {
    titulo: string;
    descricao: string;
    precoMin: number;
    precoMax: number;
    tempo: string;
  };
  /** Notas dadas por cada avaliador: [geral, pontualidade, qualidade, preço, atendimento, comentário]. */
  avaliacoes: [number, number, number, number, number, string][];
}

const IMG = {
  eletricista: '/images/hero/profissional-1.webp',
  limpeza: '/images/hero/profissional-2.webp',
  encanador: '/images/hero/profissional-3.webp',
  profissional4: '/images/hero/profissional-4.webp',
  casa: '/images/categorias/casa-e-manutencao.webp',
  reforma: '/images/categorias/reformas-e-construcao.webp',
  tecnica: '/images/categorias/assistencia-tecnica.webp',
  mudanca: '/images/categorias/fretes-e-mudancas.webp',
};

/** O eletricista que fica logado no painel durante a demo. */
export const ELETRICISTA_DEMO: PrestadorDemo = {
  chave: 'eletricista',
  nome: 'Rafael Souza',
  especialidade: 'Eletricista residencial',
  categoria: 'Eletricista',
  bio: 'Eletricista residencial em Cruzeiro do Sul. Troca de chuveiro e resistência, quadro de energia, tomadas e iluminação.',
  anos: 9,
  selo: Selo.OURO,
  plano: Plan.PRO,
  avatar: IMG.eletricista,
  galeria: [
    { url: IMG.eletricista, titulo: 'Quadro de energia organizado' },
    { url: IMG.reforma, titulo: 'Instalação em obra' },
    { url: IMG.casa, titulo: 'Iluminação da sala' },
  ],
  servico: {
    titulo: 'Troca de chuveiro e resistência',
    descricao:
      'Troca de chuveiro elétrico ou resistência, com teste do disjuntor e da fiação.',
    precoMin: 120,
    precoMax: 220,
    tempo: '1 a 2 horas',
  },
  avaliacoes: [
    [5, 5, 5, 4.5, 5, 'Chegou no horário e resolveu o chuveiro em meia hora.'],
    [5, 5, 5, 5, 5, 'Explicou o problema do disjuntor e cobrou o combinado.'],
    [4.5, 4, 5, 4.5, 5, 'Serviço caprichado, atrasou só um pouco.'],
    [5, 5, 4.5, 4.5, 5, 'Muito educado, deixou tudo limpo.'],
    [5, 5, 5, 4, 5, 'Trocou o quadro inteiro, recomendo.'],
  ],
};

export const OUTROS_PRESTADORES: PrestadorDemo[] = [
  {
    chave: 'eletricista2',
    nome: 'Marcos Lima',
    especialidade: 'Eletricista',
    categoria: 'Eletricista',
    bio: 'Instalações elétricas e manutenção predial.',
    anos: 4,
    selo: Selo.NENHUM,
    plano: Plan.GRATIS,
    avatar: IMG.profissional4,
    galeria: [{ url: IMG.reforma, titulo: 'Fiação nova' }],
    servico: {
      titulo: 'Instalação de tomadas',
      descricao: 'Instalação e troca de tomadas e interruptores.',
      precoMin: 80,
      precoMax: 150,
      tempo: '1 hora',
    },
    avaliacoes: [
      [4, 4, 4, 4.5, 4, 'Bom serviço.'],
      [4.5, 4, 4.5, 5, 4.5, 'Preço justo.'],
    ],
  },
  {
    chave: 'encanador',
    nome: 'Paulo Rocha',
    especialidade: 'Encanador',
    categoria: 'Encanador',
    bio: 'Vazamentos, desentupimento e instalação de caixa d’água.',
    anos: 12,
    selo: Selo.PRATA,
    plano: Plan.GRATIS,
    avatar: IMG.encanador,
    galeria: [
      { url: IMG.encanador, titulo: 'Troca de tubulação' },
      { url: IMG.casa, titulo: 'Banheiro reformado' },
    ],
    servico: {
      titulo: 'Conserto de vazamento',
      descricao: 'Localização e conserto de vazamentos.',
      precoMin: 100,
      precoMax: 250,
      tempo: '1 a 3 horas',
    },
    avaliacoes: [
      [5, 5, 5, 4.5, 5, 'Achou o vazamento rápido.'],
      [4.5, 4.5, 4.5, 4.5, 5, 'Atencioso.'],
      [5, 4.5, 5, 5, 5, 'Resolveu de primeira.'],
    ],
  },
  {
    chave: 'diarista',
    nome: 'Cláudia Santos',
    especialidade: 'Diarista',
    categoria: 'Diarista',
    bio: 'Faxina completa de casas e apartamentos.',
    anos: 7,
    selo: Selo.NENHUM,
    plano: Plan.GRATIS,
    avatar: IMG.limpeza,
    galeria: [{ url: IMG.limpeza, titulo: 'Faxina completa' }],
    servico: {
      titulo: 'Faxina completa',
      descricao: 'Limpeza completa de apartamento de até 3 quartos.',
      precoMin: 150,
      precoMax: 220,
      tempo: '6 horas',
    },
    avaliacoes: [
      [5, 5, 5, 5, 5, 'Casa impecável.'],
      [4.5, 5, 4.5, 4.5, 4.5, 'Muito cuidadosa.'],
    ],
  },
  {
    chave: 'pintor',
    nome: 'André Costa',
    especialidade: 'Pintor',
    categoria: 'Pintor',
    bio: 'Pintura residencial interna e externa.',
    anos: 10,
    selo: Selo.NENHUM,
    plano: Plan.GRATIS,
    avatar: IMG.reforma,
    galeria: [{ url: IMG.reforma, titulo: 'Fachada pintada' }],
    servico: {
      titulo: 'Pintura de quarto',
      descricao: 'Pintura de paredes e teto com massa corrida.',
      precoMin: 300,
      precoMax: 600,
      tempo: '1 a 2 dias',
    },
    avaliacoes: [[4.5, 4, 5, 4.5, 4.5, 'Acabamento muito bom.']],
  },
  {
    chave: 'arcondicionado',
    nome: 'Bruno Ferreira',
    especialidade: 'Técnico de ar-condicionado',
    categoria: 'Ar-condicionado',
    bio: 'Instalação, limpeza e manutenção de split.',
    anos: 6,
    selo: Selo.NENHUM,
    plano: Plan.GRATIS,
    avatar: IMG.tecnica,
    galeria: [{ url: IMG.tecnica, titulo: 'Limpeza de split' }],
    servico: {
      titulo: 'Limpeza de ar-condicionado',
      descricao: 'Higienização completa de split.',
      precoMin: 150,
      precoMax: 250,
      tempo: '2 horas',
    },
    avaliacoes: [
      [4.5, 4.5, 4.5, 4, 5, 'Pontual.'],
      [4, 4, 4, 4, 4, 'Ok.'],
    ],
  },
  {
    chave: 'montador',
    nome: 'Fernanda Ribeiro',
    especialidade: 'Montadora de móveis',
    categoria: 'Montador de móveis',
    bio: 'Montagem e desmontagem de móveis planejados e de loja.',
    anos: 5,
    selo: Selo.NENHUM,
    plano: Plan.GRATIS,
    avatar: IMG.mudanca,
    galeria: [{ url: IMG.mudanca, titulo: 'Guarda-roupa montado' }],
    servico: {
      titulo: 'Montagem de guarda-roupa',
      descricao: 'Montagem de guarda-roupa de até 6 portas.',
      precoMin: 120,
      precoMax: 200,
      tempo: '3 horas',
    },
    avaliacoes: [[5, 5, 5, 5, 5, 'Rápida e cuidadosa.']],
  },
];

const AVALIADORES = ['Ana P.', 'João M.', 'Luciana R.', 'Pedro S.', 'Carla F.'];

/**
 * Painel de gestão do eletricista (tela de demo da gestão): compromissos na agenda,
 * entradas e saídas do mês e a meta do mês. Datas relativas a hoje, para a demo
 * sempre mostrar o mês corrente.
 */
async function semearGestao(
  prisma: PrismaService,
  providerId: string,
): Promise<void> {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth();
  const hoje = agora.getDate();
  const noMes = (dia: number) =>
    new Date(ano, mes, Math.min(dia, hoje), 10, 0, 0);
  const daquiA = (dias: number, hora: number, minuto = 0) =>
    new Date(ano, mes, hoje + dias, hora, minuto, 0);

  await prisma.income.createMany({
    data: [
      {
        providerId,
        description: 'Troca de chuveiro — Centro',
        amount: 180,
        date: noMes(1),
      },
      {
        providerId,
        description: 'Instalação de 4 tomadas',
        amount: 240,
        date: noMes(3),
      },
      {
        providerId,
        description: 'Revisão do quadro de energia',
        amount: 350,
        date: noMes(6),
      },
      {
        providerId,
        description: 'Troca de resistência',
        amount: 120,
        date: noMes(9),
      },
      {
        providerId,
        description: 'Iluminação da sala',
        amount: 280,
        date: noMes(12),
      },
      {
        providerId,
        description: 'Conserto de disjuntor',
        amount: 150,
        date: noMes(15),
      },
    ],
  });
  await prisma.expense.createMany({
    data: [
      {
        providerId,
        description: 'Fio, disjuntores e fita',
        category: 'Material/insumos',
        amount: 310,
        date: noMes(2),
      },
      {
        providerId,
        description: 'Combustível da moto',
        category: 'Transporte/combustível',
        amount: 140,
        date: noMes(7),
      },
      {
        providerId,
        description: 'Alicate amperímetro',
        category: 'Ferramentas e equipamentos',
        amount: 95,
        date: noMes(11),
      },
    ],
  });
  await prisma.financialGoal.create({
    data: {
      providerId,
      month: `${ano}-${String(mes + 1).padStart(2, '0')}`,
      targetAmount: 1200,
    },
  });
  await prisma.appointment.createMany({
    data: [
      {
        providerId,
        title: 'Troca de chuveiro',
        notes: 'Cliente do ServiçAi',
        scheduledAt: daquiA(0, 21),
      },
      {
        providerId,
        title: 'Instalação de ventilador de teto',
        scheduledAt: daquiA(1, 8, 30),
      },
      {
        providerId,
        title: 'Revisão do quadro de energia',
        scheduledAt: daquiA(1, 14),
      },
      {
        providerId,
        title: 'Orçamento de fiação nova',
        scheduledAt: daquiA(2, 9),
      },
    ],
  });
}

export interface ResultadoSeedPitch {
  clienteId: string;
  eletricistaUserId: string;
  eletricistaProviderId: string;
  prestadores: number;
  avaliacoes: number;
}

/** Apaga tudo o que pertence às contas da demo, na ordem que as chaves estrangeiras exigem. */
export async function limparPitch(prisma: PrismaService): Promise<void> {
  const usuarios = await prisma.user.findMany({
    where: { email: { endsWith: `@${DEMO_DOMINIO}` } },
    select: { id: true },
  });
  if (usuarios.length === 0) return;
  const userIds = usuarios.map((u) => u.id);
  const prestadores = await prisma.providerProfile.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const providerIds = prestadores.map((p) => p.id);

  const conversas = {
    OR: [{ clientId: { in: userIds } }, { providerId: { in: providerIds } }],
  };
  const reservas = {
    OR: [{ clientId: { in: userIds } }, { providerId: { in: providerIds } }],
  };

  await prisma.$transaction([
    prisma.message.deleteMany({
      where: {
        OR: [{ senderId: { in: userIds } }, { conversation: conversas }],
      },
    }),
    prisma.conversation.deleteMany({ where: conversas }),
    prisma.review.deleteMany({
      where: {
        OR: [
          { clientId: { in: userIds } },
          { providerId: { in: providerIds } },
        ],
      },
    }),
    prisma.booking.deleteMany({ where: reservas }),
    prisma.lastMinuteDeal.updateMany({
      where: { claimedById: { in: userIds } },
      data: { claimedById: null },
    }),
    prisma.report.updateMany({
      where: { resolvedById: { in: userIds } },
      data: { resolvedById: null },
    }),
    prisma.report.updateMany({
      where: { respondentId: { in: userIds } },
      data: { respondentId: null },
    }),
    // Perfil, assinatura, galeria, serviços, pedidos, propostas e notificações caem em cascata.
    prisma.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);
}

export async function semearPitch(
  prisma: PrismaService,
): Promise<ResultadoSeedPitch> {
  await limparPitch(prisma);

  const passwordHash = await bcrypt.hash(DEMO_SENHA, 10);
  const providers = new ProvidersService(prisma);
  const daquiA30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const cliente = await prisma.user.create({
    data: {
      email: DEMO_EMAIL_CLIENTE,
      passwordHash,
      name: 'Juliana Alves',
      phone: '68999990000',
      role: Role.CLIENTE,
      city: DEMO_CIDADE,
      addressState: DEMO_UF,
      verified: true,
    },
  });

  const avaliadores = [];
  for (const [i, nome] of AVALIADORES.entries()) {
    avaliadores.push(
      await prisma.user.create({
        data: {
          email: `avaliador${i + 1}@${DEMO_DOMINIO}`,
          passwordHash,
          name: nome,
          role: Role.CLIENTE,
          city: DEMO_CIDADE,
          addressState: DEMO_UF,
          verified: true,
        },
      }),
    );
  }

  let eletricistaUserId = '';
  let eletricistaProviderId = '';
  let totalAvaliacoes = 0;
  const todos = [ELETRICISTA_DEMO, ...OUTROS_PRESTADORES];

  for (const p of todos) {
    const user = await prisma.user.create({
      data: {
        email: `${p.chave}@${DEMO_DOMINIO}`,
        passwordHash,
        name: p.nome,
        role: Role.PRESTADOR,
        avatarUrl: p.avatar,
        city: DEMO_CIDADE,
        addressState: DEMO_UF,
        verified: true,
      },
    });
    const perfil = await prisma.providerProfile.create({
      data: {
        userId: user.id,
        specialty: p.especialidade,
        categories: [p.categoria],
        bio: p.bio,
        city: DEMO_CIDADE,
        yearsExperience: p.anos,
        selo: p.selo,
        clientsCount: p.avaliacoes.length,
        businessMode: BusinessMode.COMPLETO,
        subscription: {
          create: {
            plan: p.plano,
            status: SubscriptionStatus.ATIVA,
            currentPeriodEnd: p.plano === Plan.GRATIS ? null : daquiA30Dias,
          },
        },
        services: {
          create: {
            title: p.servico.titulo,
            description: p.servico.descricao,
            category: p.categoria,
            priceMin: p.servico.precoMin,
            priceMax: p.servico.precoMax,
            estimatedTime: p.servico.tempo,
          },
        },
        media: {
          create: p.galeria.map((g) => ({
            type: 'image',
            url: g.url,
            title: g.titulo,
          })),
        },
      },
    });

    for (const [
      i,
      [geral, pontualidade, qualidade, preco, atendimento, comentario],
    ] of p.avaliacoes.entries()) {
      const avaliador = avaliadores[i % avaliadores.length];
      const quando = new Date(Date.now() - (i + 1) * 9 * 24 * 60 * 60 * 1000);
      const reserva = await prisma.booking.create({
        data: {
          clientId: avaliador.id,
          providerId: perfil.id,
          status: BookingStatus.CONCLUIDO,
          scheduledAt: quando,
          category: p.categoria,
          priceQuoted: p.servico.precoMin,
          notes: p.servico.titulo,
        },
      });
      await prisma.review.create({
        data: {
          bookingId: reserva.id,
          clientId: avaliador.id,
          providerId: perfil.id,
          rating: geral,
          pontualidade,
          qualidade,
          preco,
          atendimento,
          comment: comentario,
          createdAt: quando,
        },
      });
      totalAvaliacoes++;
    }

    await providers.recalculateScore(perfil.id);
    await refreshProfileComplete(prisma, user.id);

    if (p === ELETRICISTA_DEMO) {
      eletricistaUserId = user.id;
      eletricistaProviderId = perfil.id;
      await semearGestao(prisma, perfil.id);
    }
  }

  return {
    clienteId: cliente.id,
    eletricistaUserId,
    eletricistaProviderId,
    prestadores: todos.length,
    avaliacoes: totalAvaliacoes,
  };
}
