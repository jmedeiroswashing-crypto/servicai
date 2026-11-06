'use client';

import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { isChromeHidden } from '@/lib/nav';
import { WHATSAPP_NUMBER, whatsappSupportUrl } from '@/lib/site-config';

/** Só aparece com NEXT_PUBLIC_WHATSAPP_NUMBER configurado. */
export function WhatsAppButton() {
  const pathname = usePathname();
  if (!WHATSAPP_NUMBER || isChromeHidden(pathname) || pathname === '/mensagens') return null;

  return (
    <a
      href={whatsappSupportUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com o suporte pelo WhatsApp"
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#128c4b] text-white shadow-soft-lg transition duration-150 hover:-translate-y-0.5 md:bottom-6 md:right-6"
    >
      <MessageCircle size={26} aria-hidden="true" />
    </a>
  );
}
