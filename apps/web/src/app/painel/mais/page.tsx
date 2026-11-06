'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, LifeBuoy, LogOut } from 'lucide-react';
import { GRUPOS, menuDe, type Grupo } from '@/lib/painel/modulos';
import { useAuthStore } from '@/store/auth-store';

/** No celular, o menu completo. */
export default function MaisPage() {
  const modo = useAuthStore((s) => s.user?.businessMode);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const queryClient = useQueryClient();
  const menu = menuDe(modo);
  return (
    <div className="e-mais">
      {(Object.keys(GRUPOS) as Grupo[]).map((g) => {
        const itens = menu.filter((m) => m.grupo === g);
        if (itens.length === 0) return null;
        return (
          <Fragment key={g}>
            <h2>{GRUPOS[g]}</h2>
            {itens.map((m) => (
              <Link key={m.id} href={m.href}>
                <m.icone size={22} aria-hidden="true" style={{ flex: 'none', color: 'var(--teal-txt)' }} />
                <span>
                  <b>{m.nome}</b>
                  <small>{m.frase}</small>
                </span>
              </Link>
            ))}
          </Fragment>
        );
      })}
      <h2>Conta</h2>
      <Link href="/">
        <ExternalLink size={22} aria-hidden="true" style={{ flex: 'none', color: 'var(--teal-txt)' }} />
        <span>
          <b>Ver o site</b>
          <small>Voltar para a página inicial do ServiçAi.</small>
        </span>
      </Link>
      <Link href="/perfil/editar">
        <LifeBuoy size={22} aria-hidden="true" style={{ flex: 'none', color: 'var(--teal-txt)' }} />
        <span>
          <b>Conta e configurações</b>
          <small>Seus dados de acesso e preferências.</small>
        </span>
      </Link>
      <button
        type="button"
        onClick={() => {
          logout();
          queryClient.clear();
          router.push('/');
        }}
      >
        <LogOut size={22} aria-hidden="true" style={{ flex: 'none', color: 'var(--teal-txt)' }} />
        <span>
          <b>Sair da conta</b>
          <small>O site continua aberto para navegar.</small>
        </span>
      </button>
    </div>
  );
}
