/**
 * Testes da demonstração do pitch.
 *
 * Os testes de banco só rodam com o Postgres LOCAL de pé (docker compose up -d e
 * `npx prisma migrate deploy`); sem ele, são pulados e o motivo aparece no console.
 */
import 'dotenv/config';
import { AiService } from '../ai/ai.service.js';
import {
  DEMO_CONTAS,
  DEMO_ROTEIRO,
} from '../../../web/src/pitch/pitch-dados.js';
import {
  assertBancoLocal,
  DEMO_CIDADE,
  DEMO_EMAIL_CLIENTE,
  DEMO_EMAIL_ELETRICISTA,
  DEMO_SENHA,
  DEMO_UF,
  ELETRICISTA_DEMO,
  OUTROS_PRESTADORES,
} from './seed-pitch.js';

describe('seed do pitch: segurança', () => {
  it('recusa qualquer banco que não seja local', () => {
    expect(() =>
      assertBancoLocal(
        'postgresql://u:p@aws-0-sa-east-1.pooler.supabase.com:5432/postgres',
      ),
    ).toThrow(/não é local/);
    expect(() => assertBancoLocal(undefined)).toThrow();
    expect(() =>
      assertBancoLocal(
        'postgresql://servicai:servicai@localhost:5432/servicai',
      ),
    ).not.toThrow();
    expect(() =>
      assertBancoLocal(
        'postgresql://servicai:servicai@127.0.0.1:5432/servicai',
      ),
    ).not.toThrow();
  });

  it('as contas do roteiro do pitch são as que o seed cria', () => {
    expect(DEMO_CONTAS.cliente).toEqual({
      email: DEMO_EMAIL_CLIENTE,
      senha: DEMO_SENHA,
    });
    expect(DEMO_CONTAS.eletricista).toEqual({
      email: DEMO_EMAIL_ELETRICISTA,
      senha: DEMO_SENHA,
    });
    expect(DEMO_CONTAS.cidade).toBe(DEMO_CIDADE);
    expect(DEMO_CONTAS.uf).toBe(DEMO_UF);
  });

  it('tem cerca de 6 prestadores em categorias diferentes, além do eletricista logado', () => {
    expect(OUTROS_PRESTADORES.length).toBeGreaterThanOrEqual(5);
    const categorias = new Set(OUTROS_PRESTADORES.map((p) => p.categoria));
    expect(categorias.size).toBeGreaterThanOrEqual(5);
    for (const p of [ELETRICISTA_DEMO, ...OUTROS_PRESTADORES]) {
      expect(p.avaliacoes.length).toBeGreaterThan(0);
      expect(p.galeria.length).toBeGreaterThan(0);
    }
  });
});

describe('tela 8: fallback heurístico, sem OPENAI_API_KEY', () => {
  const ai = new AiService({ get: () => undefined } as never);
  const { mensagem1, mensagem2, esperado } = DEMO_ROTEIRO.pedido;

  it('extrai categoria, cidade e orçamento das duas mensagens da demo', async () => {
    const r1 = await ai.parseServiceRequestIntake(mensagem1, {});
    expect(r1.draft.category).toBe(esperado.categoria);
    expect(r1.draft.budgetMax).toBe(esperado.orcamentoMax);
    expect(r1.draft.budgetMin).toBeUndefined();
    expect(r1.readyToPublish).toBe(false);

    const r2 = await ai.parseServiceRequestIntake(mensagem2, r1.draft);
    expect(r2.draft.city).toBe(esperado.cidade);
    expect(r2.draft.state).toBe(esperado.uf);
    expect(r2.draft.category).toBe(esperado.categoria);
    expect(r2.draft.budgetMax).toBe(esperado.orcamentoMax);
    expect(r2.readyToPublish).toBe(true);
  });

  it('o pedido cai na categoria e na cidade do eletricista do seed', async () => {
    const r1 = await ai.parseServiceRequestIntake(mensagem1, {});
    const r2 = await ai.parseServiceRequestIntake(mensagem2, r1.draft);
    expect(r2.draft.category).toBe(ELETRICISTA_DEMO.categoria);
    expect(r2.draft.city).toBe(DEMO_CIDADE);
  });

  it('a busca da tela 9 entende "eletricista"', async () => {
    const intent = await ai.parseSearchIntent(DEMO_ROTEIRO.busca.termo);
    expect(intent.category).toBe('eletricista');
  });
});

// ---------------------------------------------------------------------------
// Banco local
// ---------------------------------------------------------------------------

type Prisma = import('../prisma/prisma.service.js').PrismaService;

