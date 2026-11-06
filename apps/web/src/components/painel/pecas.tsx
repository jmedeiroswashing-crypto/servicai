'use client';

import type { CSSProperties, ReactNode } from 'react';
import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react';
import { brl, pct, type Ponto } from '@/lib/painel/numeros';

const emMil = (v: number) => (v >= 1000 ? `${Math.round(v / 1000).toLocaleString('pt-BR')} mil` : brl(v));

/** Cartão de número: rótulo, valor, comparação com o período anterior e a frase que explica de onde vem. */
export function Kpi({
  rotulo,
  valor,
  antes,
  comparacao,
  frase,
  tipo,
  cor,
  inverso,
  dinheiro = true,
}: {
  rotulo: string;
  valor: number;
  antes?: number;
  comparacao?: string;
  frase?: ReactNode;
  tipo?: 'destaque' | 'lucro';
  cor?: string;
  inverso?: boolean;
  dinheiro?: boolean;
}) {
  // Sem movimento antes, não há o que comparar. Com base pequena ou negativa, a % não diz nada: mostra em reais.
  const temBase = !!antes && comparacao !== '';
  const baseFraca = temBase && (antes! <= 0 || antes! < Math.abs(valor) * 0.1);
  const subiu = temBase && valor >= antes!;
  const bom = inverso ? !subiu : subiu;
  return (
    <article className={`e-kpi${tipo ? ` e-kpi--${tipo}` : ''}`}>
      <p className="e-kpi-rot">
        {!tipo && <i style={{ '--c': cor ?? 'var(--teal)' } as CSSProperties} />}
        {rotulo}
      </p>
      <p className="e-kpi-val" title={dinheiro ? `R$ ${brl(valor, true)}` : undefined}>
        {dinheiro && <small>R$</small>}
        {valor < 0 && '−'}
        {brl(Math.abs(valor))}
      </p>
      {temBase && (
        <span className="e-kpi-linha">
          <span className={`e-delta ${bom ? 'sobe' : 'desce'}`}>
            {subiu ? <ArrowUp size={11} aria-hidden="true" /> : <ArrowDown size={11} aria-hidden="true" />}
            {baseFraca
              ? `R$ ${emMil(Math.abs(valor - antes!))} ${subiu ? 'a mais' : 'a menos'}`
              : pct(Math.abs(valor - antes!) / Math.abs(antes!), 1)}
          </span>
          {comparacao}
        </span>
      )}
      {frase && <p className="e-kpi-frase">{frase}</p>}
    </article>
  );
}

export function Mini({ rotulo, valor, nota, alerta }: { rotulo: string; valor: ReactNode; nota?: ReactNode; alerta?: boolean }) {
  return (
    <article className="e-mini">
      <p>{rotulo}</p>
      <b>{valor}</b>
      {nota && <span className={alerta ? 'alerta' : undefined}>{nota}</span>}
    </article>
  );
}

export function Esqueleto({ linhas = 4 }: { linhas?: number }) {
  return (
    <div className="e-esq" role="status" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, i) => (
        <span key={i} style={{ width: `${88 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function Vazio({ icone: Icone, titulo, texto, children }: { icone: LucideIcon; titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="e-vazio">
      <span className="e-vazio-ic">
        <Icone size={26} aria-hidden="true" />
      </span>
      <h2>{titulo}</h2>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  );
}

export function ErroAoCarregar({ tentar }: { tentar: () => void }) {
  return (
    <section className="e-painel e-vazio">
      <h2>Não foi possível carregar</h2>
      <p>Verifique sua conexão e tente de novo.</p>
      <button type="button" className="e-bt" onClick={tentar}>
        Tentar novamente
      </button>
    </section>
  );
}

const abreviar = (v: number) => (v >= 1000 ? `R$ ${Math.round(v / 1000)} mil` : `R$ ${Math.round(v)}`);

/** Barras do faturamento com a linha do lucro por cima, desenhadas a partir dos dados. */
export function GraficoBarras({ pontos, rotulo }: { pontos: Ponto[]; rotulo: string }) {
  const L = 760;
  const A = 220;
  const teto = Math.max(1, ...pontos.map((p) => Math.max(p.fat, p.lucro))) * 1.08;
  const passo = Math.pow(10, Math.floor(Math.log10(teto / 3)));
  const marca = Math.ceil(teto / 3 / passo) * passo;
  const larg = L / Math.max(1, pontos.length);
  const w = Math.max(2, larg * 0.58);
  const y = (v: number) => A - (Math.max(v, 0) / teto) * A;
  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'}${(i * larg + larg / 2).toFixed(1)} ${y(p.lucro).toFixed(1)}`).join('');
  const cadaRot = Math.ceil(pontos.length / 10);
  return (
    <svg className="e-grafico" viewBox={`-56 -8 ${L + 60} ${A + 34}`} role="img" aria-label={rotulo}>
      <title>{rotulo}</title>
      {[0, 1, 2, 3].map((k) => (
        <g key={k}>
          <line className="eixo" x1={0} x2={L} y1={y(marca * k)} y2={y(marca * k)} />
          <text x={-8} y={y(marca * k) + 4} textAnchor="end">
            {k ? abreviar(marca * k) : '0'}
          </text>
        </g>
      ))}
      {pontos.map((p, i) => (
        <rect key={p.dia} className="barra" x={i * larg + (larg - w) / 2} y={y(p.fat)} width={w} height={Math.max(0, A - y(p.fat))} rx={Math.min(3, w / 3)}>
          <title>{`${p.rot}: R$ ${brl(p.fat)} de faturamento, R$ ${brl(p.lucro)} de lucro`}</title>
        </rect>
      ))}
      {pontos.length > 1 && <path className="lucro" d={linha} />}
      {pontos.map((p, i) =>
        i % cadaRot === 0 ? (
          <text key={p.dia} x={i * larg + larg / 2} y={A + 20} textAnchor="middle">
            {p.rot}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/** Curva do cabeçalho, em viewBox 100×40. */
export function caminhoCurva(serie: number[], teto: number) {
  const valores = serie.length < 2 ? [serie[0] ?? 0, serie[0] ?? 0] : serie;
  const pts = valores.map((v, i) => [(i / (valores.length - 1)) * 100, 40 - (Math.max(v, 0) / (teto || 1)) * 34] as const);
  let d = `M${pts[0][0]} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += `C${cx.toFixed(2)} ${y0.toFixed(2)} ${cx.toFixed(2)} ${y1.toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  return d;
}
