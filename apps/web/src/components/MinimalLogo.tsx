import Link from 'next/link';
import { Logo } from './Logo';

export function MinimalLogo() {
  return (
    <Link href="/" aria-label="ServiçAi, página inicial" className="mb-8 inline-flex">
      <Logo />
    </Link>
  );
}
