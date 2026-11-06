/** Planilha e recibo gerados no aparelho: nada passa pelo servidor. */
export type Coluna<T> = { titulo: string; valor: (linha: T) => string | number };

const CELULA_PERIGOSA = /^[=+\-@\t\r]/;

/** Texto começando com = + - @ vira fórmula no Excel: o apóstrofo impede. Números ficam como estão. */
function celula(valor: string | number): string {
  const texto = typeof valor === 'number' ? valor.toLocaleString('pt-BR', { maximumFractionDigits: 2, useGrouping: false }) : valor;
  const seguro = typeof valor === 'string' && CELULA_PERIGOSA.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replace(/"/g, '""')}"`;
}

export function gerarCsv<T>(linhas: T[], colunas: Coluna<T>[]): string {
  const topo = colunas.map((c) => celula(c.titulo)).join(';');
  const corpo = linhas.map((l) => colunas.map((c) => celula(c.valor(l))).join(';'));
  return [topo, ...corpo].join('\r\n');
}

export function baixarCsv<T>(nome: string, linhas: T[], colunas: Coluna<T>[]) {
  // O BOM faz o Excel abrir os acentos certos.
  const blob = new Blob([`﻿${gerarCsv(linhas, colunas)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nome}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

export function reciboHtml(r: { prestador: string; telefone?: string | null; servico: string; cliente?: string; forma?: string; valor: number; data: string }): string {
  const valor = r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const data = new Date(r.data).toLocaleDateString('pt-BR');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Recibo</title><style>
body{font:15px/1.5 system-ui,sans-serif;color:#152033;max-width:560px;margin:40px auto;padding:0 20px}
h1{font-size:22px;margin:0 0 4px}.m{color:#526075}.v{font-size:30px;font-weight:800;margin:20px 0}
dl{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:0}dt{color:#526075}dd{margin:0;font-weight:600}
.a{margin-top:56px;border-top:1px solid #152033;padding-top:6px;text-align:center}.n{margin-top:24px;font-size:12px;color:#526075}
</style></head><body><h1>Recibo</h1><p class="m">${escapar(r.prestador)}${r.telefone ? ` · ${escapar(r.telefone)}` : ''}</p>
<p class="v">R$ ${valor}</p><dl><dt>Serviço</dt><dd>${escapar(r.servico)}</dd>
${r.cliente ? `<dt>Cliente</dt><dd>${escapar(r.cliente)}</dd>` : ''}
${r.forma ? `<dt>Pagamento</dt><dd>${escapar(r.forma)}</dd>` : ''}<dt>Data</dt><dd>${data}</dd></dl>
<p class="a">${escapar(r.prestador)}</p><p class="n">Recibo gerado pelo prestador no ServiçAi. Não é nota fiscal.</p>
<script>window.addEventListener('load',function(){window.print()})</script></body></html>`;
}

export function abrirRecibo(dados: Parameters<typeof reciboHtml>[0]) {
  const janela = window.open('', '_blank');
  if (!janela) return false;
  janela.document.write(reciboHtml(dados));
  janela.document.close();
  return true;
}
