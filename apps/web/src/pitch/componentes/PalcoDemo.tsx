'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { TEXTOS, type IdDemo } from '../pitch-dados';
import type { Foco, IdJanela, InfoDemo } from '../demo/roteiros';

/** Retângulo em unidades `--u`, relativo à área segura (90 × 50,6). */
interface Ret {
  x: number;
  y: number;
  w: number;
  h: number;
}

const TAMANHO_APP = {
  navegador: { w: 1200, h: 760 },
  celular: { w: 390, h: 800 },
};

/** Onde cada moldura fica em cada demo. A legenda ocupa a faixa de baixo (y > 46). */
const CHEIA: Ret = { x: 10.6, y: 0, w: 68.8, h: 46 };
const ESQUERDA: Ret = { x: 0, y: 0.9, w: 66, h: 44.2 };
const CELULAR: Ret = { x: 67.9, y: 0, w: 22.1, h: 46 };
const PAINEL_DIREITA: Ret = { x: 68, y: 4, w: 22, h: 38 };

interface Layout {
  janelas: Partial<Record<IdJanela, { ret: Ret; tipo: 'navegador' | 'celular' }>>;
  principal: IdJanela;
  painel?: 'criterios' | 'privacidade';
}

const LAYOUTS: Record<IdDemo, Layout> = {
  pedido: { janelas: { cliente: { ret: CHEIA, tipo: 'navegador' } }, principal: 'cliente' },
  busca: { janelas: { busca: { ret: ESQUERDA, tipo: 'navegador' } }, principal: 'busca', painel: 'criterios' },
  proposta: {
    janelas: { prestador: { ret: ESQUERDA, tipo: 'navegador' }, cliente: { ret: CELULAR, tipo: 'celular' } },
    principal: 'prestador',
  },
  privacidade: { janelas: { privacidade: { ret: ESQUERDA, tipo: 'navegador' } }, principal: 'privacidade', painel: 'privacidade' },
};

const ORDEM: IdJanela[] = ['cliente', 'busca', 'prestador', 'privacidade'];

/** Onde cada moldura espera, escondida, quando não está na tela atual (é onde ela aparece primeiro). */
const FORA_DE_CENA: Record<IdJanela, { ret: Ret; tipo: 'navegador' | 'celular' }> = {
  cliente: { ret: CHEIA, tipo: 'navegador' },
  busca: { ret: ESQUERDA, tipo: 'navegador' },
  prestador: { ret: ESQUERDA, tipo: 'navegador' },
  privacidade: { ret: ESQUERDA, tipo: 'navegador' },
};

const u = (n: number) => `calc(var(--u) * ${n})`;

function Moldura({
  id,
  ret,
  tipo,
  visivel,
  principal,
  noApp,
  foco,
  aoMontar,
}: {
  id: IdJanela;
  ret: Ret;
  tipo: 'navegador' | 'celular';
  visivel: boolean;
  principal: boolean;
  noApp: boolean;
  foco: Foco | null;
  aoMontar: (id: IdJanela, iframe: HTMLIFrameElement) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [caminho, setCaminho] = useState('');

  useEffect(() => {
    if (iframe.current) aoMontar(id, iframe.current);
  }, [id, aoMontar]);

  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const medir = () => setVp({ w: el.clientWidth, h: el.clientHeight });
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      try {
        const loc = iframe.current?.contentWindow?.location;
        if (loc && loc.href !== 'about:blank') setCaminho(`${loc.pathname}${loc.search}`);
      } catch {
        /* sem acesso */
      }
    }, 400);
    return () => clearInterval(t);
  }, []);

  // Na tela cheia (D) o app ganha um tamanho de desktop proporcional à tela.
  const emTelaCheia = noApp && principal;
  const app =
    emTelaCheia && vp.w > 0
      ? { w: 1440, h: Math.round((1440 * vp.h) / vp.w) }
      : TAMANHO_APP[tipo];
  const escala = vp.w > 0 ? Math.min(vp.w / app.w, vp.h / app.h) : 0.0001;

  // Câmera: aproxima no retângulo de foco, sem sair dos limites do app.
  let zoom = 1;
  let ox = 0;
  let oy = 0;
  if (foco && !emTelaCheia) {
    zoom = Math.max(1, Math.min(1.7, app.w / foco.w, app.h / foco.h));
    const vw = app.w / zoom;
    const vh = app.h / zoom;
    ox = Math.max(0, Math.min(app.w - vw, foco.x + foco.w / 2 - vw / 2));
    oy = Math.max(0, Math.min(app.h - vh, foco.y + foco.h / 2 - vh / 2));
  }

  return (
    <div
      className={`p-moldura ${tipo === 'celular' ? 'p-celular' : ''} ${visivel ? '' : 'p-oculta'} ${principal ? 'p-principal' : ''}`}
      style={{ left: u(ret.x), top: u(ret.y), width: u(ret.w), height: u(ret.h) }}
      aria-hidden={!visivel}
    >
      <div className="p-barra">
        {tipo === 'navegador' && (
          <>
            <i />
            <i />
            <i />
            <span className="p-endereco">servicai · {caminho || '…'}</span>
          </>
        )}
      </div>
      <div className="p-viewport" ref={viewport}>
        <iframe
          ref={iframe}
          title={`App ServiçAi (${id})`}
          tabIndex={noApp && principal ? 0 : -1}
          style={{
            width: app.w,
            height: app.h,
            transform: `scale(${escala * zoom}) translate(${-ox}px, ${-oy}px)`,
          }}
        />
      </div>
    </div>
  );
}

