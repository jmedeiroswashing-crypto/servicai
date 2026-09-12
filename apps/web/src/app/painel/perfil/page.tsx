'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { CATEGORIES } from '@/lib/categories';
import type { ProviderProfile } from '@/lib/types';

export default function PerfilPrestadorPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [specialty, setSpecialty] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [yearsExperience, setYearsExperience] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'PRESTADOR') router.push('/');
  }, [token, user, router]);

  const { data: provider } = useQuery({
    queryKey: ['providers', 'me'],
    enabled: !!token,
    queryFn: async () => (await api.get<ProviderProfile>('/providers/me')).data,
  });

  useEffect(() => {
    if (provider) {
      setSpecialty(provider.specialty === 'A definir' ? '' : provider.specialty);
      setCategories(provider.categories ?? []);
      setBio(provider.bio ?? '');
      setYearsExperience(provider.yearsExperience ?? 0);
    }
  }, [provider]);

  const mutation = useMutation({
    mutationFn: async () =>
      (await api.patch('/providers/me', { specialty, categories, bio, yearsExperience })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers', 'me'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  function toggleCategory(label: string) {
    setCategories((prev) => (prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]));
  }

  if (!provider) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-foreground-muted">Carregando perfil...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl text-ink">Editar perfil profissional</h1>
      <p className="mt-2 text-foreground-muted">
        Essas informações definem em quais oportunidades você aparece no mural de clientes procurando serviços.
      </p>

      <div className="mt-10 space-y-6">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground-muted">Especialidade principal</label>
          <input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="w-full border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-ink"
            placeholder="Ex: Eletricista residencial"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground-muted">
            Categorias de serviço que você atende
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
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

        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground-muted">Anos de experiência</label>
          <input
            type="number"
            min={0}
            value={yearsExperience}
            onChange={(e) => setYearsExperience(Number(e.target.value))}
            className="w-32 border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-ink"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground-muted">Sobre você / sua empresa</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="w-full border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-ink"
            placeholder="Conte um pouco sobre sua experiência e diferenciais"
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-ink px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {mutation.isPending ? 'Salvando...' : 'Salvar alterações'}
          </button>
          {saved && <span className="text-sm text-success">Salvo com sucesso.</span>}
        </div>
      </div>
    </div>
  );
}
