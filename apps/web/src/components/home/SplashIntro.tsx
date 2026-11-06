'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { LOGO_S_PATH } from '@/components/Logo';

const SESSION_KEY = 'servicai:splash-seen';
const INTRO_MS = 1300;
const LEAVE_MS = 450;

function alreadySeen() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // Sem sessionStorage a abertura pode repetir, sem outro efeito.
  }
}

interface LogoTarget {
  x: number;
  y: number;
  scale: number;
}

/**
 * Abertura exibida uma vez por sessão, com a home já carregada por baixo. No fim,
 * a logo vai até a posição medida no header enquanto o fundo desaparece. Quem
 * prefere menos movimento não vê a animação.
 */
export function SplashIntro() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [target, setTarget] = useState<LogoTarget | null>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const gradientId = useId();

  useEffect(() => {
    if (reducedMotion || alreadySeen()) return;
    markSeen();
    // sessionStorage só existe no navegador, então decide depois de montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
  }, [reducedMotion]);

  const leave = useCallback(() => {
    const logo = logoRef.current?.getBoundingClientRect();
    const header = document.querySelector('[data-brand-logo]')?.getBoundingClientRect();
    if (logo && header && header.width > 0) {
      setTarget({
        x: header.left + header.width / 2 - (logo.left + logo.width / 2),
        y: header.top + header.height / 2 - (logo.top + logo.height / 2),
        scale: header.width / logo.width,
      });
    }
    setLeaving(true);
  }, []);

  useEffect(() => {
    if (!visible || leaving) return;
    const timer = setTimeout(leave, INTRO_MS);
    return () => clearTimeout(timer);
  }, [visible, leaving, leave]);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setVisible(false), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  if (!visible) return null;

  return (
    <div onClick={leave} className={`fixed inset-0 z-[200] flex items-center justify-center ${leaving ? 'pointer-events-none' : 'cursor-pointer'}`}>
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-brand-dark"
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: LEAVE_MS / 1000 }}
      />

      <motion.div
        ref={logoRef}
        className="relative flex items-center gap-3"
        animate={target ? { x: target.x, y: target.y, scale: target.scale } : { scale: 1.06 }}
        transition={target ? { duration: LEAVE_MS / 1000, ease: 'easeInOut' } : { delay: 1, duration: 0.3 }}
      >
        <svg viewBox="0 0 48 48" className="h-16 w-16 md:h-20 md:w-20" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4FA0FF" />
              <stop offset="100%" stopColor="#1E7BFF" />
            </linearGradient>
          </defs>
          <motion.path
            d={LOGO_S_PATH}
            stroke="#6AA9FF"
            strokeWidth={1}
            fill={`url(#${gradientId})`}
            initial={{ pathLength: 0, fillOpacity: 0 }}
            animate={{ pathLength: 1, fillOpacity: 1 }}
            transition={{
              pathLength: { duration: 0.65, ease: 'easeInOut' },
              fillOpacity: { delay: 0.55, duration: 0.25 },
            }}
          />
        </svg>
        <motion.span
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, duration: 0.3 }}
          className="text-3xl font-bold tracking-tight text-on-brand-dark md:text-4xl"
        >
          Serviç<span className="text-[#6AA9FF]">Ai</span>
        </motion.span>
      </motion.div>

      {!leaving && (
        <button
          type="button"
          onClick={leave}
          className="absolute bottom-6 right-6 min-h-11 rounded-pill px-4 text-sm font-medium text-on-brand-dark/80 hover:text-on-brand-dark"
        >
          Pular
        </button>
      )}
    </div>
  );
}
