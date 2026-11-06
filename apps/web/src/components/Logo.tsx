/* eslint-disable @next/next/no-img-element -- exportação estática, sem otimizador de imagens */

const ALTURAS = 'h-8 md:h-9';
const ALTURAS_NOME = 'h-[18px] md:h-5';

/**
 * Logo em peças recortadas da arte original. Azul-marinho sumiria em fundo escuro:
 * `onDark` usa a versão clara. Sem `onDark`, a versão segue o tema do aparelho.
 */
export function Logo({ onDark = false, className = '' }: { onDark?: boolean; className?: string }) {
  return (
    <span role="img" aria-label="ServiçAi" className={`inline-flex items-center gap-2 ${className}`}>
      {onDark ? (
        <>
          <img data-logo="simbolo" src="/marca/simbolo-claro.webp" alt="" width={278} height={168} className={`${ALTURAS} w-auto`} />
          <img data-logo="nome" src="/marca/nome-claro.webp" alt="" width={512} height={96} className={`${ALTURAS_NOME} w-auto`} />
        </>
      ) : (
        <>
          <img src="/marca/simbolo.webp" alt="" width={278} height={168} className={`${ALTURAS} w-auto dark:hidden`} />
          <img src="/marca/simbolo-claro.webp" alt="" width={278} height={168} className={`${ALTURAS} hidden w-auto dark:block`} />
          <img src="/marca/nome-pequeno.webp" alt="" width={512} height={96} className={`${ALTURAS_NOME} w-auto dark:hidden`} />
          <img src="/marca/nome-claro.webp" alt="" width={512} height={96} className={`${ALTURAS_NOME} hidden w-auto dark:block`} />
        </>
      )}
    </span>
  );
}
