/**
 * Aceita só caminhos internos no parâmetro `next`, para o login não poder ser
 * usado como redirecionamento para outro site.
 */
export function safeNext(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  // Caracteres de controle fazem o navegador ignorar parte do caminho.
  if (/[\u0000-\u001f]/.test(value)) return null;
  return value;
}

/** Endereço do login que traz a pessoa de volta para a página atual. */
export function loginUrl(): string {
  if (typeof window === 'undefined') return '/login';
  const next = safeNext(window.location.pathname + window.location.search);
  return next && next !== '/' ? `/login?next=${encodeURIComponent(next)}` : '/login';
}

export function withNext(href: string, next: string | null): string {
  if (!next) return href;
  return `${href}${href.includes('?') ? '&' : '?'}next=${encodeURIComponent(next)}`;
}
