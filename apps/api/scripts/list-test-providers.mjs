/**
 * Lista prestadores que parecem conta de teste ou têm dados problemáticos.
 * Por padrão só lê o banco. Nada é apagado por este script.
 *
 *   node scripts/list-test-providers.mjs
 *   node scripts/list-test-providers.mjs --mark-test=<id>,<id>   (esconde da vitrine)
 *
 * Usa o DATABASE_URL do ambiente ou do arquivo .env.
 */
import 'dotenv/config';
import pg from 'pg';

const NAME_HINTS = '(test|teste|testes|debug|seller|prestador|prestadora|vendedor)';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const markArg = process.argv.find((arg) => arg.startsWith('--mark-test='));
  if (markArg) {
    const ids = markArg.split('=')[1].split(',').filter(Boolean);
    const result = await client.query('UPDATE "ProviderProfile" SET "isTest" = true WHERE "id" = ANY($1)', [ids]);
    console.log(`${result.rowCount} perfil(is) marcado(s) como teste.`);
  } else {
    const { rows } = await client.query(
      `SELECT p."id", u."name", p."specialty", p."city", p."isTest", p."profileComplete",
              (SELECT count(*) FROM "Booking" b WHERE b."providerId" = p."id")::int AS "reservas",
              (SELECT count(*) FROM "Review" r WHERE r."providerId" = p."id")::int AS "avaliacoes",
              (SELECT count(*) FROM "Conversation" c WHERE c."providerId" = p."id")::int AS "conversas"
       FROM "ProviderProfile" p
       JOIN "User" u ON u."id" = p."userId"
       WHERE u."deletedAt" IS NULL
         AND (p."isTest"
              OR u."name" ~* ('\\m' || $1 || '\\M')
              OR position(U&'\\FFFD' IN u."name") > 0
              OR position(U&'\\FFFD' IN p."city") > 0
              OR p."city" = 'Não informado')
       ORDER BY p."createdAt"`,
      [NAME_HINTS],
    );
    console.table(rows);
    console.log(`${rows.length} perfil(is) para revisar. Nenhum dado foi alterado.`);
  }
} finally {
  await client.end();
}
