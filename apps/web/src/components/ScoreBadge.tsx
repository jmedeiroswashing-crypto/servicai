import { Star } from 'lucide-react';

/** Resumo do perfil público. O plano do prestador não aparece: fica só no painel dele. */
export function ScoreBadge({ rating, scoreIA }: { rating: number; scoreIA: number }) {
  if (rating <= 0) {
    return <span className="rounded-pill bg-cta-soft px-2 py-0.5 text-xs font-semibold text-cta-strong">Novo</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="flex items-center gap-1 font-medium text-ink">
        <Star size={13} className="fill-[#f5a524] text-[#f5a524]" aria-hidden="true" />
        {rating.toFixed(1)}
      </span>
      <span className="text-foreground-muted">Score {Math.round(scoreIA)}</span>
    </div>
  );
}
