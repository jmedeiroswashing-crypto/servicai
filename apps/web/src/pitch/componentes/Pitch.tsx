'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { abrirCanal, type ComandoPitch, type EstadoPitch, type MensagemCanal } from '../canal';
import { DURACAO_TOTAL, FIM_ENSAIO_AUTO, TELAS, inicioDaTela, telaNoTempo } from '../pitch-dados';
import { JanelaApp } from '../demo/iframe';
import { DiretorDemo, INFO_VAZIA, type IdJanela, type InfoDemo } from '../demo/roteiros';
import { API_E_LOCAL, apiNoAr } from '../demo/sessao';
import { PalcoDemo } from './PalcoDemo';
import { TelaDados } from './TelaDados';

declare global {
  interface Window {
    /** Usado pelos scripts de captura, ensaio e gravação (Playwright). */
    __pitch?: {
      tela: number;
      pronta: boolean;
      modoVideo: boolean;
      marcas: Record<number, number>;
      ensaioDuracaoMs: number | null;
      gravacaoFim: boolean;
      aviso: string | null;
    };
  }
}

type Modo = 'normal' | 'auto' | 'gravar';

function lerParametros() {
  const p = new URLSearchParams(window.location.search);
  const tela = Math.min(TELAS.length, Math.max(1, Number(p.get('tela')) || 1));
  const modo: Modo = p.get('gravar') === '1' ? 'gravar' : p.get('auto') === '1' ? 'auto' : 'normal';
  return {
    tela: modo === 'gravar' ? 8 : tela,
    modo,
    comecarJa: p.has('tela') && modo === 'normal',
    forcarVideo: p.get('video') === '1',
  };
}

