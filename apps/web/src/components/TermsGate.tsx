'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'servicai:terms-accepted-v1';
const EXEMPT_PATHS = ['/termos', '/privacidade'];

export function TermsGate() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [accepted, setAccepted] = useState(true);

  useEffect(() => {
    setMounted(true);
    try {
      setAccepted(localStorage.getItem(STORAGE_KEY) === 'true');
    } catch {
      setAccepted(true);
    }
  }, []);

  function accept() {
    setAccepted(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Sem acesso a localStorage (ex: modo privado) — a pessoa vê o aviso de novo na próxima visita, sem problema.
    }
  }

  if (!mounted || accepted || EXEMPT_PATHS.includes(pathname)) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md border border-border bg-surface p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-accent" />
          <h2 className="font-display text-xl text-ink">Termos de uso e privacidade</h2>
        </div>
        <p className="mt-4 text-sm text-foreground-muted">
          Para usar o ServiçAi, você precisa estar de acordo com nossos Termos de Uso e nossa Política de
          Privacidade. Eles explicam como funciona a intermediação entre clientes e prestadores e como tratamos seus
          dados pessoais.
        </p>
        <div className="mt-4 flex gap-4 text-sm">
          <Link href="/termos" className="text-accent hover:underline">
            Ler Termos de Uso
          </Link>
          <Link href="/privacidade" className="text-accent hover:underline">
            Ler Política de Privacidade
          </Link>
        </div>
        <button
          onClick={accept}
          className="mt-6 w-full bg-ink py-3 text-sm font-medium text-background transition-opacity hover:opacity-85"
        >
          Li e concordo, continuar
        </button>
      </div>
    </div>
  );
}
