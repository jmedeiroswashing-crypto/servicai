'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X } from 'lucide-react';
import { hasOwnShell } from '@/lib/nav';
import { SUPPORT_WHATSAPP, whatsappUrl } from '@/lib/site-config';

export function WhatsAppButton() {
  const pathname = usePathname();
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

  if (hasOwnShell(pathname) || pathname === '/mensagens') return null;

  return (
    <div
      ref={rootRef}
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 flex flex-col items-end gap-2 md:bottom-6 md:right-6"
    >
      {open && (
        <ul className="w-56 overflow-hidden rounded-card border border-border bg-surface py-1 text-sm shadow-soft-lg">
          <li className="px-4 py-2 font-semibold text-ink">Suporte pelo WhatsApp</li>
          {SUPPORT_WHATSAPP.map((contact) => (
            <li key={contact.number}>
              <a
                href={whatsappUrl(contact.number)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center px-4 text-foreground hover:bg-surface-muted"
              >
                {contact.label}
              </a>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Fechar opções de suporte' : 'Falar com o suporte pelo WhatsApp'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#128c4b] text-white shadow-soft-lg transition duration-150 hover:-translate-y-0.5"
      >
        {open ? <X size={24} aria-hidden="true" /> : <MessageCircle size={26} aria-hidden="true" />}
      </button>
    </div>
  );
}
