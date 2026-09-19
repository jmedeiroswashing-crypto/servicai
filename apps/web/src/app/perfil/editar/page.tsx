'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { ESTADOS_BR } from '@/lib/estados-brasil';
import type { UserProfile } from '@/lib/types';

interface IbgeMunicipio {
  id: number;
  nome: string;
}

function useCidadesPorEstado(uf: string) {
  return useQuery({
    queryKey: ['ibge', 'municipios', uf],
    enabled: !!uf,
    staleTime: 1000 * 60 * 60 * 24,
    queryFn: async () => {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
      const data: IbgeMunicipio[] = await res.json();
      return data.map((m) => m.nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
  });
}

const inputClass =
  'w-full border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-foreground-muted/50';
const labelClass = 'mb-1.5 block text-xs font-medium text-foreground-muted';

export default function EditarPerfilPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  const { data: user } = useQuery({
    queryKey: ['users', 'me'],
    enabled: !!token,
    queryFn: async () => (await api.get<UserProfile>('/users/me')).data,
  });

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressState, setAddressState] = useState('');
  const [city, setCity] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: cidades, isFetching: loadingCidades } = useCidadesPorEstado(addressState);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone ?? '');
      setAddressState(user.addressState ?? '');
      setCity(user.city ?? '');
      setAvatarUrl(user.avatarUrl ?? '');
      setBio(user.bio ?? '');
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.patch<UserProfile>('/users/me', {
          name,
          phone: phone || undefined,
          addressState: addressState || undefined,
          city: city || undefined,
          avatarUrl: avatarUrl || undefined,
          bio: bio || undefined,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      setSaved(true);
      setTimeout(() => router.push('/perfil'), 900);
    },
  });

  if (!user) {
    return <div className="mx-auto max-w-2xl px-4 py-20 text-foreground-muted">Carregando...</div>;
  }

  const canSave = name.trim().length >= 2;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/perfil" className="mb-6 flex w-fit items-center gap-1.5 text-sm text-foreground-muted hover:text-ink">
        <ArrowLeft size={14} /> Voltar ao perfil
      </Link>

      <h1 className="font-display text-3xl text-ink">Editar perfil</h1>
      <p className="mt-2 text-foreground-muted">Esses dados aparecem no seu perfil e ajudam outras pessoas a te reconhecer.</p>

      <div className="mt-10 space-y-5">
        <div>
          <label className={labelClass}>Nome completo</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Seu nome" />
        </div>

        <div>
          <label className={labelClass}>Foto de perfil (URL)</label>
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className={inputClass}
            placeholder="https://..."
          />
          {avatarUrl && (
            <div className="mt-2 h-16 w-16 overflow-hidden border border-border bg-surface-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt="Pré-visualização"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Telefone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="(00) 00000-0000" />
        </div>

        <div>
          <label className={labelClass}>E-mail</label>
          <input value={user.email} disabled className={`${inputClass} opacity-60`} />
          <p className="mt-1 text-xs text-foreground-muted/70">O e-mail não pode ser alterado por aqui.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Estado</label>
            <select
              value={addressState}
              onChange={(e) => {
                setAddressState(e.target.value);
                setCity('');
              }}
              className={inputClass}
            >
              <option value="">UF</option>
              {ESTADOS_BR.map((e) => (
                <option key={e.uf} value={e.uf}>
                  {e.nome} ({e.uf})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Cidade</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!addressState || loadingCidades}
              className={`${inputClass} disabled:opacity-50`}
            >
              <option value="">{!addressState ? 'Escolha o estado' : loadingCidades ? 'Carregando...' : 'Selecione'}</option>
              {city && !cidades?.includes(city) && <option value={city}>{city}</option>}
              {cidades?.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Sobre você</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={500}
            className={inputClass}
            placeholder="Conte um pouco sobre você"
          />
          <p className="mt-1 text-right text-xs text-foreground-muted/60">{bio.length}/500</p>
        </div>

        {mutation.isError && (
          <p className="text-sm text-danger">
            {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Não foi possível salvar. Tente novamente.'}
          </p>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={() => mutation.mutate()}
            disabled={!canSave || mutation.isPending}
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
