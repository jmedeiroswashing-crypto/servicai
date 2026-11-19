'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { abrirCanal, type ComandoPitch, type EstadoPitch, type MensagemCanal } from '../canal';
import { DURACAO_TOTAL, TELAS, formatarTempo, inicioDaTela, listarPendentes } from '../pitch-dados';

/** Fala com [pausa] em itálico e campos pendentes sublinhados. */
function Fala({ texto }: { texto: string }) {
  const partes = texto.split(/(\[pausa\]|\[__[^\]]*\])/g).filter(Boolean);
  return (
    <>
      {partes.map((p, i) =>
        p === '[pausa]' ? (
          <span key={i} className="p-marca-pausa">
            {' '}
            [pausa]{' '}
          </span>
        ) : p.startsWith('[__') ? (
          <span key={i} className="p-marca-pendente">
            {p}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export function Apresentador() {
  const [estado, setEstado] = useState<EstadoPitch | null>(null);
  const [agora, setAgora] = useState(0);
  const canal = useRef<BroadcastChannel | null>(null);

  const enviar = useCallback((comando: ComandoPitch) => {
    canal.current?.postMessage({ de: 'apresentador', comando } satisfies MensagemCanal);
  }, []);

  useEffect(() => {
    const ch = abrirCanal();
    canal.current = ch;
    if (!ch) return;
    ch.onmessage = (ev: MessageEvent<MensagemCanal>) => {
      if (ev.data.de === 'telao') setEstado(ev.data.estado);
    };
    ch.postMessage({ de: 'apresentador', comando: { tipo: 'pedir-estado' } } satisfies MensagemCanal);
    const t = setInterval(() => setAgora(Date.now()), 200);
    return () => {
      clearInterval(t);
      ch.close();
    };
  }, []);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        enviar({ tipo: 'proxima' });
      } else if (['ArrowLeft', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        enviar({ tipo: 'anterior' });
      } else if (e.key === 'r' || e.key === 'R') enviar({ tipo: 'reiniciar' });
      else if (e.key === 'b' || e.key === 'B') enviar({ tipo: 'preto' });
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [enviar]);

  const pendentes = listarPendentes();

  if (!estado) {
    return (
      <div className="p-apresentador">
        <div className="p-ap-meta">Esperando o telão… Abra /pitch em outra janela (ou aperte P nele).</div>
      </div>
    );
  }

  const tela = TELAS[estado.tela - 1];
  const proxima = TELAS[estado.tela];
  const iniciado = estado.inicioMs !== null;
  const decorrido = iniciado ? (agora - estado.inicioMs!) / 1000 : 0;
  const fimAlvo = inicioDaTela(tela.n) + tela.duracao;
  const classeRelogio = decorrido > DURACAO_TOTAL ? 'p-estourou' : iniciado && decorrido > fimAlvo ? 'p-atrasado' : '';
  const naTela = iniciado ? (agora - estado.telaDesdeMs) / 1000 : 0;

  return (
    <div className="p-apresentador">
      <div className="p-ap-topo">
        <div>
          <div className={`p-relogio ${classeRelogio}`}>{formatarTempo(decorrido)}</div>
          <div className="p-ap-meta">
            {iniciado ? `de ${formatarTempo(DURACAO_TOTAL)}` : 'Aperte → para começar'}
            {estado.auto && ' · ensaio automático'}
            {estado.ensaioDuracaoMs !== null && ` · ensaio terminou em ${formatarTempo(estado.ensaioDuracaoMs / 1000)}`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>
            Tela {tela.n}/{TELAS.length} · {tela.titulo}
          </div>
          <div className="p-ap-meta">
            Alvo {formatarTempo(inicioDaTela(tela.n))}–{formatarTempo(fimAlvo)} ({tela.duracao} s) · nesta tela há{' '}
            {Math.floor(naTela)} s
          </div>
        </div>
      </div>

      <div>
        {estado.modoVideo && (
          <div className="p-ap-aviso" style={{ marginBottom: 12 }}>
            Plano B: as demos estão tocando o vídeo gravado.
          </div>
        )}
        {estado.aviso && (
          <div className="p-ap-aviso" style={{ marginBottom: 12 }}>
            {estado.aviso}
          </div>
        )}
        {estado.noApp && (
          <div className="p-ap-aviso" style={{ marginBottom: 12 }}>
            A banca está no app. Esc no telão volta para o pitch.
          </div>
        )}
        <div className="p-ap-fala">
          <Fala texto={tela.fala} />
        </div>
        <div className="p-ap-meta" style={{ marginTop: 18 }}>
          Próxima: {proxima ? `${proxima.n}. ${proxima.titulo}` : 'fim'}
        </div>
      </div>

      <div className="p-ap-baixo">
        <div className="p-ap-botoes">
          <button onClick={() => enviar({ tipo: 'anterior' })}>← Anterior</button>
          <button className="p-primario" onClick={() => enviar({ tipo: 'proxima' })}>
            {iniciado ? 'Próxima →' : 'Começar'}
          </button>
          <button onClick={() => enviar({ tipo: 'reiniciar' })}>R</button>
        </div>
        {pendentes.length > 0 && (
          <div className="p-ap-pendentes">
            <b>Pendentes no CONFIG_PITCH</b>
            <ul>
              {pendentes.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
