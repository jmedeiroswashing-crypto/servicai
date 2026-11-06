'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HAS_IMAGE_CREDITS } from '@/lib/images';
import { isChromeHidden } from '@/lib/nav';
import { SOCIAL_LINKS, WHATSAPP_NUMBER, whatsappSupportUrl } from '@/lib/site-config';
import { Logo } from './Logo';

const COLUMNS = [
  {
    title: 'ServiçAi',
    links: [
      { href: '/sobre', label: 'Sobre' },
      { href: '/#como-funciona', label: 'Como funciona' },
      { href: '/categorias', label: 'Categorias' },
    ],
  },
  {
    title: 'Para prestadores',
    links: [
      { href: '/comecar?tipo=empresario', label: 'Seja um prestador' },
      { href: '/precos', label: 'Planos' },
      { href: '/login/empresario', label: 'Entrar como empresário' },
    ],
  },
  {
    title: 'Ajuda',
    links: [
      { href: '/#faq', label: 'Perguntas frequentes' },
      { href: '/ajuda', label: 'Central de ajuda' },
    ],
  },
];

const linkClass = 'inline-flex min-h-9 items-center hover:text-ink hover:underline';

export function Footer() {
  const pathname = usePathname();
  if (isChromeHidden(pathname)) return null;

  return (
    <footer className="mt-auto border-t border-border bg-surface-muted text-sm text-foreground-muted">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3">Encontre profissionais perto de você e organize seu negócio em um só lugar.</p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="mb-2 font-semibold text-ink">{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
                {column.title === 'Ajuda' && WHATSAPP_NUMBER && (
                  <li>
                    <a href={whatsappSupportUrl()} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      Contato via WhatsApp
                    </a>
                  </li>
                )}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} ServiçAi. Todos os direitos reservados.</p>
          <ul className="flex flex-wrap gap-x-5">
            <li>
              <Link href="/termos" className={linkClass}>
                Termos de uso
              </Link>
            </li>
            <li>
              <Link href="/privacidade" className={linkClass}>
                Política de privacidade (LGPD)
              </Link>
            </li>
            {SOCIAL_LINKS.map((social) => (
              <li key={social.label}>
                <a href={social.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {social.label}
                </a>
              </li>
            ))}
            {HAS_IMAGE_CREDITS && (
              <li>
                <a href="/images/CREDITS.md" className={linkClass}>
                  Créditos das fotos
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
    </footer>
  );
}
