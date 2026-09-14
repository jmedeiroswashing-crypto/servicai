'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import type { Category } from '@/lib/categories';

export function CategorySelect({
  categories,
  value,
  onChange,
  placeholder = 'Buscar categoria...',
  allowEmpty,
  emptyLabel = 'Todas as categorias',
  className = '',
}: {
  categories: Category[];
  value: string;
  onChange: (label: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.label.toLowerCase().includes(q));
  }, [categories, query]);

  function selectCategory(label: string) {
    onChange(label);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex w-full items-center justify-between gap-2 border border-border bg-transparent px-3.5 py-2.5 text-left text-sm outline-none transition-colors focus:border-ink"
      >
        <span className={value ? 'text-ink' : 'text-foreground-muted/50'}>{value || emptyLabel}</span>
        <ChevronDown size={14} className={`shrink-0 text-foreground-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 border border-border bg-surface shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)]">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search size={14} className="shrink-0 text-foreground-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-foreground-muted/50"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca">
                <X size={14} className="text-foreground-muted hover:text-ink" />
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {allowEmpty && (
              <button
                type="button"
                onClick={() => selectCategory('')}
                className={`block w-full px-3.5 py-2 text-left text-sm hover:bg-surface-muted ${!value ? 'text-ink font-medium' : 'text-foreground-muted'}`}
              >
                {emptyLabel}
              </button>
            )}
            {filtered.length === 0 && (
              <p className="px-3.5 py-3 text-sm text-foreground-muted">Nenhuma categoria encontrada.</p>
            )}
            {filtered.map((c) => (
              <button
                type="button"
                key={c.slug}
                onClick={() => selectCategory(c.label)}
                className={`block w-full px-3.5 py-2 text-left text-sm hover:bg-surface-muted ${
                  value === c.label ? 'text-ink font-medium' : 'text-foreground-muted'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
