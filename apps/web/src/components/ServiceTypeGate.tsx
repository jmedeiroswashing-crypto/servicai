'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { CATEGORIES } from '@/lib/categories';
import { ImageUploadField } from './ImageUploadField';
import type { ProviderProfile, UserProfile } from '@/lib/types';

const EXEMPT_PATHS = ['/login', '/cadastro', '/comecar'];

/**
 * Perfil obrigatório pra prestador em modo publicamente visível (COMPLETO
 * ou CONTRATACAO) que ainda não escolheu nenhuma categoria — sem isso o
 * perfil fica praticamente invisível/vazio na busca. Pergunta foto, nome,
 * bio de apresentação e o serviço que a pessoa faz, tudo de uma vez, antes
 * de liberar o painel. Some sozinho assim que `categories` deixa de estar
 * vazio.
 */
export function ServiceTypeGate() {
  const pathname = usePathname();
  const { token, user, setAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
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

  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    enabled: !!token && isPubliclyVisible,
    queryFn: async () => (await api.get<UserProfile>('/users/me')).data,
  });

  useEffect(() => {
    if (provider) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSpecialty(provider.specialty === 'A definir' ? '' : provider.specialty);
      setBio(provider.bio ?? '');
    }
  }, [provider]);

  useEffect(() => {
    if (me) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(me.name);
      setAvatarUrl(me.avatarUrl ?? '');
    }
  }, [me]);

  const mutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        api.patch('/providers/me', { specialty, categories, bio }),
        api.patch('/users/me', { name, avatarUrl: avatarUrl || undefined }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      if (token && user) setAuth(token, { ...user, name });
    },
  });

  const shouldShow =
    isPubliclyVisible &&
    !!provider &&
    provider.categories.length === 0 &&
    !EXEMPT_PATHS.includes(pathname) &&
    !pathname.startsWith('/conserto');

  if (!shouldShow) return null;

  function toggleCategory(label: string) {
    setCategories((prev) => {
      const active = prev.includes(label);
      // Ao marcar uma categoria, já preenche a especialidade com o mesmo
      // nome — só quando o campo ainda está vazio, pra não sobrescrever o
      // que a pessoa já escreveu.
      if (!active) {
        setSpecialty((current) => (current.trim() ? current : label));
      }
      return active ? prev.filter((c) => c !== label) : [...prev, label];
    });
  }

  const canSave = name.trim().length > 0 && specialty.trim().length > 0 && categories.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md border border-border bg-surface p-6 sm:p-8">
        <h2 className="font-display text-xl text-ink">Vamos montar seu perfil</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Isso já deixa seu perfil pronto pra aparecer pra clientes buscando esse tipo de serviço.
        </p>

        <div className="mt-6">
          <label className="mb-1.5 block text-xs font-medium text-foreground-muted">Foto de perfil</label>
          <ImageUploadField value={avatarUrl} onChange={setAvatarUrl} label="Escolher foto" />
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-foreground-muted">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome ou o da sua empresa"
            className="w-full border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-ink"
          />
        </div>

        <div className="mt-4">
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

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-foreground-muted">Bio de apresentação</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Conte rapidamente sobre sua experiência pros clientes te conhecerem melhor"
            className="w-full resize-none border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-ink"
          />
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
