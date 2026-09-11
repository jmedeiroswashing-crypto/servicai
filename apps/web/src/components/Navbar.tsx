'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useState } from 'react';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl gradient-brand text-white">
            <Sparkles size={18} />
          </span>
          <span className="text-gradient-brand">ServiçAi</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-foreground/70 sm:flex">
          <Link href="/buscar" className="hover:text-foreground transition-colors">
            Buscar serviços
          </Link>
          <Link href="/cadastro?tipo=PRESTADOR" className="hover:text-foreground transition-colors">
            Anuncie seu serviço
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:shadow-sm transition-shadow"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full gradient-brand text-white">
                  <User size={14} />
                </span>
                {user.name.split(' ')[0]}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
                  {user.role === 'PRESTADOR' && (
                    <Link
                      href="/painel"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-muted"
                    >
                      <LayoutDashboard size={16} /> Meu painel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                      router.push('/');
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-500 hover:bg-surface-muted"
                  >
                    <LogOut size={16} /> Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="rounded-full gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.03]"
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
