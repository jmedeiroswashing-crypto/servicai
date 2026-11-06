'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';

const CHAVE = 'servicai:painel-tour';

const PASSOS = [
  { alvo: ['menu', 'menu-cel'], titulo: 'Tudo do seu negócio aqui', texto: 'O menu reúne atendimento, dinheiro e clientes, separados por assunto.' },
  { alvo: ['busca', 'busca-cel'], titulo: 'Busque qualquer coisa', texto: 'Ache uma tela, um cliente ou um serviço. No computador, o atalho é Ctrl + K.' },
  { alvo: ['periodo'], titulo: 'Escolha o período', texto: 'Hoje, 7 dias, este mês ou as datas que quiser. Vale para todas as telas com números.' },
  { alvo: ['novo', 'novo-cel'], titulo: 'O botão +', texto: 'Lance um serviço, uma despesa ou um compromisso sem sair de onde está.' },
  { alvo: ['ajuda'], titulo: 'Dúvida? Toque no ?', texto: 'Cada tela explica como funciona.' },
];

const visivel = (el: Element) => el.getClientRects().length > 0;

function acharAlvo(nomes: string[]) {
  for (const nome of nomes) {
    const el = [...document.querySelectorAll(`[data-tour="${nome}"]`)].find(visivel);
    if (el) return el;
  }
  return null;
}

/** Tour guiado da primeira vez: passa só pelo que está visível nesta tela. */
export function Tour() {
  const [passo, setPasso] = useState<number | null>(null);
  const [caixa, setCaixa] = useState<DOMRect | null>(null);

  const terminar = useCallback(() => {
    try {
      localStorage.setItem(CHAVE, '1');
    } catch {
      // Sem armazenamento, o tour só aparece de novo na próxima visita.
    }
    setPasso(null);
  }, []);

  useEffect(() => {
    let visto = true;
    try {
      visto = localStorage.getItem(CHAVE) === '1';
    } catch {
      // Sem armazenamento, não insiste em mostrar o tour.
    }
    if (visto) return;
    const t = window.setTimeout(() => setPasso(0), 500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (passo === null) return;
    if (passo >= PASSOS.length) {
      const t = window.setTimeout(terminar, 0);
      return () => window.clearTimeout(t);
    }
    const el = acharAlvo(PASSOS[passo].alvo);
    const t = window.setTimeout(() => {
      if (el) setCaixa(el.getBoundingClientRect());
      else setPasso(passo + 1);
    }, 0);
    return () => window.clearTimeout(t);
  }, [passo, terminar]);

  if (passo === null || passo >= PASSOS.length || !caixa) return null;
  const p = PASSOS[passo];
  const alturaTela = window.innerHeight;
  const larguraTela = window.innerWidth;
  const abaixo = caixa.bottom + 220 < alturaTela;
  // Menu lateral alto: o cartão fica ao lado dele, não embaixo.
  const aoLado = caixa.height > alturaTela * 0.6 && larguraTela > 760;
  const cartao: CSSProperties = aoLado
    ? { left: caixa.right + 16, top: 96 }
    : {
        left: Math.max(16, Math.min(caixa.left, larguraTela - 356)),
        ...(abaixo ? { top: caixa.bottom + 12 } : { bottom: alturaTela - caixa.top + 12 }),
      };

  return (
    <div className="e-tour" role="dialog" aria-modal="true" aria-label="Conheça o painel">
      <div className="e-tour-luz" style={{ top: caixa.top - 4, left: caixa.left - 4, width: caixa.width + 8, height: caixa.height + 8 }} />
      <div className="e-tour-cartao" style={cartao}>
        <p>
          {passo + 1} de {PASSOS.length}
        </p>
        <h2>{p.titulo}</h2>
        <p>{p.texto}</p>
        <div className="e-tour-acoes">
          <button type="button" className="e-bt e-bt--p" onClick={terminar}>
            Pular
          </button>
          <button type="button" className="e-bt e-bt--p e-bt--forte" onClick={() => setPasso(passo + 1)}>
            {passo === PASSOS.length - 1 ? 'Começar' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  );
}
