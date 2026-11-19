/**
 * `npm run roteiro:ensaio` — gera public/pitch/roteiro-ensaio.html a partir de
 * src/pitch/pitch-dados.ts. A4, letra grande, só as falas.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TELAS, formatarTempo, inicioDaTela, listarPendentes } from '../src/pitch/pitch-dados.ts';

const destino = fileURLToPath(new URL('../public/pitch/roteiro-ensaio.html', import.meta.url));

function escapar(texto) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fala(texto) {
  return escapar(texto)
    .replace(/\[pausa\]/g, '<i>[pausa]</i>')
    .replace(/\[__([^\]]*)\]/g, (_, rotulo) => `<u>[__${rotulo}]</u>`);
}

const blocos = TELAS.map(
  (t) => `<section>
  <p class="tempo"><b>${formatarTempo(inicioDaTela(t.n))} · ${t.duracao} s</b> — ${t.n}. ${escapar(t.titulo)}</p>
  <p class="fala">${fala(t.fala)}</p>
</section>`,
).join('\n');

const pendentes = listarPendentes();
const listaPendentes = pendentes.length
  ? `<section class="pendentes"><p class="tempo"><b>Pendentes</b></p><ul>${pendentes
      .map((p) => `<li><u>${escapar(p)}</u></li>`)
      .join('')}</ul></section>`
  : '';

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>ServiçAi — roteiro de ensaio (3:00)</title>
<style>
  @page { size: A4; margin: 18mm 18mm 16mm; }
  body { font-family: Georgia, "Times New Roman", serif; font-size: 17pt; line-height: 1.45; color: #000; background: #fff; margin: 0 auto; max-width: 174mm; }
  h1 { font-size: 15pt; font-weight: normal; margin: 0 0 8mm; }
  section { break-inside: avoid; margin: 0 0 7mm; }
  .tempo { font-size: 12pt; margin: 0 0 1.5mm; }
  .fala { margin: 0; }
  i { font-style: italic; }
  u { text-decoration: underline; }
  .pendentes ul { font-size: 13pt; margin: 0; padding-left: 6mm; }
</style>
</head>
<body>
<h1>ServiçAi — roteiro de ensaio · 16 telas · 3:00</h1>
${blocos}
${listaPendentes}
</body>
</html>
`;

writeFileSync(destino, html, 'utf8');
console.log(`Roteiro gerado: ${destino}`);
if (pendentes.length) console.log(`Pendentes (${pendentes.length}):\n- ${pendentes.join('\n- ')}`);
