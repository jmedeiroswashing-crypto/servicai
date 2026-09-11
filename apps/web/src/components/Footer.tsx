import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border py-10 text-sm text-foreground/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} ServiçAi — Intermediação inteligente de serviços.</p>
        <div className="flex gap-6">
          <Link href="/buscar" className="hover:text-foreground">
            Buscar
          </Link>
          <Link href="/cadastro?tipo=PRESTADOR" className="hover:text-foreground">
            Para prestadores
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Entrar
          </Link>
        </div>
      </div>
    </footer>
  );
}
