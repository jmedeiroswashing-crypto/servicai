'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles } from 'lucide-react';

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
      className={`flex w-full items-center gap-2 rounded-full border border-border bg-surface shadow-sm transition-shadow focus-within:shadow-md ${
        large ? 'p-2 pl-5' : 'p-1.5 pl-4'
      }`}
    >
      <Sparkles size={large ? 20 : 16} className="shrink-0 text-brand" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='Descreva o que você precisa: "eletricista urgente perto de mim"'
        className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-foreground/40 ${
          large ? 'text-base' : 'text-sm'
        }`}
      />
      <button
        type="submit"
        className={`flex shrink-0 items-center gap-2 rounded-full gradient-brand font-semibold text-white transition-transform hover:scale-[1.03] ${
          large ? 'px-6 py-3 text-sm' : 'px-4 py-2 text-xs'
        }`}
      >
        <Search size={large ? 16 : 14} />
        Buscar
      </button>
    </form>
  );
}
