import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border py-12 text-sm text-foreground-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <p className="font-display text-lg text-ink">ServiçAi</p>
            <p className="mt-2 text-[0.85rem] leading-relaxed">
              Intermediação de serviços com reputação verificada e apoio de inteligência artificial.
            </p>
          </div>
          <div className="flex flex-wrap gap-12">
            <div className="flex flex-col gap-2">
              <span className="mb-1 text-xs font-medium uppercase tracking-wide text-foreground-muted/70">
                Produto
              </span>
              <Link href="/buscar" className="hover:text-foreground">
                Buscar
              </Link>
              <Link href="/precos" className="hover:text-foreground">
                Planos
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="mb-1 text-xs font-medium uppercase tracking-wide text-foreground-muted/70">
                Conta
              </span>
              <Link href="/cadastro?tipo=PRESTADOR" className="hover:text-foreground">
                Para vendedores
              </Link>
              <Link href="/login" className="hover:text-foreground">
                Entrar
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-8">
          <span className="mb-3 block text-xs font-medium uppercase tracking-wide text-foreground-muted/70">
            Categorias populares
          </span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/buscar?q=${encodeURIComponent(c.label)}`}
                className="text-[0.85rem] hover:text-foreground"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>

        <p className="border-t border-border pt-6 text-xs text-foreground-muted/70">
          © {new Date().getFullYear()} ServiçAi.
        </p>
      </div>
    </footer>
  );
}
