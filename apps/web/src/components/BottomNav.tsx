'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getBottomNav, hasOwnShell, isItemActive, type NavItem } from '@/lib/nav';
import { useUnreadMessages } from '@/lib/use-unread-messages';
import { useAuthStore } from '@/store/auth-store';

function BottomNavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const { unreadCount, markAllRead } = useUnreadMessages();
  const active = isItemActive(pathname, item);
  const isMessages = item.href === '/mensagens';
  const badge = isMessages ? unreadCount : 0;

  if (item.primary) {
    return (
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold text-ink"
      >
        <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-cta text-on-cta shadow-soft-md">
          <item.icon size={24} aria-hidden="true" />
        </span>
        {item.label}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={isMessages ? markAllRead : undefined}
      aria-current={active ? 'page' : undefined}
      aria-label={badge > 0 ? `${item.label}, ${badge} não lidas` : undefined}
      className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium transition-colors duration-150 ${
        active ? 'text-accent' : 'text-foreground-muted'
      }`}
    >
      <span className="relative">
        <item.icon size={22} aria-hidden="true" />
        {badge > 0 && (
          <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-pill bg-cta px-1 text-[0.65rem] font-semibold text-on-cta">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className="max-w-full truncate px-0.5">{item.label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  if (hasOwnShell(pathname)) return null;

  const items = getBottomNav(user?.role, user?.businessMode);

  return (
    <>
      {/* Reserva o espaço da barra fixa para ela não cobrir o fim da página. */}
      <div aria-hidden="true" className="h-[calc(4rem+env(safe-area-inset-bottom))] md:hidden" />
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-soft-md md:hidden"
      >
        <div className="flex h-16 items-stretch">
          {items.map((item) => (
            <BottomNavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      </nav>
    </>
  );
}
