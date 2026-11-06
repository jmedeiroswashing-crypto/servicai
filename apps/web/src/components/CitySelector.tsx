'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, LocateFixed, MapPin } from 'lucide-react';
import { useCityStore } from '@/store/city-store';

interface Municipio {
  nome: string;
  uf: string;
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Lista oficial do IBGE: evita cidades digitadas com grafias diferentes. */
function useMunicipios(enabled: boolean) {
  return useQuery({
    queryKey: ['ibge', 'municipios', 'todos'],
    enabled,
    staleTime: Infinity,
    queryFn: async (): Promise<Municipio[]> => {
      const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado');
      if (!res.ok) throw new Error('Não foi possível carregar as cidades.');
      const data: { 'municipio-nome': string; 'UF-sigla': string }[] = await res.json();
      return data.map((m) => ({ nome: m['municipio-nome'], uf: m['UF-sigla'] }));
    },
  });
}

export function CitySelector({ variant = 'header' }: { variant?: 'header' | 'hero' }) {
  const { city, setCity } = useCityStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const { data: municipios, isLoading, isError } = useMunicipios(open);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const term = normalize(query.trim());
  const suggestions = term ? (municipios ?? []).filter((m) => normalize(m.nome).startsWith(term)).slice(0, 8) : [];

  function choose(name: string) {
    setCity(name);
    setQuery('');
    setOpen(false);
  }

  function useMyLocation() {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Seu navegador não permite usar a localização.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=pt`,
          );
          const data: { city?: string; locality?: string } = await res.json();
          const name = data.city || data.locality;
          if (name) choose(name);
          else setLocationError('Não encontramos sua cidade. Digite o nome dela.');
        } catch {
          setLocationError('Não foi possível usar a localização. Digite sua cidade.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setLocationError('Permissão negada. Digite sua cidade.');
      },
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  const triggerClass =
    variant === 'header'
      ? 'rounded-pill text-on-brand-dark hover:bg-white/10'
      : 'h-12 w-full rounded-lg border border-border bg-surface text-foreground hover:border-accent';

  return (
    <div ref={rootRef} className={`relative min-w-0 ${variant === 'hero' ? 'w-full' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={city ? `Cidade selecionada: ${city}. Alterar cidade` : 'Escolher cidade'}
        className={`flex min-h-11 min-w-0 max-w-full items-center gap-1.5 px-3 text-sm font-medium transition-colors duration-150 ${triggerClass}`}
      >
        <MapPin size={16} className="shrink-0" aria-hidden="true" />
        <span className={`truncate ${variant === 'header' ? 'max-w-28 lg:max-w-40' : 'flex-1 text-left'}`}>
          {city ?? 'Sua cidade'}
        </span>
        <ChevronDown size={14} className="shrink-0 opacity-70" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Escolher cidade"
          className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-card border border-border bg-surface p-3 text-foreground shadow-soft-lg"
        >
          <label htmlFor={`cidade-${variant}`} className="mb-1.5 block text-xs font-medium text-foreground-muted">
            Em qual cidade você está?
          </label>
          <input
            id={`cidade-${variant}`}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite o nome da cidade"
            className="min-h-11 w-full rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-accent"
          />

          <ul className="mt-2 max-h-56 overflow-y-auto">
            {suggestions.map((m) => (
              <li key={`${m.nome}-${m.uf}`}>
                <button
                  type="button"
                  onClick={() => choose(m.nome)}
                  className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm hover:bg-surface-muted"
                >
                  {m.nome} <span className="text-xs text-foreground-muted">{m.uf}</span>
                </button>
              </li>
            ))}
          </ul>
          {term && isLoading && <p className="px-3 py-2 text-sm text-foreground-muted">Carregando cidades...</p>}
          {term && isError && (
            <button
              type="button"
              onClick={() => choose(query.trim())}
              className="min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-surface-muted"
            >
              Usar &quot;{query.trim()}&quot;
            </button>
          )}
          {term && !isLoading && !isError && suggestions.length === 0 && (
            <p className="px-3 py-2 text-sm text-foreground-muted">Nenhuma cidade encontrada.</p>
          )}

          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium text-accent hover:bg-surface-muted disabled:opacity-60"
          >
            <LocateFixed size={16} aria-hidden="true" />
            {locating ? 'Buscando sua localização...' : 'Usar minha localização'}
          </button>
          {locationError && <p className="px-3 pb-1 text-xs text-danger">{locationError}</p>}

          {city && (
            <button
              type="button"
              onClick={() => {
                setCity(null);
                setOpen(false);
              }}
              className="min-h-11 w-full rounded-lg px-3 text-left text-sm text-foreground-muted hover:bg-surface-muted"
            >
              Ver todas as cidades
            </button>
          )}
        </div>
      )}
    </div>
  );
}
