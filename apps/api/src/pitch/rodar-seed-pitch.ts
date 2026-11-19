/**
 * `npm run seed:pitch` — recria os dados da demonstração do pitch no Postgres LOCAL.
 * Pode rodar quantas vezes quiser: volta sempre ao mesmo estado inicial.
 */
import 'dotenv/config';
import {
  assertBancoLocal,
  DEMO_EMAIL_CLIENTE,
  DEMO_EMAIL_ELETRICISTA,
  DEMO_SENHA,
  semearPitch,
} from './seed-pitch.js';

assertBancoLocal(process.env.DATABASE_URL);

// Importado só depois da checagem: o PrismaService abre o pool ao ser carregado.
const { PrismaService } = await import('../prisma/prisma.service.js');
const prisma = new PrismaService();

try {
  const r = await semearPitch(prisma);
  console.log('Dados do pitch prontos no banco local.');
  console.log(`  ${r.prestadores} prestadores, ${r.avaliacoes} avaliações`);
  console.log(`  Cliente:     ${DEMO_EMAIL_CLIENTE}`);
  console.log(`  Eletricista: ${DEMO_EMAIL_ELETRICISTA}`);
  console.log(`  Senha:       ${DEMO_SENHA}`);
} finally {
  await prisma.$disconnect();
}
