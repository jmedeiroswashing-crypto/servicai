'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { LOGO_S_PATH } from '@/components/Logo';

const INTRO_MS = 1300;
const LEAVE_MS = 450;

interface LogoTarget {
  x: number;
  y: number;
  scale: number;
}

/**
 * Abertura exibida sempre que o site carrega. Já vem no HTML, para a página não
 * aparecer antes dela, e o conteúdo carrega por baixo. No fim, a logo vai até a
 * posição medida no header enquanto o fundo desaparece. A área /conserto tem marca
 * própria, e quem prefere menos movimento não vê a animação.
 */
export function SplashIntro() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [target, setTarget] = useState<LogoTarget | null>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const gradientId = useId();
  const enabled = visible && !reducedMotion && !pathname.startsWith('/conserto');

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

  return (
    <div
      onClick={leave}
      className={`splash-intro fixed inset-0 z-[200] flex items-center justify-center motion-reduce:hidden ${
        leaving ? 'pointer-events-none' : 'cursor-pointer'
      }`}
    >
      {/* Sem JavaScript a abertura não terminaria sozinha. */}
      <noscript>
        <style>{'.splash-intro{display:none}'}</style>
      </noscript>

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
