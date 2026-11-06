import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TAXONOMY } from './taxonomy.js';

describe('TAXONOMY', () => {
  const subcategories = TAXONOMY.flatMap((c) => c.subcategories);

  it('não repete slug nem nome, pois prestadores e pedidos guardam o nome', () => {
    expect(new Set(subcategories.map((s) => s.slug)).size).toBe(subcategories.length);
    expect(new Set(subcategories.map((s) => s.label)).size).toBe(subcategories.length);
    expect(new Set(TAXONOMY.map((c) => c.slug)).size).toBe(TAXONOMY.length);
  });

  it('é igual à cópia usada pelo site', () => {
    const normalize = (text: string) => text.replace(/\r\n/g, '\n');
    const api = readFileSync(resolve(process.cwd(), 'src/categories/taxonomy.ts'), 'utf8');
    const web = readFileSync(resolve(process.cwd(), '../web/src/lib/taxonomy.ts'), 'utf8');
    expect(normalize(web)).toBe(normalize(api));
  });

  it('está inteira na migração', () => {
    const sql = readFileSync(
      resolve(process.cwd(), 'prisma/migrations/20261106120000_add_taxonomy_and_public_visibility/migration.sql'),
      'utf8',
    );
    for (const item of subcategories) expect(sql).toContain(`'${item.slug}'`);
  });
});
