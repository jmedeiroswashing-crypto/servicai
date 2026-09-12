'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

export function SearchBar({ initialValue = '', large = false }: { initialValue?: string; large?: boolean }) {
  const [value, setValue] = useState(initialValue);
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    router.push(`/buscar?q=${encodeURIComponent(value.trim())}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex w-full items-center gap-3 border-b-2 border-ink bg-transparent transition-colors focus-within:border-accent ${
        large ? 'py-3' : 'py-2'
      }`}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="eletricista urgente, salão perto de mim, advogado trabalhista..."
        className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-foreground-muted/60 ${
          large ? 'text-lg' : 'text-sm'
        }`}
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-ink transition-colors hover:text-accent"
      >
        Buscar
        <ArrowRight size={large ? 18 : 14} />
      </button>
    </form>
  );
}
