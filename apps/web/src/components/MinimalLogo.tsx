import Link from 'next/link';

export function MinimalLogo() {
  return (
    <Link href="/" className="mb-10 flex w-fit items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-icon.png" alt="" className="h-8 w-auto" />
      <span className="font-display text-xl font-medium tracking-tight">
        <span className="text-ink">Servic</span>
        <span className="text-accent">AI</span>
      </span>
    </Link>
  );
}
