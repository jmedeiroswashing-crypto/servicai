'use client';

import Link from 'next/link';

/** Se uma tela do painel falhar, o resto do painel continua de pé e dá para tentar de novo. */
export default function ErroDoPainel({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-bold">Esta tela não abriu</h1>
      <p>Seus dados estão salvos. Tente de novo ou volte para o início do painel.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-white">
          Tentar de novo
        </button>
        <Link href="/painel" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 font-semibold">
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
