/**
 * `npm run pitch:servir` — serve o site já compilado (pasta out/, gerada por
 * `npm run build`) em http://localhost:3000, sem internet e sem o `next dev`
 * (nada compila nem recarrega durante a apresentação).
 *
 * Rode `npm run build` antes, com internet: a fonte do site é baixada no build.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../out/', import.meta.url));
const PORTA = Number(process.env.PORT ?? 3000);

if (!existsSync(join(RAIZ, 'pitch.html'))) {
  console.error('Não achei out/pitch.html. Rode "npm run build" em apps/web primeiro.');
  process.exit(1);
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
};

function arquivo(caminho) {
  const limpo = normalize(decodeURIComponent(caminho)).replace(/^([/\\])+/, '');
  if (limpo.startsWith('..')) return null;
  const base = join(RAIZ, limpo);
  for (const candidato of [base, `${base}.html`, join(base, 'index.html')]) {
    if (existsSync(candidato) && statSync(candidato).isFile()) return candidato;
  }
  return null;
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const encontrado = arquivo(url.pathname);
  const achado = encontrado ?? join(RAIZ, '404.html');
  const tamanho = statSync(achado).size;
  const tipo = TIPOS[extname(achado).toLowerCase()] ?? 'application/octet-stream';
  const intervalo = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  // Vídeos do plano B precisam de Range para tocar.
  if (encontrado && intervalo && tipo === 'video/mp4') {
    const inicio = Number(intervalo[1] || 0);
    const fim = intervalo[2] ? Number(intervalo[2]) : tamanho - 1;
    res.writeHead(206, {
      'Content-Type': tipo,
      'Content-Range': `bytes ${inicio}-${fim}/${tamanho}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': fim - inicio + 1,
    });
    createReadStream(achado, { start: inicio, end: fim }).pipe(res);
    return;
  }
  res.writeHead(encontrado ? 200 : 404, { 'Content-Type': tipo, 'Content-Length': tamanho, 'Accept-Ranges': 'bytes' });
  createReadStream(achado).pipe(res);
}).listen(PORTA, () => {
  console.log(`Pitch em http://localhost:${PORTA}/pitch (apresentador: /pitch/apresentador)`);
});
