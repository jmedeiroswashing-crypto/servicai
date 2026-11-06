/**
 * Baixa as fotos da home pela API oficial da Pexels (licença de uso comercial
 * gratuito: https://www.pexels.com/license/), otimiza em WebP e gera os créditos.
 *
 *   PowerShell:  $env:PEXELS_API_KEY="sua-chave"; node scripts/download-images.mjs
 *   Bash:        PEXELS_API_KEY=sua-chave node scripts/download-images.mjs
 *
 * A chave é gratuita em https://www.pexels.com/api/. Rode dentro de apps/web e
 * revise as fotos antes de publicar. Elas ilustram categorias: nunca use como foto
 * de prestador nem associadas a nomes ou notas.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API_KEY = process.env.PEXELS_API_KEY;
const MAX_WIDTH = 1600;
const TARGET_BYTES = 150 * 1024;

const CATEGORIES = [
  ['reformas-e-construcao', 'latino construction worker renovating house', 'Pedreiro trabalhando em uma reforma'],
  ['casa-e-manutencao', 'latina woman cleaning house professional', 'Profissional fazendo a limpeza de uma casa'],
  ['assistencia-tecnica', 'technician repairing smartphone workbench', 'Técnico consertando um aparelho eletrônico'],
  ['automotivo', 'latino mechanic repairing car garage', 'Mecânico trabalhando em um carro'],
  ['beleza', 'latina hairdresser cutting hair salon', 'Cabeleireira atendendo em um salão'],
  ['saude-e-bem-estar', 'physiotherapist treating patient clinic', 'Fisioterapeuta atendendo um paciente'],
  ['cuidados', 'caregiver with elderly woman home', 'Cuidadora acompanhando uma idosa'],
  ['eventos', 'event photographer working party', 'Fotógrafo trabalhando em um evento'],
  ['pets', 'groomer bathing dog pet shop', 'Profissional dando banho em um cachorro'],
  ['fretes-e-mudancas', 'movers carrying boxes moving truck', 'Profissionais carregando caixas de uma mudança'],
  ['aulas', 'teacher tutoring student at table', 'Professora dando aula particular'],
  ['tecnologia-e-design', 'latino software developer working laptop', 'Desenvolvedor trabalhando no computador'],
  ['juridico-e-financeiro', 'lawyer meeting client office', 'Advogada atendendo em um escritório'],
];

const HERO = [
  ['electrician working on electrical panel', 'Eletricista trabalhando em um quadro de luz'],
  ['latina woman professional cleaning home', 'Profissional de limpeza em uma casa'],
  ['plumber fixing sink pipe', 'Encanador consertando uma pia'],
  ['barber cutting hair barbershop', 'Barbeiro atendendo um cliente'],
];

if (!API_KEY) {
  console.error('Defina PEXELS_API_KEY. A chave é gratuita em https://www.pexels.com/api/');
  process.exit(1);
}

const used = new Set();
const credits = [];

async function findPhoto(query) {
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('per_page', '15');
  const res = await fetch(url, { headers: { Authorization: API_KEY } });
  if (!res.ok) throw new Error(`Pexels respondeu ${res.status} para "${query}"`);
  const { photos } = await res.json();
  const photo = photos.find((p) => !used.has(p.id));
  if (!photo) throw new Error(`Nenhuma foto nova para "${query}"`);
  used.add(photo.id);
  return photo;
}

async function savePhoto(photo, relativePath) {
  const res = await fetch(photo.src.large2x);
  if (!res.ok) throw new Error(`Falha ao baixar a foto ${photo.id}`);
  const input = Buffer.from(await res.arrayBuffer());
  let output;
  for (const quality of [72, 62, 52, 42]) {
    output = await sharp(input).resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality }).toBuffer();
    if (output.length <= TARGET_BYTES) break;
  }
  const target = join(ROOT, 'public', relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, output);
  credits.push({ path: relativePath, author: photo.photographer, authorUrl: photo.photographer_url, url: photo.url });
  console.log(`${relativePath} (${Math.round(output.length / 1024)} KB), foto de ${photo.photographer}`);
}

const manifest = { hero: [], categories: {} };

for (const [slug, query, alt] of CATEGORIES) {
  const src = `images/categorias/${slug}.webp`;
  await savePhoto(await findPhoto(query), src);
  manifest.categories[slug] = { src: `/${src}`, alt };
}

for (const [index, [query, alt]] of HERO.entries()) {
  const src = `images/hero/profissional-${index + 1}.webp`;
  await savePhoto(await findPhoto(query), src);
  manifest.hero.push({ src: `/${src}`, alt });
}

writeFileSync(join(ROOT, 'src/lib/image-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const lines = [
  '# Créditos das imagens',
  '',
  'Fotos ilustrativas de categorias e da página inicial, da [Pexels](https://www.pexels.com/license/).',
  'Não mostram prestadores cadastrados no ServiçAi.',
  '',
  '| Arquivo | Autor | Fonte |',
  '|---|---|---|',
  ...credits.map((c) => `| ${c.path} | [${c.author}](${c.authorUrl}) | [Foto na Pexels](${c.url}) |`),
  '',
];
writeFileSync(join(ROOT, 'public/images/CREDITS.md'), lines.join('\n'));
console.log(`\n${credits.length} fotos salvas. Revise cada uma antes de publicar.`);
