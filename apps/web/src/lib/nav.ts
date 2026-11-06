import {
  BarChart3,
  CalendarDays,
  CreditCard,
  Flag,
  Home,
  LayoutDashboard,
  LayoutGrid,
  LogIn,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { BusinessMode, Role } from './types';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Outras rotas que também deixam este item marcado como ativo. */
  match?: string[];
  /** Botão central destacado na barra inferior. */
  primary?: boolean;
}

const DINHEIRO_ROUTES = ['/painel/caixa', '/painel/calendario', '/painel/faturamento'];
const CONSEGUIR_ROUTES = [
  '/painel/conseguir-clientes',
  '/painel/oportunidades',
  '/painel/vagas-ultima-hora',
  '/painel/prospeccao',
];

const INICIO: NavItem = { href: '/painel', label: 'Início', icon: LayoutDashboard };
const AGENDA: NavItem = { href: '/painel/agenda', label: 'Agenda', icon: CalendarDays };
const CLIENTES: NavItem = {
  href: '/painel/clientes',
  label: 'Clientes',
  icon: Users,
  match: ['/painel/clientes', ...CONSEGUIR_ROUTES],
};
const NOVOS_CLIENTES: NavItem = {
  href: '/painel/conseguir-clientes',
  label: 'Novos clientes',
  icon: Users,
  match: CONSEGUIR_ROUTES,
};
const DINHEIRO: NavItem = { href: '/painel/faturamento', label: 'Dinheiro', icon: BarChart3, match: DINHEIRO_ROUTES };
const MENSAGENS: NavItem = { href: '/mensagens', label: 'Mensagens', icon: MessageCircle };

/** Áreas de foco, sem header, rodapé ou barra inferior. */
export function isChromeHidden(pathname: string): boolean {
  return (
    pathname === '/comecar' ||
    pathname === '/cadastro' ||
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/conserto' ||
    pathname.startsWith('/conserto/')
  );
}

/** O painel do prestador tem moldura própria: nada da navegação do site aparece nele. */
export function hasOwnShell(pathname: string): boolean {
  return isChromeHidden(pathname) || pathname === '/painel' || pathname.startsWith('/painel/');
}

/** Links do empresário e do admin no header. Cliente e visitante usam busca e botões. */
export function getHeaderLinks(role?: Role, mode?: BusinessMode | null): NavItem[] {
  if (role === 'PRESTADOR') {
    if (mode === 'GESTAO') return [INICIO, AGENDA, CLIENTES, DINHEIRO];
    if (mode === 'CONTRATACAO') return [INICIO, AGENDA, NOVOS_CLIENTES, MENSAGENS];
    return [INICIO, AGENDA, CLIENTES, DINHEIRO, MENSAGENS];
  }
  if (role === 'ADMIN') {
    return [
      { href: '/admin/denuncias', label: 'Denúncias', icon: Flag },
      { href: '/admin/identidade', label: 'Identidade', icon: ShieldCheck },
      { href: '/admin/planos', label: 'Planos', icon: CreditCard },
    ];
  }
  return [];
}

export function getBottomNav(role?: Role, mode?: BusinessMode | null): NavItem[] {
  const headerLinks = getHeaderLinks(role, mode);
  if (headerLinks.length > 0) return headerLinks;
  return [
    { href: '/', label: 'Início', icon: Home },
    { href: '/buscar', label: 'Buscar', icon: Search },
    { href: '/solicitar', label: 'Publicar', icon: Plus, primary: true },
    // Visitante navega sem conta: Mensagens só levaria ao login.
    role ? MENSAGENS : { href: '/categorias', label: 'Categorias', icon: LayoutGrid },
    role
      ? { href: '/perfil', label: 'Perfil', icon: User, match: ['/perfil', '/minhas-solicitacoes', '/minhas-reservas'] }
      : { href: '/login', label: 'Entrar', icon: LogIn },
  ];
}

export function getAccountMenu(role?: Role): { href: string; label: string }[] {
  if (role === 'PRESTADOR') {
    return [
      { href: '/painel', label: 'Modo prestador' },
      { href: '/painel/perfil', label: 'Dados profissionais' },
      { href: '/painel/plano', label: 'Meu plano' },
      { href: '/perfil', label: 'Meu perfil' },
      { href: '/perfil/editar', label: 'Configurações' },
      { href: '/ajuda', label: 'Ajuda' },
    ];
  }
  if (role === 'ADMIN') {
    return [
      { href: '/perfil', label: 'Meu perfil' },
      { href: '/perfil/editar', label: 'Configurações' },
    ];
  }
  return [
    { href: '/minhas-solicitacoes', label: 'Minhas solicitações' },
    { href: '/minhas-reservas', label: 'Minhas reservas' },
    { href: '/perfil', label: 'Meu perfil' },
    { href: '/perfil/editar', label: 'Configurações' },
    { href: '/ajuda', label: 'Ajuda' },
  ];
}

/** Abas que ligam telas do mesmo assunto; vazio quando a tela não pertence a um grupo. */
export function getSectionTabs(
  pathname: string,
  role?: Role,
  mode?: BusinessMode | null,
): { href: string; label: string }[] {
  if (role === 'CLIENTE' && (pathname === '/minhas-solicitacoes' || pathname === '/minhas-reservas')) {
    return [
      { href: '/minhas-solicitacoes', label: 'Solicitações' },
      { href: '/minhas-reservas', label: 'Reservas' },
    ];
  }
  if (role !== 'PRESTADOR') return [];
  if (DINHEIRO_ROUTES.includes(pathname) && mode !== 'CONTRATACAO') {
    return [
      { href: '/painel/caixa', label: 'Caixa' },
      { href: '/painel/calendario', label: 'Calendário' },
      { href: '/painel/faturamento', label: 'Gestão' },
    ];
  }
  const showsClientTabs = mode !== 'GESTAO' && mode !== 'CONTRATACAO';
  if (showsClientTabs && (pathname === '/painel/clientes' || pathname === '/painel/conseguir-clientes')) {
    return [
      { href: '/painel/clientes', label: 'Meus clientes' },
      { href: '/painel/conseguir-clientes', label: 'Conseguir novos' },
    ];
  }
  return [];
}

export function isItemActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true;
  return item.match?.includes(pathname) ?? false;
}
