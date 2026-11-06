'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { getAccountMenu } from '@/lib/nav';
import { useAuthStore } from '@/store/auth-store';
import { Avatar } from './Avatar';

export function AccountMenu() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir menu da conta"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-150 hover:bg-white/10"
      >
        <Avatar name={user.name} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-border bg-surface py-1 text-foreground shadow-soft-lg"
        >
          <p className="truncate border-b border-border px-4 py-3 text-sm font-semibold text-ink">{user.name}</p>
          {getAccountMenu(user.role, user.businessMode).map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center px-4 text-sm hover:bg-surface-muted"
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              logout();
              setOpen(false);
              router.push('/');
            }}
            className="flex min-h-11 w-full items-center gap-2 border-t border-border px-4 text-left text-sm text-danger hover:bg-surface-muted"
          >
            <LogOut size={15} aria-hidden="true" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}
