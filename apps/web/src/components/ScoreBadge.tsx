import { Star, ShieldCheck } from 'lucide-react';
import type { Selo } from '@/lib/types';

const SELO_STYLES: Record<Selo, { label: string; className: string } | null> = {
  NENHUM: null,
  PRATA: { label: 'Selo Prata', className: 'bg-slate-200 text-slate-700' },
  OURO: { label: 'Selo Ouro', className: 'bg-amber-100 text-amber-700' },
  PREMIUM: { label: 'Selo Premium', className: 'gradient-brand text-white' },
};

export function ScoreBadge({ rating, scoreIA, selo }: { rating: number; scoreIA: number; selo: Selo }) {
  const seloInfo = SELO_STYLES[selo];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-sm font-medium">
        <Star size={14} className="fill-amber-400 text-amber-400" />
        {rating.toFixed(1)}
      </span>
      <span className="flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-sm font-semibold text-brand">
        <ShieldCheck size={14} />
        Score IA {Math.round(scoreIA)}
      </span>
      {seloInfo && (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${seloInfo.className}`}>
          {seloInfo.label}
        </span>
      )}
    </div>
  );
}
