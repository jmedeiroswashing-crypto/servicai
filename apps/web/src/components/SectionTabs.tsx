'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSectionTabs, hasOwnShell } from '@/lib/nav';
import { useAuthStore } from '@/store/auth-store';

/** Abas entre telas do mesmo assunto, como Caixa, Calendário e Gestão. */
export function SectionTabs() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const tabs = getSectionTabs(pathname, user?.role, user?.businessMode);

  if (tabs.length === 0 || hasOwnShell(pathname)) return null;

  return (
    <nav aria-label="Seções" className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl gap-1 px-4 sm:px-6">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-11 min-w-0 flex-1 items-center justify-center border-b-2 px-2 text-center text-sm font-medium transition-colors duration-150 sm:flex-none sm:px-4 ${
                active ? 'border-accent text-ink' : 'border-transparent text-foreground-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
