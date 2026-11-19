/**
 * Verificação do pitch com o Chrome da máquina (Playwright).
 *
 *   node scripts/verificar-pitch.mjs capturas [pasta]   percorre as 16 telas pelo teclado
 *                                                     em 1920×1080 e 1280×720, tira uma
 *                                                     captura de cada e acusa texto cortado
 *   node scripts/verificar-pitch.mjs auto              roda ?auto=1 do começo ao fim e diz
 *                                                     quanto durou
 *
 * Precisa do site (npm run dev) e, para as demos, da API local com o seed do pitch.
 * URL: variável PITCH_URL (padrão http://localhost:3000).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.PITCH_URL ?? 'http://localhost:3000';
const [modo = 'capturas', pastaArg] = process.argv.slice(2);
// Tempos e telas de demo vêm do próprio roteiro (o Node lê o .ts direto).
const { TELAS, TELAS_DEMO, DURACAO_TOTAL } = await import('../src/pitch/pitch-dados.ts');
const DURACOES = TELAS.map((t) => t.duracao);

async function abrirNavegador() {
  for (const channel of ['chrome', 'msedge', undefined]) {
    try {
      return await chromium.launch({ channel, headless: process.env.PITCH_VISIVEL !== '1' });
    } catch {
      /* tenta o próximo */
    }
  }
  throw new Error('Nenhum navegador encontrado (Chrome, Edge ou o do Playwright).');
}

/** Procura elementos da tela que saem do quadro 16:9 ou têm texto cortado. */
async function problemasDeLayout(page) {
  return page.evaluate(() => {
    const quadro = document.querySelector('.p-quadro')?.getBoundingClientRect();
    if (!quadro) return ['sem .p-quadro'];
    const achados = [];
    for (const el of document.querySelectorAll('.p-seguro *')) {
      if (el.closest('.p-viewport') || el.closest('.p-oculta') || el.closest('.p-escondida')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const fora = r.left < quadro.left - 1 || r.right > quadro.right + 1 || r.top < quadro.top - 1 || r.bottom > quadro.bottom + 1;
      const cortado = el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible' && !el.matches('.p-lista-campos span');
      if (fora || cortado) achados.push(`${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').slice(0, 40)}"`);
    }
    return achados;
  });
}

async function capturas() {
  const pasta = pastaArg ?? join(process.cwd(), 'capturas-pitch');
  const navegador = await abrirNavegador();
  let problemas = 0;
  for (const [w, h] of [
    [1920, 1080],
    [1280, 720],
  ]) {
    const dir = join(pasta, `${w}x${h}`);
    mkdirSync(dir, { recursive: true });
    const page = await navegador.newPage({ viewport: { width: w, height: h } });
    // Simula a sala sem internet: só localhost passa; o resto é bloqueado e listado.
    const externos = new Set();
    await page.context().route('**/*', (r) => {
      const u = new URL(r.request().url());
      if (['localhost', '127.0.0.1'].includes(u.hostname) || ['data:', 'blob:'].includes(u.protocol)) return r.continue();
      externos.add(u.hostname);
      return r.abort();
    });
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    await page.goto(`${BASE}/pitch`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__pitch);
    await page.keyboard.press('ArrowRight'); // começa (tela 1)
    for (let n = 1; n <= TELAS.length; n++) {
      if (n > 1) await page.keyboard.press('ArrowRight');
      const espera = TELAS_DEMO.includes(n) ? DURACOES[n - 1] - 0.5 : Math.min(DURACOES[n - 1] - 0.5, 9);
      // Antes da 1ª demo, espera a preparação terminar (é o que as telas 1–7 cobrem ao vivo).
      if (n === TELAS_DEMO[0]) await page.waitForFunction(() => window.__pitch?.pronta || window.__pitch?.modoVideo, null, { timeout: 90_000 });
      await page.waitForTimeout(espera * 1000);
      const arquivo = join(dir, `tela-${String(n).padStart(2, '0')}.png`);
      await page.screenshot({ path: arquivo });
      const achados = await problemasDeLayout(page);
      const estado = await page.evaluate(() => ({ tela: window.__pitch?.tela, aviso: window.__pitch?.aviso, video: window.__pitch?.modoVideo }));
      const linha = `${w}x${h} tela ${n}: ${estado.tela === n ? 'ok' : `ESPERAVA ${n}, ESTÁ NA ${estado.tela}`}`;
      console.log(`${linha}${achados.length ? ` · LAYOUT: ${achados.join(' | ')}` : ''}${estado.aviso ? ` · aviso: ${estado.aviso}` : ''}${estado.video ? ' · (vídeo)' : ''}`);
      problemas += achados.length + (estado.tela === n ? 0 : 1);
    }
    console.log(`${w}x${h}: requisições para fora de localhost (bloqueadas): ${[...externos].join(', ') || 'nenhuma'}`);
    if (erros.length) {
      console.log(`Erros de JavaScript em ${w}x${h}:\n- ${erros.join('\n- ')}`);
      problemas += erros.length;
    }
    await page.close();
  }
  await navegador.close();
  console.log(`Capturas em ${pasta}. ${problemas ? `${problemas} problema(s).` : 'Nenhum problema.'}`);
  process.exitCode = problemas ? 1 : 0;
}

async function auto() {
  const navegador = await abrirNavegador();
  const page = await navegador.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`${BASE}/pitch?auto=1`, { waitUntil: 'load' });
  const trocas = [];
  await page.exposeFunction('__registrarTroca', (tela, ms) => trocas.push({ tela, ms }));
  await page.evaluate(() => {
    let ultima = 0;
    setInterval(() => {
      const t = window.__pitch?.tela;
      if (t && t !== ultima && window.__pitch?.marcas[t] !== undefined) {
        ultima = t;
        window.__registrarTroca(t, window.__pitch.marcas[t]);
      }
    }, 50);
  });
  const inicio = Date.now();
  await page.waitForFunction(() => window.__pitch?.ensaioDuracaoMs != null, null, { timeout: 400_000, polling: 250 });
  const r = await page.evaluate(() => ({ duracao: window.__pitch.ensaioDuracaoMs, aviso: window.__pitch.aviso, video: window.__pitch.modoVideo }));
  const base = trocas[0]?.ms ?? 0;
  let alvo = 0;
  for (const t of trocas) {
    const real = (t.ms - base) / 1000;
    console.log(`tela ${String(t.tela).padStart(2)}: entrou em ${real.toFixed(1)} s (alvo ${alvo} s, desvio ${(real - alvo).toFixed(1)} s)`);
    alvo += DURACOES[t.tela - 1];
  }
  const s = r.duracao / 1000;
  console.log(`Ensaio automático: ${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')} (${s.toFixed(1)} s). Demos: ${r.video ? 'vídeo' : 'ao vivo'}.${r.aviso ? ` Último aviso: ${r.aviso}` : ''}`);
  console.log(`Tempo total na página, contando a preparação: ${((Date.now() - inicio) / 1000).toFixed(0)} s.`);
  await navegador.close();
  process.exitCode = s >= DURACAO_TOTAL - 5 && s <= DURACAO_TOTAL ? 0 : 1;
}

if (modo === 'auto') await auto();
else await capturas();
