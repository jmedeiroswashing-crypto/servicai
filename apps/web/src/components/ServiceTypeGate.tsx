'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { CATEGORIES } from '@/lib/categories';
import type { ProviderProfile } from '@/lib/types';

const EXEMPT_PATHS = ['/login', '/cadastro', '/comecar'];

/**
 * Pergunta obrigatória pra prestador em modo publicamente visível (COMPLETO
 * ou CONTRATACAO) que ainda não escolheu nenhuma categoria — sem isso o
 * perfil fica praticamente invisível na busca filtrada por categoria.
 * Some sozinho assim que `categories` deixa de estar vazio.
 */
export function ServiceTypeGate() {
  const pathname = usePathname();
  const { token, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [specialty, setSpecialty] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryQuery, setCategoryQuery] = useState('');

  const isPubliclyVisible =
    user?.role === 'PRESTADOR' && (user.businessMode === 'COMPLETO' || user.businessMode === 'CONTRATACAO');

  const { data: provider } = useQuery({
    queryKey: ['providers', 'me'],
    enabled: !!token && isPubliclyVisible,
    queryFn: async () => (await api.get<ProviderProfile>('/providers/me')).data,
  });

  const mutation = useMutation({
    mutationFn: async () => (await api.patch('/providers/me', { specialty, categories })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers', 'me'] }),
  });

  const shouldShow =
    isPubliclyVisible && !!provider && provider.categories.length === 0 && !EXEMPT_PATHS.includes(pathname);

  if (!shouldShow) return null;

  function toggleCategory(label: string) {
    setCategories((prev) => (prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]));
  }

  const canSave = specialty.trim().length > 0 && categories.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md border border-border bg-surface p-6 sm:p-8">
        <h2 className="font-display text-xl text-ink">Qual serviço você faz?</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Isso já deixa seu perfil pronto pra aparecer pra clientes buscando esse tipo de serviço.
        </p>

        <div className="mt-6">
          <label className="mb-1.5 block text-xs font-medium text-foreground-muted">Especialidade</label>
          <input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="Ex: Eletricista residencial"
            className="w-full border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-ink"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-foreground-muted">Categorias</label>
          <input
            value={categoryQuery}
            onChange={(e) => setCategoryQuery(e.target.value)}
            placeholder="Buscar categoria..."
            className="mb-2 w-full border border-border bg-transparent px-3.5 py-2 text-sm outline-none focus:border-ink"
          />
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {CATEGORIES.filter((c) => c.label.toLowerCase().includes(categoryQuery.trim().toLowerCase())).map((c) => {
              const active = categories.includes(c.label);
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => toggleCategory(c.label)}
                  className={`border px-3 py-1.5 text-sm transition-colors ${
                    active ? 'border-ink bg-ink text-background' : 'border-border text-foreground-muted hover:border-ink'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {mutation.isError && <p className="mt-3 text-xs text-danger">Não foi possível salvar. Tente novamente.</p>}

        <button
          onClick={() => mutation.mutate()}
          disabled={!canSave || mutation.isPending}
          className="mt-6 w-full bg-ink py-3 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {mutation.isPending ? 'Salvando...' : 'Concluir e entrar'}
        </button>
      </div>
    </div>
  );
}