function Nota({ valor }: { valor: number }) {
  return <>{valor.toFixed(1).replace('.', ',')}</>;
}

export function PalcoDemo({
  demo,
  legenda,
  info,
  noApp,
  aoMontarJanela,
}: {
  /** null: palco escondido (mas montado, para pré-carregar). */
  demo: IdDemo | null;
  legenda: string;
  info: InfoDemo;
  noApp: boolean;
  aoMontarJanela: (id: IdJanela, iframe: HTMLIFrameElement) => void;
}) {
  const layout = demo ? LAYOUTS[demo] : null;

  const c = info.criterios;
  const p = info.privacidade;
  const criterios = c
    ? [
        ['Pontualidade', c.pontualidade],
        ['Qualidade', c.qualidade],
        ['Preço', c.preco],
        ['Atendimento', c.atendimento],
      ]
    : [];

  return (
    <div className={`p-demo ${demo ? '' : 'p-escondida'}`}>
      {ORDEM.map((id) => {
        const naTela = !!layout?.janelas[id];
        const pos = layout?.janelas[id] ?? FORA_DE_CENA[id];
        return (
          <Moldura
            key={id}
            id={id}
            ret={pos.ret}
            tipo={pos.tipo}
            visivel={naTela}
            principal={layout?.principal === id}
            noApp={noApp}
            foco={naTela ? (info.foco[id] ?? null) : null}
            aoMontar={aoMontarJanela}
          />
        );
      })}

      {layout?.painel === 'criterios' && (
        <div
          className={`p-painel ${c ? '' : 'p-oculta'}`}
          style={{ left: u(PAINEL_DIREITA.x + 0.4), top: u(PAINEL_DIREITA.y), width: u(PAINEL_DIREITA.w - 0.4) }}
        >
          {c && (
            <>
              <h4>Score ServiçAi</h4>
              <div className="p-score">
                {c.score}
                <small> /100</small>
              </div>
              <div className="p-pequeno" style={{ marginTop: u(0.6) }}>
                {c.nome} · nota <Nota valor={c.nota} /> em {c.avaliacoes} avaliações
              </div>
              {criterios.map(([rotulo, v]) => (
                <div className="p-criterio" key={rotulo as string}>
                  <span>{rotulo}</span>
                  <b>
                    <Nota valor={v as number} />
                  </b>
                  <div className="p-trilha">
                    <span style={{ width: `${((v as number) / 5) * 100}%` }} />
                  </div>
                </div>
              ))}
              <div className="p-fonte-dado">Médias das avaliações, lidas da API agora.</div>
            </>
          )}
        </div>
      )}

      {layout?.painel === 'privacidade' && (
        <div
          className={`p-painel ${p ? '' : 'p-oculta'}`}
          style={{ left: u(PAINEL_DIREITA.x), top: u(1), width: u(PAINEL_DIREITA.w) }}
        >
          {p && (
            <>
              <h4>O eletricista recebe</h4>
              <div className="p-lista-campos">
                {p.recebidos.map((r) => (
                  <div key={r.campo}>
                    <b>{r.campo}</b>
                    <span>{r.valor}</span>
                  </div>
                ))}
              </div>
              <h4 style={{ marginTop: u(2) }}>Não recebe</h4>
              <div className="p-ausentes">
                {p.ausentes.map((a) => (
                  <div key={a.rotulo} style={a.ausente ? undefined : { color: 'var(--laranja)' }}>
                    <X aria-hidden="true" />
                    {a.ausente ? a.rotulo : `${a.rotulo} (apareceu!)`}
                  </div>
                ))}
              </div>
              <div className="p-fonte-dado">Conferido agora na resposta de GET /requests/matches.</div>
            </>
          )}
        </div>
      )}

      {demo && (
        <div className="p-legenda" style={{ height: u(3.6) }}>
          <span>{legenda}</span>
          <span className="p-selo">{TEXTOS.demo.selo}</span>
        </div>
      )}
    </div>
  );
}
