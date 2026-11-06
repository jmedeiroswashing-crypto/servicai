/* eslint-disable @next/next/no-img-element */

const COLORS = ['#1a6fe8', '#0f766e', '#7c3aed', '#be185d', '#b45309', '#15803d', '#4338ca', '#b91c1c'];

function colorFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** Foto real da pessoa ou, na falta dela, as iniciais em um fundo colorido. */
export function Avatar({
  name,
  src,
  className = 'h-9 w-9 text-sm',
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  if (src) {
    return <img src={src} alt={`Foto de ${name}`} loading="lazy" className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: colorFor(name) }}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
