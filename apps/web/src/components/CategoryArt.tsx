import { getCategoryIcon } from '@/lib/category-art';

export function CategoryArt({ category, className = '' }: { category: string; className?: string }) {
  const Icon = getCategoryIcon(category);

  return (
    <div className={`flex items-center justify-center bg-surface-muted ${className}`}>
      <Icon size={44} strokeWidth={1.25} className="text-ink/70" />
    </div>
  );
}