export function Pitch() {
  const [tela, setTela] = useState(1);
  const [versao, setVersao] = useState(0);
  const [inicioMs, setInicioMs] = useState<number | null>(null);
  const [telaDesdeMs, setTelaDesdeMs] = useState(0);
  const [preto, setPreto] = useState(false);
  const [noApp, setNoApp] = useState(false);
  const [modoVideo, setModoVideo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [demoPronta, setDemoPronta] = useState(false);
  const [info, setInfo] = useState<InfoDemo>(INFO_VAZIA);
  const [semCursor, setSemCursor] = useState(false);
  const [agora, setAgora] = useState(0);
  const [ensaioDuracaoMs, setEnsaioDuracaoMs] = useState<number | null>(null);
  const [modo, setModo] = useState<Modo>('normal');
  const [verificouApi, setVerificouApi] = useState(false);

  const iframes = useRef<Partial<Record<IdJanela, HTMLIFrameElement>>>({});
  const diretor = useRef<DiretorDemo | null>(null);
  const reiniciarProxima = useRef(false);
  const desdePerf = useRef(0);
  /** Teclas apertadas com o foco dentro de um iframe do app chegam por aqui. */
  const tratarTeclaRef = useRef<(e: KeyboardEvent) => void>(() => undefined);

  const atual = TELAS[tela - 1];
  const iniciado = inicioMs !== null;
  const decorrido = iniciado ? (agora - inicioMs) / 1000 : 0;

  const marcar = (n: number) => {
    desdePerf.current = performance.now();
    if (window.__pitch) window.__pitch.marcas[n] = performance.now();
  };

  // ------------------------------------------------------------- navegação
  const irPara = useCallback((n: number) => {
    const alvo = Math.min(TELAS.length, Math.max(1, n));
    setTela((t) => {
      if (t !== alvo) {
        setTelaDesdeMs(Date.now());
        marcar(alvo);
      }
      return alvo;
    });
    setNoApp(false);
  }, []);

  const iniciar = useCallback((naTela: number) => {
    setInicioMs(Date.now() - inicioDaTela(naTela) * 1000);
    setTelaDesdeMs(Date.now());
    marcar(naTela);
    setVersao((v) => v + 1);
  }, []);

  const proxima = useCallback(() => {
    if (!iniciado) iniciar(tela);
    else irPara(tela + 1);
  }, [iniciado, iniciar, irPara, tela]);

  const anterior = useCallback(() => irPara(tela - 1), [irPara, tela]);

  const reiniciar = useCallback(() => {
    reiniciarProxima.current = true;
    setTelaDesdeMs(Date.now());
    desdePerf.current = performance.now();
    setVersao((v) => v + 1);
  }, []);

  const entrarNoApp = useCallback(() => {
    if (atual.tipo !== 'demo' || modoVideo) return;
    diretor.current?.parar();
    setNoApp(true);
  }, [atual.tipo, modoVideo]);

  // ------------------------------------------------------------- montagem
  useEffect(() => {
    // A URL só existe no navegador (a página é exportada estática): lida ao montar.
    const p = lerParametros();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModo(p.modo);
    setTela(p.tela);
    setAgora(Date.now());
    window.__pitch = {
      tela: p.tela,
      pronta: false,
      modoVideo: false,
      marcas: {},
      ensaioDuracaoMs: null,
      gravacaoFim: false,
      aviso: null,
    };
    document.body.style.overflow = 'hidden';

    let cancelado = false;
    (async () => {
      const noAr = !p.forcarVideo && API_E_LOCAL && (await apiNoAr());
      if (cancelado) return;
      setVerificouApi(true);
      if (!noAr) {
        setModoVideo(true);
        // A faixa "Plano B" do apresentador já avisa; aqui só fica o motivo se não for local.
        setAviso(API_E_LOCAL ? null : 'O site aponta para uma API que não é local: a demo ao vivo só roda com a API local.');
        return;
      }
      while (!cancelado && Object.keys(iframes.current).length < 4) await new Promise((r) => setTimeout(r, 50));
      if (cancelado) return;
      const janelas = Object.fromEntries(
        Object.entries(iframes.current).map(([id, el]) => [id, new JanelaApp(el!)]),
      ) as Record<IdJanela, JanelaApp>;
      for (const j of Object.values(janelas)) j.definirAoTecla((e) => tratarTeclaRef.current(e));
      const d = new DiretorDemo(janelas, setInfo, setAviso);
      diretor.current = d;
      try {
        await d.preparar();
        if (!cancelado) setDemoPronta(true);
      } catch (e) {
        console.error(e);
        if (cancelado) return;
        setAviso(`A demo não preparou (${e instanceof Error ? e.message : String(e)}). Usando o vídeo gravado.`);
        setModoVideo(true);
      }
    })();

    if (p.comecarJa) iniciar(p.tela);

    return () => {
      cancelado = true;
      diretor.current?.parar();
      document.body.style.overflow = '';
    };
  }, [iniciar]);

  // Ensaio automático e gravação começam quando a demo está pronta (ou em vídeo).
  useEffect(() => {
    if (modo === 'normal' || iniciado || !verificouApi) return;
    if (!demoPronta && !modoVideo) return;
    // Começa quando a preparação externa (API e iframes) termina.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    iniciar(tela);
  }, [modo, iniciado, verificouApi, demoPronta, modoVideo, iniciar, tela]);

  // Relógio. O ensaio agenda cada troca pelo relógio total, não pela tela anterior.
  useEffect(() => {
    const t = setInterval(() => {
      const ms = Date.now();
      setAgora(ms);
      if (inicioMs === null || ensaioDuracaoMs !== null || modo === 'normal') return;
      const s = (ms - inicioMs) / 1000;
      const fim = modo === 'auto' ? FIM_ENSAIO_AUTO : inicioDaTela(12);
      if (s >= fim) {
        const dur = ms - inicioMs;
        setEnsaioDuracaoMs(dur);
        if (window.__pitch) {
          window.__pitch.ensaioDuracaoMs = dur;
          if (modo === 'gravar') window.__pitch.gravacaoFim = true;
        }
        if (modo === 'auto') setPreto(true);
        return;
      }
      const alvo = telaNoTempo(s);
      if (alvo !== tela) irPara(alvo);
    }, 100);
    return () => clearInterval(t);
  }, [inicioMs, modo, tela, irPara, ensaioDuracaoMs]);

  useEffect(() => {
    if (!window.__pitch) return;
    window.__pitch.tela = tela;
    window.__pitch.pronta = demoPronta;
    window.__pitch.modoVideo = modoVideo;
    window.__pitch.aviso = aviso;
  }, [tela, demoPronta, modoVideo, aviso]);

  // Demo da tela: roda quando a tela abre, e de novo com R.
  useEffect(() => {
    const d = diretor.current;
    if (!iniciado || modoVideo || !d) return;
    if (atual.tipo !== 'demo' || !atual.demo) {
      d.parar();
      return;
    }
    const reinicio = reiniciarProxima.current;
    reiniciarProxima.current = false;
    void d.rodar(atual.demo, desdePerf.current, reinicio);
  }, [tela, versao, iniciado, modoVideo, atual, demoPronta]);

  // ------------------------------------------------------------- teclado e mouse
  const tratarTecla = useCallback(
    (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key;
      if (noApp) {
        // Com a banca no app, as teclas são do app: só o Esc volta.
        if (k === 'Escape') {
          e.preventDefault();
          setNoApp(false);
        }
        return;
      }
      if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') {
        e.preventDefault();
        proxima();
      } else if (k === 'ArrowLeft' || k === 'PageUp') {
        e.preventDefault();
        anterior();
      } else if (k === 'b' || k === 'B') {
        setPreto((v) => !v);
      } else if (k === 'f' || k === 'F') {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => undefined);
      } else if (k === 'r' || k === 'R') {
        reiniciar();
      } else if (k === 'd' || k === 'D') {
        entrarNoApp();
      } else if (k === 'p' || k === 'P') {
        window.open('/pitch/apresentador', 'servicai-apresentador', 'width=1100,height=720');
      }
    },
    [noApp, proxima, anterior, reiniciar, entrarNoApp],
  );

  useEffect(() => {
    tratarTeclaRef.current = tratarTecla;
    window.addEventListener('keydown', tratarTecla);
    return () => window.removeEventListener('keydown', tratarTecla);
  }, [tratarTecla]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const mexeu = () => {
      setSemCursor(false);
      clearTimeout(t);
      t = setTimeout(() => setSemCursor(true), 2000);
    };
    mexeu();
    window.addEventListener('mousemove', mexeu);
    return () => {
      clearTimeout(t);
      window.removeEventListener('mousemove', mexeu);
    };
  }, []);

  // ------------------------------------------------------------- janela do apresentador
  const estado: EstadoPitch = {
    tela,
    inicioMs,
    telaDesdeMs,
    preto,
    noApp,
    modoVideo,
    aviso,
    demoPronta,
    auto: modo === 'auto',
    ensaioDuracaoMs,
  };
  const estadoRef = useRef(estado);
  const comandos = useRef<(c: ComandoPitch) => void>(() => undefined);
  useEffect(() => {
    estadoRef.current = estado;
    comandos.current = (c) => {
      if (c.tipo === 'proxima') proxima();
      if (c.tipo === 'anterior') anterior();
      if (c.tipo === 'ir') irPara(c.tela);
      if (c.tipo === 'reiniciar') reiniciar();
      if (c.tipo === 'preto') setPreto((v) => !v);
    };
  });

  useEffect(() => {
    const ch = abrirCanal();
    if (!ch) return;
    const enviar = () => ch.postMessage({ de: 'telao', estado: estadoRef.current } satisfies MensagemCanal);
    ch.onmessage = (ev: MessageEvent<MensagemCanal>) => {
      if (ev.data.de !== 'apresentador') return;
      if (ev.data.comando.tipo === 'pedir-estado') enviar();
      else comandos.current(ev.data.comando);
    };
    const t = setInterval(enviar, 250);
    return () => {
      clearInterval(t);
      ch.close();
    };
  }, []);

  // ------------------------------------------------------------- render
  const progresso = iniciado ? Math.min(1, decorrido / DURACAO_TOTAL) : 0;
  const ehDemo = atual.tipo === 'demo';

  return (
    <div
      className={`p-raiz ${semCursor && !noApp ? 'p-sem-cursor' : ''} ${noApp ? 'p-no-app' : ''}`}
      onClick={() => {
        if (!noApp) proxima();
      }}
    >
      <div className="p-quadro">
        <div className="p-seguro">
          {iniciado && !ehDemo && <TelaDados key={`${tela}-${versao}`} id={atual.id} />}
          {!modoVideo && (
            <PalcoDemo
              demo={iniciado && ehDemo ? atual.demo! : null}
              legenda={atual.legenda ?? ''}
              info={info}
              noApp={noApp}
              aoMontarJanela={registrarIframe}
            />
          )}
        </div>
      </div>

      {ehDemo && modoVideo && iniciado && (
        <video
          key={`${tela}-${versao}`}
          className="p-video"
          src={`/pitch/demo-${tela}.mp4`}
          autoPlay
          muted
          playsInline
          onError={() => setAviso(`Vídeo /pitch/demo-${tela}.mp4 não encontrado. Rode "npm run gravar:demo" em apps/web.`)}
        />
      )}

      {!iniciado && modo === 'normal' && <div className="p-espera">pronto · → para começar</div>}
      {preto && <div className="p-preto" />}
      <div className="p-progresso" style={{ width: `${progresso * 100}%` }} />
    </div>
  );

  function registrarIframe(id: IdJanela, el: HTMLIFrameElement) {
    iframes.current[id] = el;
  }
}
