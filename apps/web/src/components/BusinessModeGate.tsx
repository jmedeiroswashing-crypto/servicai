'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Wallet, Briefcase, Handshake } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { BusinessMode } from '@/lib/types';

const EXEMPT_PATHS = ['/login', '/cadastro', '/comecar'];

/**
 * Pergunta única pra quem já tinha conta de prestador antes dessa opção
 * existir (businessMode === null/undefined) — cadastros novos já vêm com o
 * modo escolhido lá no /comecar e nunca veem isso. Sem flag de "mounted":
 * o token começa null tanto no servidor quanto no primeiro render do
 * cliente (zustand persist só reidrata depois de montar), então o modal
 * nunca aparece antes da hora — não precisa de estado extra pra isso.
 */
export function BusinessModeGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, setAuth } = useAuthStore();
  const [submitting, setSubmitting] = useState<BusinessMode | null>(null);

  const shouldShow =
    !!token &&
    user?.role === 'PRESTADOR' &&
    user.businessMode == null &&
    !EXEMPT_PATHS.includes(pathname) &&
    !pathname.startsWith('/conserto');

  if (!shouldShow) return null;

  async function choose(businessMode: BusinessMode) {
    setSubmitting(businessMode);
    try {
      await api.patch('/providers/me/business-mode', { businessMode });
      setAuth(token!, { ...user!, businessMode });
      if (businessMode === 'GESTAO') router.push('/painel/agenda');
    } catch {
      setSubmitting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md border border-border bg-surface p-6 sm:p-8">
        <h2 className="font-display text-xl text-ink">O que você quer do ServiçAi?</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Isso define o que aparece pra você no app — pode ser ajustado depois.
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => choose('GESTAO')}
            disabled={submitting !== null}
            className="flex w-full items-center gap-3 border border-border p-4 text-left transition-colors hover:border-ink disabled:opacity-50"
          >
            <Wallet size={18} className="shrink-0 text-foreground-muted" />
            <div>
              <p className="text-sm font-medium text-ink">Só gestão do meu negócio</p>
              <p className="mt-0.5 text-xs text-foreground-muted">Agenda e Gestão apenas — não quero ser encontrado por novos clientes aqui.</p>
            </div>
          </button>
          <button
            onClick={() => choose('COMPLETO')}
            disabled={submitting !== null}
            className="flex w-full items-center gap-3 border border-border p-4 text-left transition-colors hover:border-ink disabled:opacity-50"
          >
            <Briefcase size={18} className="shrink-0 text-foreground-muted" />
            <div>
              <p className="text-sm font-medium text-ink">Gestão + conseguir novos clientes</p>
              <p className="mt-0.5 text-xs text-foreground-muted">Experiência completa, do jeito que já era.</p>
            </div>
          </button>
          <button
            onClick={() => choose('CONTRATACAO')}
            disabled={submitting !== null}
            className="flex w-full items-center gap-3 border border-border p-4 text-left transition-colors hover:border-ink disabled:opacity-50"
          >
            <Handshake size={18} className="shrink-0 text-foreground-muted" />
            <div>
              <p className="text-sm font-medium text-ink">Só contratação dos meus serviços</p>
              <p className="mt-0.5 text-xs text-foreground-muted">
                Quero aparecer pra novos clientes — não preciso das ferramentas de gestão.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
