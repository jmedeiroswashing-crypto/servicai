'use client';

import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { CitySelector } from '@/components/CitySelector';
import { buildSearchUrl } from '@/components/SearchBar';
import { TAXONOMY } from '@/lib/taxonomy';
import { useCityStore } from '@/store/city-store';

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const SUGGESTIONS = TAXONOMY.flatMap((category) => [
  { label: category.label, hint: 'Categoria' },
  ...category.subcategories.map((sub) => ({ label: sub.label, hint: category.label })),
]);

export function HeroSearch() {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const city = useCityStore((s) => s.city);
  const router = useRouter();
  const listId = useId();

  const term = normalize(value.trim());
  const matches = term ? SUGGESTIONS.filter((s) => normalize(s.label).includes(term)).slice(0, 7) : [];
  const showList = open && matches.length > 0;

  function search(query: string) {
    const trimmed = query.trim();
    if (trimmed) router.push(buildSearchUrl(trimmed, city));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    search(activeIndex >= 0 && showList ? matches[activeIndex].label : value);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!showList) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? matches.length - 1 : i - 1));
    }
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="grid gap-2 rounded-card bg-surface p-3 text-foreground shadow-soft-lg md:grid-cols-[1fr_minmax(0,14rem)_auto]"
    >
      <div className="relative">
        <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 && showList ? `${listId}-${activeIndex}` : undefined}
          aria-label="O que você precisa?"
          placeholder="O que você precisa?"
          autoComplete="off"
          className="h-12 w-full rounded-lg border border-border bg-transparent pl-10 pr-3 text-base outline-none transition-colors duration-150 placeholder:text-foreground-muted focus:border-accent"
        />
        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Sugestões de serviços"
            className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-card border border-border bg-surface py-1 shadow-soft-lg"
          >
            {matches.map((match, index) => (
              <li
                key={match.label}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                // mouseDown para escolher antes de o campo perder o foco.
                onMouseDown={(e) => {
                  e.preventDefault();
                  search(match.label);
                }}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-sm ${
                  index === activeIndex ? 'bg-surface-muted' : 'hover:bg-surface-muted'
                }`}
              >
                <span className="font-medium text-ink">{match.label}</span>
                <span className="truncate text-xs text-foreground-muted">{match.hint}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CitySelector variant="hero" />

      <button
        type="submit"
        className="h-12 rounded-lg bg-accent px-6 text-sm font-semibold text-on-accent transition-colors duration-150 hover:bg-accent-strong"
      >
        Buscar
      </button>
    </form>
  );
}
