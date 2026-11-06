import { useId } from 'react';

/** Símbolo "S" da marca. Exportado para o splash desenhar o mesmo traçado. */
export const LOGO_S_PATH =
  'M44 4 L36 16 H22 C20 16 19.5 18 21 19 L36 25 C45 28.5 46 38 39 42 C36 44 33 44.5 30 44.5 H4 L12 33 H28 C30 33 30.5 31 29 30 L13 23.5 C4 20 3.5 10 10 6 C13 4.4 16 4 19 4 Z';

export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  const gradientId = useId();
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4FA0FF" />
          <stop offset="100%" stopColor="#1E7BFF" />
        </linearGradient>
      </defs>
      <path d={LOGO_S_PATH} fill={`url(#${gradientId})`} />
    </svg>
  );
}

/** Logo completa. `onDark` é para fundos azul-marinho, como o header. */
export function Logo({ onDark = false, className = '' }: { onDark?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className={`text-xl font-bold tracking-tight ${onDark ? 'text-on-brand-dark' : 'text-ink'}`}>
        Serviç<span className={onDark ? 'text-[#6AA9FF]' : 'text-accent'}>Ai</span>
      </span>
    </span>
  );
}
