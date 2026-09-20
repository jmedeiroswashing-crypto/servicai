'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { CategorySelect } from '@/components/CategorySelect';
import { PRODUCT_CATEGORIES } from '@/lib/product-categories';
import { ESTADOS_BR } from '@/lib/estados-brasil';
import type { Product } from '@/lib/types';

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

export default function AnunciarProdutoPage() {
  const { token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState<'NOVO' | 'USADO'>('USADO');
  const [addressState, setAddressState] = useState('');
  const [city, setCity] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const { data: cidades, isFetching: loadingCidades } = useCidadesPorEstado(addressState);

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post<Product>('/products', {
          title,
          description,
          price: Number(price),
          category,
          condition,
          city,
          state: addressState || undefined,
          photoUrls,
        })
      ).data,
    onSuccess: (product) => router.push(`/marketplace/produto?id=${product.id}`),
  });

  function addPhoto() {
    if (!photoUrl.trim()) return;
    setPhotoUrls((prev) => [...prev, photoUrl.trim()]);
    setPhotoUrl('');
  }

  const canSubmit = title.length >= 3 && description.length >= 10 && Number(price) > 0 && category && city;

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl text-ink">Anunciar produto</h1>
      <p className="mt-2 text-foreground-muted">
        Seu anúncio aparece pra qualquer pessoa no marketplace. Negocie preço e pagamento direto pelo chat.
      </p>

      <div className="mt-10 space-y-5">
        <div>
          <label className={labelClass}>Título do anúncio</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Ex: Bicicleta aro 29, seminova" />
        </div>

        <div>
          <label className={labelClass}>Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={inputClass}
            placeholder="Conte detalhes do produto: estado de conservação, motivo da venda, etc."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Preço (R$)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} placeholder="150" />
          </div>
          <div>
            <label className={labelClass}>Condição</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value as 'NOVO' | 'USADO')} className={inputClass}>
              <option value="USADO">Usado</option>
              <option value="NOVO">Novo</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Categoria</label>
          <CategorySelect categories={PRODUCT_CATEGORIES} value={category} onChange={setCategory} emptyLabel="Selecione" />
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
              {cidades?.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Fotos (URL)</label>
          <div className="flex gap-2">
            <input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addPhoto();
                }
              }}
              className={inputClass}
              placeholder="https://..."
            />
            <button type="button" onClick={addPhoto} className="shrink-0 border border-ink px-4 text-sm font-medium text-ink hover:bg-ink hover:text-background">
              Adicionar
            </button>
          </div>
          {photoUrls.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {photoUrls.map((url, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden bg-surface-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <button
                    type="button"
                    onClick={() => setPhotoUrls((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute inset-0 flex items-center justify-center bg-ink/70 text-xs font-medium text-background opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {mutation.isError && (
          <p className="text-sm text-danger">
            {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Não foi possível publicar. Tente novamente.'}
          </p>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          className="w-full bg-ink py-3 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {mutation.isPending ? 'Publicando...' : 'Publicar anúncio'}
        </button>
      </div>
    </div>
  );
}
