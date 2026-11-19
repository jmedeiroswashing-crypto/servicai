/**
 * `npm run gravar:demo` — grava o plano B: as telas 8 a 11 rodando de verdade
 * (API local + seed do pitch), em 1920×1080, e salva public/pitch/demo-8.mp4 …
 * demo-11.mp4. O telão toca esses vídeos se a API não responder ao abrir o pitch.
 *
 * Antes: docker compose up -d · npm run seed:pitch (apps/api) · API e site no ar.
 * Precisa do ffmpeg no PATH (converte o .webm do Playwright para .mp4).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const BASE = process.env.PITCH_URL ?? 'http://localhost:3000';
const DESTINO = fileURLToPath(new URL('../public/pitch/', import.meta.url));
const DURACOES = { 8: 16, 9: 14, 10: 14, 11: 8 };

const temp = mkdtempSync(join(tmpdir(), 'pitch-video-'));
let navegador;
for (const channel of ['chrome', 'msedge', undefined]) {
  try {
    navegador = await chromium.launch({ channel });
    break;
  } catch {
    /* tenta o próximo */
  }
}
if (!navegador) throw new Error('Nenhum navegador encontrado.');

const contexto = await navegador.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: temp, size: { width: 1920, height: 1080 } },
});
const inicioVideo = Date.now();
const page = await contexto.newPage();
await page.goto(`${BASE}/pitch?gravar=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__pitch?.pronta || window.__pitch?.modoVideo, null, { timeout: 120_000 });
const { modoVideo, avisoPreparo } = await page.evaluate(() => ({ modoVideo: window.__pitch.modoVideo, avisoPreparo: window.__pitch.aviso }));
if (modoVideo) {
  await navegador.close();
  throw new Error(`A demo não está rodando ao vivo, então não dá para gravar: ${avisoPreparo ?? 'API fora do ar'}`);
}
await page.waitForFunction(() => window.__pitch?.gravacaoFim, null, { timeout: 120_000, polling: 200 });
const { marcas, origem, aviso } = await page.evaluate(() => ({
  marcas: window.__pitch.marcas,
  origem: performance.timeOrigin,
  aviso: window.__pitch.aviso,
}));
await page.waitForTimeout(500);
await contexto.close();
await navegador.close();
if (aviso) console.warn(`Aviso da demo durante a gravação: ${aviso}`);

const webm = readdirSync(temp).find((f) => f.endsWith('.webm'));
if (!webm) throw new Error('O Playwright não gerou o vídeo.');

for (const [tela, duracao] of Object.entries(DURACOES)) {
  // Segundo do vídeo em que a tela entrou no ar.
  const inicio = (origem + marcas[tela] - inicioVideo) / 1000;
  const saida = join(DESTINO, `demo-${tela}.mp4`);
  execFileSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-ss', inicio.toFixed(2), '-t', String(duracao), '-i', join(temp, webm), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', saida],
    { stdio: 'inherit' },
  );
  console.log(`Gravado: ${saida} (a partir de ${inicio.toFixed(1)} s do vídeo, ${duracao} s)`);
}
rmSync(temp, { recursive: true, force: true });