async function abrirBancoLocal(): Promise<Prisma | null> {
  try {
    assertBancoLocal(process.env.DATABASE_URL);
  } catch {
    console.warn('[pitch] DATABASE_URL não é local: testes de banco pulados.');
    return null;
  }
  const { PrismaService } = await import('../prisma/prisma.service.js');
  const prisma = new PrismaService();
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1 FROM "User" LIMIT 1`,
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error('timeout')), 3000),
      ),
    ]);
    return prisma;
  } catch {
    console.warn(
      '[pitch] Postgres local fora do ar ou sem migrations: testes de banco pulados.',
    );
    await prisma.$disconnect().catch(() => undefined);
    return null;
  }
}

const prisma = await abrirBancoLocal();

// Cada caso roda o seed inteiro (hash de senha + 16 avaliações): mais lento que um teste de unidade.
describe.skipIf(!prisma)(
  'seed do pitch no banco local',
  { timeout: 30_000 },
  () => {
    const db = prisma as Prisma;

    afterAll(async () => {
      const { semearPitch } = await import('./seed-pitch.js');
      await semearPitch(db); // deixa o banco no estado inicial da demo
      await db.$disconnect();
    });

    async function retrato() {
      return db.user.findMany({
        where: { email: { endsWith: '@demo.servicai.local' } },
        select: {
          email: true,
          name: true,
          role: true,
          providerProfile: {
            select: {
              specialty: true,
              scoreIA: true,
              ratingAvg: true,
              profileComplete: true,
              isTest: true,
              _count: {
                select: { reviews: true, media: true, proposals: true },
              },
              subscription: {
                select: { plan: true, proposalsUsedCount: true },
              },
            },
          },
          _count: {
            select: {
              serviceRequests: true,
              notifications: true,
              messagesSent: true,
            },
          },
        },
        orderBy: { email: 'asc' },
      });
    }

    it('é repetível: rodar de novo, mesmo depois de uma apresentação, volta ao mesmo estado', async () => {
      const { semearPitch } = await import('./seed-pitch.js');
      const primeiro = await semearPitch(db);
      const antes = await retrato();

      // Simula uma apresentação: pedido, proposta, conversa e notificação.
      const pedido = await db.serviceRequest.create({
        data: {
          clientId: primeiro.clienteId,
          category: 'Eletricista',
          title: 'x',
          description: 'y',
          city: DEMO_CIDADE,
        },
      });
      await db.proposal.create({
        data: {
          requestId: pedido.id,
          providerId: primeiro.eletricistaProviderId,
          price: 180,
          message: 'oi',
        },
      });
      const conversa = await db.conversation.create({
        data: {
          clientId: primeiro.clienteId,
          providerId: primeiro.eletricistaProviderId,
        },
      });
      await db.message.create({
        data: {
          conversationId: conversa.id,
          senderId: primeiro.clienteId,
          content: 'oi',
        },
      });
      await db.notification.create({
        data: {
          userId: primeiro.clienteId,
          type: 'NOVA_PROPOSTA',
          title: 't',
          body: 'b',
        },
      });

      const segundo = await semearPitch(db);
      const depois = await retrato();

      expect(depois).toEqual(antes);
      expect(segundo.prestadores).toBe(primeiro.prestadores);
      expect(segundo.avaliacoes).toBe(primeiro.avaliacoes);
      expect(await db.serviceRequest.count({ where: { id: pedido.id } })).toBe(
        0,
      );
      expect(await db.conversation.count({ where: { id: conversa.id } })).toBe(
        0,
      );
    });

    it('todo prestador do seed aparece na vitrine, com Score calculado pelo app', async () => {
      const { semearPitch } = await import('./seed-pitch.js');
      await semearPitch(db);
      const perfis = await db.providerProfile.findMany({
        where: { user: { email: { endsWith: '@demo.servicai.local' } } },
        include: { _count: { select: { reviews: true, media: true } } },
      });
      expect(perfis).toHaveLength(1 + OUTROS_PRESTADORES.length);
      for (const p of perfis) {
        expect(p.profileComplete).toBe(true);
        expect(p.isTest).toBe(false);
        expect(p.scoreIA).toBeGreaterThan(0);
        expect(p.scoreIA).toBeLessThanOrEqual(100);
        expect(p._count.reviews).toBeGreaterThan(0);
        expect(p._count.media).toBeGreaterThan(0);
      }
    });

    it('tela 10: a oportunidade que o eletricista recebe não expõe nome, telefone, e-mail nem endereço do cliente', async () => {
      const { semearPitch } = await import('./seed-pitch.js');
      const { RequestsService } =
        await import('../requests/requests.service.js');
      const r = await semearPitch(db);

      await db.user.update({
        where: { id: r.clienteId },
        data: {
          addressStreet: 'Rua da Aurora',
          addressNumber: '123',
          addressCep: '50050000',
        },
      });
      const cliente = await db.user.findUniqueOrThrow({
        where: { id: r.clienteId },
      });

      const ai = new AiService({ get: () => undefined } as never);
      const r1 = await ai.parseServiceRequestIntake(
        DEMO_ROTEIRO.pedido.mensagem1,
        {},
      );
      const r2 = await ai.parseServiceRequestIntake(
        DEMO_ROTEIRO.pedido.mensagem2,
        r1.draft,
      );

      const noop = { create: async () => undefined } as never;
      const requests = new RequestsService(db, noop, noop);
      const pedido = await requests.create(r.clienteId, {
        category: r2.draft.category!,
        title: r2.draft.title!,
        description: r2.draft.description!,
        city: r2.draft.city!,
        state: r2.draft.state,
        budgetMax: r2.draft.budgetMax,
      });

      const oportunidades = await requests.findMatchesForProvider(
        r.eletricistaUserId,
        {},
      );
      const oportunidade = oportunidades.find((o) => o.id === pedido.id);
      expect(oportunidade).toBeDefined();
      expect(oportunidade!.proximityLabel).toBe('Na sua cidade');

      const chaves = Object.keys(oportunidade!).map((k) => k.toLowerCase());
      for (const proibida of [
        'clientid',
        'client',
        'name',
        'nome',
        'phone',
        'telefone',
        'email',
        'address',
        'endereco',
        'cpf',
      ]) {
        expect(
          chaves.some((k) => k.includes(proibida)),
          `campo "${proibida}"`,
        ).toBe(false);
      }
      const texto = JSON.stringify(oportunidade).toLowerCase();
      for (const valor of [
        cliente.name,
        cliente.phone!,
        cliente.email,
        'rua da aurora',
        '50050000',
        cliente.id,
      ]) {
        expect(texto.includes(valor.toLowerCase()), `valor "${valor}"`).toBe(
          false,
        );
      }
    });
  },
);
