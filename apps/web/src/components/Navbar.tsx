'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LogOut,
  LayoutDashboard,
  CreditCard,
  MessageCircle,
  Sparkles,
  FileText,
  UserCog,
  Zap,
  Menu,
  X,
  User,
  CalendarDays,
  Wallet,
  CalendarClock,
  ShoppingBag,
  Search,
  Megaphone,
  Tag,
  Flag,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { NotificationBell } from './NotificationBell';
import { useState } from 'react';

interface NavLink {
  href: string;
  label: string;
  icon: typeof Search;
}

function getNavLinks(role?: string): NavLink[] {
  if (role === 'PRESTADOR') {
    return [
      { href: '/painel', label: 'Painel', icon: LayoutDashboard },
      { href: '/painel/agenda', label: 'Agenda', icon: CalendarDays },
      { href: '/painel/faturamento', label: 'Faturamento', icon: Wallet },
      { href: '/painel/oportunidades', label: 'Oportunidades', icon: Sparkles },
      { href: '/painel/vagas-ultima-hora', label: 'Vagas de última hora', icon: Zap },
      { href: '/painel/perfil', label: 'Dados profissionais', icon: UserCog },
      { href: '/painel/plano', label: 'Meu plano', icon: CreditCard },
      { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
      { href: '/marketplace/meus-anuncios', label: 'Meus anúncios', icon: Tag },
      { href: '/mensagens', label: 'Mensagens', icon: MessageCircle },
      { href: '/perfil', label: 'Meu perfil', icon: User },
    ];
  }
  if (role === 'CLIENTE') {
    return [
      { href: '/buscar', label: 'Buscar serviços', icon: Search },
      { href: '/vagas-ultima-hora', label: 'Vagas de última hora', icon: Zap },
      { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
      { href: '/solicitar', label: 'Publicar solicitação', icon: FileText },
      { href: '/minhas-solicitacoes', label: 'Minhas solicitações', icon: LayoutDashboard },
      { href: '/minhas-reservas', label: 'Minhas reservas', icon: CalendarClock },
      { href: '/marketplace/meus-anuncios', label: 'Meus anúncios', icon: Tag },
      { href: '/mensagens', label: 'Mensagens', icon: MessageCircle },
      { href: '/perfil', label: 'Meu perfil', icon: User },
    ];
  }
  if (role === 'ADMIN') {
    return [
      { href: '/admin/denuncias', label: 'Denúncias', icon: Flag },
      { href: '/admin/identidade', label: 'Verificação de identidade', icon: ShieldCheck },
      { href: '/admin/planos', label: 'Planos', icon: CreditCard },
      { href: '/perfil', label: 'Meu perfil', icon: User },
    ];
  }
  // Visitante (não logado)
  return [
    { href: '/buscar', label: 'Buscar serviços', icon: Search },
    { href: '/vagas-ultima-hora', label: 'Vagas de última hora', icon: Zap },
    { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { href: '/cadastro?tipo=PRESTADOR', label: 'Anuncie seu serviço', icon: Megaphone },
    { href: '/precos', label: 'Planos', icon: CreditCard },
  ];
}

export function Navbar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const links = getNavLinks(user?.role);

  return (
    <header className="sticky top-0 z-50 border-b border-ink bg-ink">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="" className="h-8 w-auto" />
          <span className="font-display hidden text-xl font-medium tracking-tight sm:inline">
            <span className="text-white">Servic</span>
            <span className="text-accent">AI</span>
          </span>
        </Link>

        {/* Todas as funções, em fila, direto na barra — sem menu escondido */}
        <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto sm:flex" aria-label="Navegação principal">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-[0.82rem] transition-colors ${
                  active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <link.icon size={13} /> {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3 sm:ml-0">
          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Abrir menu"
            className="flex items-center justify-center p-1.5 text-white sm:hidden"
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          {user ? (
            <>
              <NotificationBell />
              <button
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                className="hidden items-center gap-1.5 border border-white/25 px-3 py-1.5 text-sm text-white hover:border-danger hover:text-danger sm:flex"
              >
                <LogOut size={14} /> Sair
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm text-white/70 transition-colors hover:text-white sm:block">
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

      {mobileNavOpen && (
        <nav className="flex max-h-[75vh] flex-col overflow-y-auto border-t border-white/15 bg-ink px-4 py-2 text-sm text-white/85 sm:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-2.5 border-b border-white/10 py-3"
            >
              <link.icon size={15} className="shrink-0 text-white/60" /> {link.label}
            </Link>
          ))}
          {user ? (
            <button
              onClick={() => {
                logout();
                setMobileNavOpen(false);
                router.push('/');
              }}
              className="flex items-center gap-2.5 py-3 text-left text-danger"
            >
              <LogOut size={15} /> Sair
            </button>
          ) : (
            <Link href="/login" onClick={() => setMobileNavOpen(false)} className="py-3">
              Entrar
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
