'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, LayoutDashboard, CreditCard, MessageCircle, Sparkles, FileText, UserCog, Zap } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { NotificationBell } from './NotificationBell';
import { useState } from 'react';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink bg-ink">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="" className="h-8 w-auto" />
          <span className="font-display text-xl font-medium tracking-tight">
            <span className="text-white">Servic</span>
            <span className="text-accent">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-[0.9rem] text-white/70 sm:flex">
          <Link href="/buscar" className="link-underline pb-0.5 hover:text-white">
            Buscar serviços
          </Link>
          <Link href="/vagas-ultima-hora" className="link-underline flex items-center gap-1 pb-0.5 hover:text-white">
            <Zap size={13} /> Vagas de última hora
          </Link>
          <Link href="/cadastro?tipo=PRESTADOR" className="link-underline pb-0.5 hover:text-white">
            Anuncie seu serviço
          </Link>
          <Link href="/precos" className="link-underline pb-0.5 hover:text-white">
            Planos
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
            <NotificationBell />
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 border border-white/25 px-3 py-1.5 text-sm text-white hover:border-white/50"
              >
                {user.name.split(' ')[0]}
                <ChevronDown size={14} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 border border-border bg-surface shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)]">
                  {user.role === 'PRESTADOR' && (
                    <>
                      <Link
                        href="/painel"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 border-b border-border px-4 py-3 text-sm hover:bg-surface-muted"
                      >
                        <LayoutDashboard size={15} className="text-foreground-muted" /> Meu painel
                      </Link>
                      <Link
                        href="/painel/oportunidades"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 border-b border-border px-4 py-3 text-sm hover:bg-surface-muted"
                      >
                        <Sparkles size={15} className="text-foreground-muted" /> Oportunidades
                      </Link>
                      <Link
                        href="/painel/vagas-ultima-hora"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 border-b border-border px-4 py-3 text-sm hover:bg-surface-muted"
                      >
                        <Zap size={15} className="text-foreground-muted" /> Vagas de última hora
                      </Link>
                      <Link
                        href="/painel/perfil"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 border-b border-border px-4 py-3 text-sm hover:bg-surface-muted"
                      >
                        <UserCog size={15} className="text-foreground-muted" /> Editar perfil
                      </Link>
                      <Link
                        href="/painel/plano"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 border-b border-border px-4 py-3 text-sm hover:bg-surface-muted"
                      >
                        <CreditCard size={15} className="text-foreground-muted" /> Meu plano
                      </Link>
                    </>
                  )}
                  {user.role === 'CLIENTE' && (
                    <>
                      <Link
                        href="/solicitar"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 border-b border-border px-4 py-3 text-sm hover:bg-surface-muted"
                      >
                        <FileText size={15} className="text-foreground-muted" /> Publicar solicitação
                      </Link>
                      <Link
                        href="/minhas-solicitacoes"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 border-b border-border px-4 py-3 text-sm hover:bg-surface-muted"
                      >
                        <LayoutDashboard size={15} className="text-foreground-muted" /> Minhas solicitações
                      </Link>
                    </>
                  )}
                  <Link
                    href="/mensagens"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 border-b border-border px-4 py-3 text-sm hover:bg-surface-muted"
                  >
                    <MessageCircle size={15} className="text-foreground-muted" /> Mensagens
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                      router.push('/');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-danger hover:bg-surface-muted"
                  >
                    <LogOut size={15} /> Sair
                  </button>
                </div>
              )}
            </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm text-white/70 transition-colors hover:text-white sm:block"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="border border-accent bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85"
              >
                Criar conta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
