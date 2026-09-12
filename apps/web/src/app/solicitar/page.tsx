'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { CATEGORIES } from '@/lib/categories';
import { ESTADOS_BR } from '@/lib/estados-brasil';

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

export default function SolicitarPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'CLIENTE') router.push('/');
  }, [token, user, router]);

  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [desiredTime, setDesiredTime] = useState('');

  const { data: cidades, isFetching: loadingCidades } = useCidadesPorEstado(state);

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/requests', {
          category,
          title,
          description,
          city,
          state,
          budgetMin: budgetMin ? Number(budgetMin) : undefined,
          budgetMax: budgetMax ? Number(budgetMax) : undefined,
          desiredDate: desiredDate || undefined,
          desiredTime: desiredTime || undefined,
        })
      ).data,
    onSuccess: () => router.push('/minhas-solicitacoes'),
  });

  const canSubmit = category && title.length >= 3 && description.length >= 10 && city;

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl text-ink">Publicar uma solicitação</h1>
      <p className="mt-2 text-foreground-muted">
        Conte o que você precisa e os profissionais da sua região que oferecem esse serviço vão poder te enviar propostas.
      </p>

      <div className="mt-10 space-y-5">
        <div>
          <label className={labelClass}>Categoria do serviço</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            <option value="" disabled>
              Selecione
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.label}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Título da solicitação</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="Ex: Instalação elétrica residencial"
          />
        </div>

        <div>
          <label className={labelClass}>Descreva o que você precisa</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={inputClass}
            placeholder="Ex: Preciso instalar 3 tomadas e verificar alguns pontos elétricos da minha residência."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Estado</label>
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setCity('');
              }}
              className={inputClass}
            >
              <option value="" disabled>
                UF
              </option>
              {ESTADOS_BR.map((e) => (
                <option key={e.uf} value={e.uf}>
                  {e.nome} ({e.uf})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Cidade (região aproximada)</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={!state || loadingCidades}
              className={`${inputClass} disabled:opacity-50`}
            >
              <option value="" disabled>
                {!state ? 'Escolha o estado' : loadingCidades ? 'Carregando...' : 'Selecione'}
              </option>
              {cidades?.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Orçamento mínimo (opcional)</label>
            <input
              type="number"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              className={inputClass}
              placeholder="R$ 150"
            />
          </div>
          <div>
            <label className={labelClass}>Orçamento máximo (opcional)</label>
            <input
              type="number"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              className={inputClass}
              placeholder="R$ 250"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Data desejada (opcional)</label>
            <input type="date" value={desiredDate} onChange={(e) => setDesiredDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Horário (opcional)</label>
            <input
              value={desiredTime}
              onChange={(e) => setDesiredTime(e.target.value)}
              className={inputClass}
              placeholder="Ex: Pela manhã"
            />
          </div>
        </div>

        {mutation.isError && <p className="text-sm text-danger">Não foi possível publicar. Tente novamente.</p>}

        <button
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          className="w-full bg-ink py-3 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {mutation.isPending ? 'Publicando...' : 'Publicar solicitação'}
        </button>
      </div>
    </div>
  );
}
