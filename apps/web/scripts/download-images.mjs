/**
 * Baixa da Pexels (https://www.pexels.com/license/) as fotos ilustrativas da home,
 * otimiza em WebP e gera os créditos. Rode em apps/web: node scripts/download-images.mjs
 *
 * Para trocar uma foto, edite a lista e rode de novo. Elas ilustram categorias: nunca
 * use como foto de prestador nem associadas a nomes ou notas.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_WIDTH = 1600;
const TARGET_BYTES = 150 * 1024;

const CATEGORIES = [
  ['reformas-e-construcao', 29735767, 'construction-worker-building-foundation-outdoors', 'Rodolfo Gaion', 'Pedreiro trabalhando em uma fundação'],
  ['casa-e-manutencao', 6195198, 'woman-cleaning-the-house', 'Tima Miroshnichenko', 'Profissional fazendo a limpeza de uma casa'],
  ['assistencia-tecnica', 6754839, 'a-person-repairing-a-smartphone', 'Tima Miroshnichenko', 'Técnico consertando um celular'],
  ['automotivo', 8986040, 'a-mechanic-working-on-an-engine-in-an-auto-repair-shop', 'Artem Podrez', 'Mecânico trabalhando no motor de um carro'],
  ['beleza', 7755222, 'a-person-getting-a-haircut', 'RDNE Stock project', 'Profissional cortando cabelo em um salão'],
  ['cuidados', 29373893, 'elderly-care-at-home-generational-connection', 'Jsme MILA', 'Cuidadora acompanhando uma idosa em casa'],
  ['eventos', 18999581, 'photographer-taking-photos-at-an-integration-event', 'Matheus Bertelli', 'Fotógrafo trabalhando em um evento'],
  ['fretes-e-mudancas', 7464703, 'two-men-standing-carrying-cardboard-boxes', 'RDNE Stock project', 'Profissionais carregando caixas de uma mudança'],
  ['aulas', 6929183, 'teacher-discussing-her-lesson-with-her-student', 'Polina Tankilevitch', 'Professora dando aula para uma aluna'],
  ['tecnologia-e-design', 7988114, 'a-person-using-laptop', 'Mikhail Nilov', 'Desenvolvedor trabalhando no computador'],
  ['juridico-e-financeiro', 8112166, 'clients-and-lawyer-in-an-office', 'Pavel Danilyuk', 'Advogado atendendo clientes em um escritório'],
];

const HERO = [
  [34054474, 'young-technician-working-on-electrical-panel', 'Bulat843', 'Eletricista trabalhando em um quadro de luz'],
  [6195273, 'person-using-a-vacuum', 'Tima Miroshnichenko', 'Profissional de limpeza usando um aspirador'],
  [6419128, 'plumber-installs-pipe-fittings', 'Anıl Karakaya', 'Encanador instalando conexões'],
  [1836983, 'barber-cutting-man-s-hair', 'Th2city Santana', 'Barbeiro atendendo um cliente'],
];

const credits = [];

async function savePhoto(id, slug, author, relativePath) {
  const url = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${MAX_WIDTH}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Foto ${id}: resposta ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  let output;
  // Reduz a qualidade e, se ainda não bastar, o tamanho, até ficar dentro do limite.
  search: for (const width of [MAX_WIDTH, 1200, 1000]) {
    for (const quality of [72, 62, 52]) {
      output = await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer();
      if (output.length <= TARGET_BYTES) break search;
    }
  }
  const target = join(ROOT, 'public', relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, output);
  credits.push({ path: relativePath, author, page: `https://www.pexels.com/photo/${slug}-${id}/` });
  console.log(`${relativePath}: ${Math.round(output.length / 1024)} KB`);
}

const manifest = { hero: [], categories: {} };

for (const [category, id, slug, author, alt] of CATEGORIES) {
  const src = `images/categorias/${category}.webp`;
  await savePhoto(id, slug, author, src);
  manifest.categories[category] = { src: `/${src}`, alt };
}

for (const [index, [id, slug, author, alt]] of HERO.entries()) {
  const src = `images/hero/profissional-${index + 1}.webp`;
  await savePhoto(id, slug, author, src);
  manifest.hero.push({ src: `/${src}`, alt });
}

writeFileSync(join(ROOT, 'src/lib/image-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(
  join(ROOT, 'public/images/CREDITS.md'),
  [
    '# Créditos das imagens',
    '',
    'Fotos ilustrativas da [Pexels](https://www.pexels.com/license/). Não mostram prestadores cadastrados no ServiçAi.',
    '',
    '| Arquivo | Autor | Fonte |',
    '|---|---|---|',
    ...credits.map((c) => `| ${c.path} | ${c.author} | [Foto na Pexels](${c.page}) |`),
    '',
  ].join('\n'),
);
console.log(`\n${credits.length} fotos salvas.`);
