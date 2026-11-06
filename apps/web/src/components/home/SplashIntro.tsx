'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';

const INTRO_MS = 2100;
const LEAVE_MS = 500;
const SAIDA = [0.4, 0, 0.2, 1] as const;

interface Destino {
  x: number;
  y: number;
  scale: number;
}

function medir(de: HTMLElement | null, seletor: string): Destino | null {
  const origem = de?.getBoundingClientRect();
  const alvo = document.querySelector(`[data-brand-logo] [data-logo="${seletor}"]`)?.getBoundingClientRect();
  if (!origem || !alvo || alvo.width === 0) return null;
  return {
    x: alvo.left + alvo.width / 2 - (origem.left + origem.width / 2),
    y: alvo.top + alvo.height / 2 - (origem.top + origem.height / 2),
    scale: alvo.width / origem.width,
  };
}

/**
 * Abertura exibida sempre que o site carrega. Já vem no HTML, para a página não
 * aparecer antes dela, e o conteúdo carrega por baixo. A logo se monta peça por
 * peça: órbita, S, casa, nome, frase e selos. No fim, símbolo e nome vão até o
 * header enquanto o fundo desaparece. A área /conserto tem marca própria, e quem
 * prefere menos movimento não vê a animação.
 */
export function SplashIntro() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [destinos, setDestinos] = useState<{ simbolo: Destino | null; nome: Destino | null }>({ simbolo: null, nome: null });
  const simboloRef = useRef<HTMLDivElement>(null);
  const nomeRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const enabled = visible && !reducedMotion && !pathname.startsWith('/conserto');

  const leave = useCallback(() => {
    setDestinos({ simbolo: medir(simboloRef.current, 'simbolo'), nome: medir(nomeRef.current, 'nome') });
    setLeaving(true);
  }, []);

  useEffect(() => {
    if (!enabled || leaving) return;
    const timer = setTimeout(leave, INTRO_MS);
    return () => clearTimeout(timer);
  }, [enabled, leaving, leave]);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setVisible(false), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  if (!enabled) return null;

  const voo = (destino: Destino | null) =>
    leaving ? (destino ? { x: destino.x, y: destino.y, scale: destino.scale, opacity: [1, 1, 0] } : { opacity: 0 }) : {};
  const transicaoVoo = { duration: LEAVE_MS / 1000, ease: SAIDA };
  const peca = 'absolute inset-0 h-full w-full';

  return (
    <div
      onClick={leave}
      className={`splash-intro fixed inset-0 z-[200] flex items-center justify-center overflow-hidden px-6 motion-reduce:hidden ${
        leaving ? 'pointer-events-none' : 'cursor-pointer'
      }`}
    >
      {/* Sem JavaScript a abertura não terminaria sozinha. */}
      <noscript>
        <style>{'.splash-intro{display:none}'}</style>
      </noscript>

      <motion.div aria-hidden="true" className="absolute inset-0 bg-white" animate={{ opacity: leaving ? 0 : 1 }} transition={{ duration: LEAVE_MS / 1000 }} />

      <div className="relative flex w-full max-w-[560px] flex-col items-center" aria-hidden="true">
        <motion.div ref={simboloRef} className="relative aspect-[725/438] w-[63%]" animate={voo(destinos.simbolo)} transition={transicaoVoo}>
          {/* A órbita passa da esquerda para a direita e traz a base do S. */}
          <motion.img
            src="/marca/orbita.webp"
            alt=""
            fetchPriority="high"
            className={peca}
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{ duration: 0.65, ease: 'easeInOut' }}
          />
          {/* O topo do S encaixa e fecha a letra em volta da chave. */}
          <motion.img
            src="/marca/s-topo.webp"
            alt=""
            fetchPriority="high"
            className={peca}
            initial={{ opacity: 0, y: -22, rotate: -6 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
          />
          {/* A casa pousa por último, com um pequeno quique. */}
          <motion.img
            src="/marca/casa.webp"
            alt=""
            fetchPriority="high"
            className={peca}
            style={{ transformOrigin: '72% 45%' }}
            initial={{ opacity: 0, y: -36, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.72, type: 'spring', stiffness: 380, damping: 15 }}
          />
        </motion.div>

        <motion.div ref={nomeRef} className="relative mt-[3%] aspect-[1136/213] w-full" animate={voo(destinos.nome)} transition={transicaoVoo}>
          <motion.img
            src="/marca/nome.webp"
            alt=""
            fetchPriority="high"
            className={peca}
            initial={{ clipPath: 'inset(-10% 100% -10% 0)' }}
            animate={{ clipPath: 'inset(-10% 0% -10% 0)' }}
            transition={{ delay: 0.95, duration: 0.45, ease: 'easeOut' }}
          />
        </motion.div>

        <motion.div className="mt-[4%] w-full" animate={{ opacity: leaving ? 0 : 1 }} transition={{ duration: 0.15 }}>
          <motion.img
            src="/marca/frase.webp"
            alt=""
            className="h-auto w-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.35, duration: 0.3 }}
          />
          <motion.img
            src="/marca/selos.webp"
            alt=""
            className="mx-auto mt-[4%] h-auto w-[84%]"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.55, duration: 0.3 }}
          />
        </motion.div>
      </div>

      {!leaving && (
        <button
          type="button"
          onClick={leave}
          className="absolute bottom-6 right-6 min-h-11 rounded-pill px-4 text-sm font-medium text-[#0b1c33]/70 hover:text-[#0b1c33]"
        >
          Pular
        </button>
      )}
    </div>
  );
}
