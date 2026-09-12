import { Star } from 'lucide-react';
import type { Selo } from '@/lib/types';

const SELO_LABEL: Record<Selo, string | null> = {
  NENHUM: null,
  PRATA: 'Prata',
  OURO: 'Ouro',
  PREMIUM: 'Premium',
};

export function ScoreBadge({ rating, scoreIA, selo }: { rating: number; scoreIA: number; selo: Selo }) {
  const seloLabel = SELO_LABEL[selo];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="flex items-center gap-1 font-medium text-ink">
        <Star size={13} className="fill-accent text-accent" />
        {rating.toFixed(1)}
      </span>
      <span className="text-foreground-muted">Score {Math.round(scoreIA)}</span>
      {seloLabel && (
        <span className="border border-border px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-foreground-muted">
          {seloLabel}
        </span>
      )}
    </div>
  );
}
