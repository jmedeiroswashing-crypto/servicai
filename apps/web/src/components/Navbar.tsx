'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, Plus } from 'lucide-react';
import { getHeaderLinks, isChromeHidden, isItemActive } from '@/lib/nav';
import { useUnreadMessages } from '@/lib/use-unread-messages';
import { useAuthStore } from '@/store/auth-store';
import { AccountMenu } from './AccountMenu';
import { CitySelector } from './CitySelector';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { SearchBar } from './SearchBar';

function MessagesLink() {
  const { unreadCount, markAllRead } = useUnreadMessages();
  return (
    <Link
      href="/mensagens"
      onClick={markAllRead}
      aria-label={unreadCount > 0 ? `Mensagens, ${unreadCount} não lidas` : 'Mensagens'}
      className="relative hidden h-11 w-11 items-center justify-center rounded-full text-on-brand-dark transition-colors duration-150 hover:bg-white/10 md:flex"
    >
      <MessageCircle size={20} aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-pill bg-cta px-1 text-[0.65rem] font-semibold text-on-cta">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}

export function Navbar() {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (isChromeHidden(pathname)) return null;

  const links = getHeaderLinks(user?.role, user?.businessMode);
  const isClientOrVisitor = !user || user.role === 'CLIENTE';

  return (
    <header
      className={`sticky top-0 z-40 bg-brand-dark pt-[env(safe-area-inset-top)] transition-shadow duration-200 ${
        scrolled ? 'shadow-soft-md' : ''
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:gap-3">
        <Link href="/" aria-label="ServiçAi, página inicial" className="shrink-0 rounded-lg">
          {/* A abertura da home mede esta posição para levar a logo até aqui. */}
          <span data-brand-logo className="inline-flex">
            <Logo onDark />
          </span>
        </Link>

        {isClientOrVisitor && (
          <>
            <div className="hidden min-w-0 flex-1 md:block lg:max-w-md">
              <SearchBar compact />
            </div>
            <CitySelector />
          </>
        )}

        {links.length > 0 && (
          <nav aria-label="Navegação principal" className="ml-2 hidden min-w-0 items-center gap-1 md:flex">
            {links.map((link) => {
              const active = isItemActive(pathname, link);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-11 items-center whitespace-nowrap rounded-pill px-3 text-sm font-medium transition-colors duration-150 ${
                    active ? 'bg-white/15 text-on-brand-dark' : 'text-on-brand-dark/80 hover:bg-white/10 hover:text-on-brand-dark'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1 lg:gap-2">
          {isClientOrVisitor && (
            <Link
              href="/solicitar"
              className="hidden min-h-11 items-center gap-1.5 whitespace-nowrap rounded-pill bg-cta px-4 text-sm font-semibold text-on-cta transition-colors duration-150 hover:bg-cta-strong lg:flex"
            >
              <Plus size={16} aria-hidden="true" /> Publicar pedido
            </Link>
          )}

          {user ? (
            <>
              <NotificationBell />
              {user.role === 'CLIENTE' && <MessagesLink />}
              <div className={user.role === 'CLIENTE' ? 'hidden md:block' : ''}>
                <AccountMenu />
              </div>
            </>
          ) : (
            <>
              <Link
                href="/comecar?tipo=empresario"
                className="hidden min-h-11 items-center whitespace-nowrap rounded-pill px-3 text-sm font-medium text-on-brand-dark/90 transition-colors duration-150 hover:bg-white/10 xl:flex"
              >
                Seja um prestador
              </Link>
              <Link
                href="/login"
                className="hidden min-h-11 items-center rounded-pill px-3 text-sm font-medium text-on-brand-dark transition-colors duration-150 hover:bg-white/10 md:flex"
              >
                Entrar
              </Link>
              <Link
                href="/comecar"
                className="hidden min-h-11 items-center whitespace-nowrap rounded-pill border border-white/40 px-4 text-sm font-semibold text-on-brand-dark transition-colors duration-150 hover:bg-white/10 md:flex"
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
