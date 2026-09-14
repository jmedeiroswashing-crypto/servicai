'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Send, Sparkles, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { CATEGORIES } from '@/lib/categories';
import { CategorySelect } from '@/components/CategorySelect';
import { ESTADOS_BR } from '@/lib/estados-brasil';
import type { IntakeResult, RequestDraft } from '@/lib/types';

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

function formatBudget(min?: number, max?: number) {
  if (min == null && max == null) return undefined;
  if (min != null && max != null) return `R$ ${min} – R$ ${max}`;
  return `R$ ${min ?? max}`;
}

function DraftField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs text-foreground-muted">{label}</dt>
      <dd className={`mt-0.5 text-sm ${value ? 'text-ink' : 'text-foreground-muted/50'}`}>{value ?? 'ainda não informado'}</dd>
    </div>
  );
}

function nextStepHint(draft: RequestDraft) {
  if (!draft.category) return 'Diga qual serviço você precisa. Ex: "preciso de um pintor" ou "quero um encanador urgente".';
  if (!draft.description) return 'Conte com suas palavras o que precisa ser feito.';
  if (!draft.city) return 'Diga sua cidade. Ex: "Recife" ou "Recife, PE".';
  return 'Pode informar um orçamento e data (opcional), ou já publicar ao lado.';
}

function AiIntake() {
  const router = useRouter();
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content:
        'Oi! Me conta o que você precisa que eu te ajudo a publicar. Por exemplo: "preciso de um eletricista amanhã de manhã, tenho uns R$300".',
    },
  ]);
  const [draft, setDraft] = useState<RequestDraft>({});
  const [input, setInput] = useState('');

  const intakeMutation = useMutation({
    mutationFn: async (message: string) => (await api.post<IntakeResult>('/requests/ai-intake', { message, draft })).data,
    onSuccess: (result, message) => {
      setMessages((m) => [...m, { role: 'user', content: message }, { role: 'assistant', content: result.assistantReply }]);
      setDraft(result.draft);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => (await api.post('/requests', draft)).data,
    onSuccess: () => router.push('/minhas-solicitacoes'),
  });

  function sendMessage(message: string) {
    if (!message || intakeMutation.isPending) return;
    setInput('');
    intakeMutation.mutate(message);
  }

  const canPublish = !!(draft.category && draft.title && draft.description && draft.city);
  const showCategoryChips = !draft.category && !intakeMutation.isPending;

  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-[1fr_300px]">
      <div className="flex h-[60vh] flex-col border border-border">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-3.5 py-2 text-sm ${
                  m.role === 'user' ? 'bg-ink text-background' : 'border border-border text-ink'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {intakeMutation.isPending && (
            <div className="flex justify-start">
              <div className="border border-border px-3.5 py-2 text-sm text-foreground-muted">Digitando...</div>
            </div>
          )}
          {showCategoryChips && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {CATEGORIES.slice(0, 10).map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => sendMessage(`Preciso de um serviço de ${c.label.toLowerCase()}`)}
                  className="border border-border px-2.5 py-1 text-xs text-foreground-muted transition-colors hover:border-ink hover:text-ink"
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-border p-3">
          <p className="mb-2 text-xs text-foreground-muted">{nextStepHint(draft)}</p>
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendMessage(input.trim());
                }
              }}
              placeholder="Descreva o que você precisa..."
              className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-foreground-muted/50"
            />
            <button onClick={() => sendMessage(input.trim())} className="p-2 text-ink hover:text-accent" aria-label="Enviar">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="border border-border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Rascunho da solicitação</p>
        <dl className="mt-4 space-y-3">
          <DraftField label="Categoria" value={draft.category} />
          <DraftField label="Título" value={draft.title} />
          <DraftField label="Descrição" value={draft.description} />
          <DraftField label="Local" value={draft.city ? `${draft.city}${draft.state ? ` - ${draft.state}` : ''}` : undefined} />
          <DraftField label="Orçamento" value={formatBudget(draft.budgetMin, draft.budgetMax)} />
          <DraftField label="Data" value={draft.desiredDate ?? draft.desiredTime} />
        </dl>

        {publishMutation.isError && <p className="mt-3 text-xs text-danger">Não foi possível publicar. Tente novamente.</p>}

        <button
          onClick={() => publishMutation.mutate()}
          disabled={!canPublish || publishMutation.isPending}
          className="mt-5 w-full bg-ink py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {publishMutation.isPending ? 'Publicando...' : 'Publicar solicitação'}
        </button>
      </div>
    </div>
  );
}

function ManualForm() {
  const router = useRouter();

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
    <div className="mt-10 max-w-xl space-y-5">
      <div>
        <label className={labelClass}>Categoria do serviço</label>
        <CategorySelect categories={CATEGORIES} value={category} onChange={setCategory} emptyLabel="Selecione" />
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
          <input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} className={inputClass} placeholder="R$ 150" />
        </div>
        <div>
          <label className={labelClass}>Orçamento máximo (opcional)</label>
          <input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className={inputClass} placeholder="R$ 250" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Data desejada (opcional)</label>
          <input type="date" value={desiredDate} onChange={(e) => setDesiredDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Horário (opcional)</label>
          <input value={desiredTime} onChange={(e) => setDesiredTime(e.target.value)} className={inputClass} placeholder="Ex: Pela manhã" />
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
  );
}

export default function SolicitarPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [mode, setMode] = useState<'ia' | 'formulario'>('ia');

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'CLIENTE') router.push('/');
  }, [token, user, router]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl text-ink">Publicar uma solicitação</h1>
      <p className="mt-2 text-foreground-muted">
        Conte o que você precisa e os profissionais da sua região que oferecem esse serviço vão poder te enviar propostas.
      </p>

      <div className="mt-6 flex gap-6 border-b border-border text-sm">
        <button
          onClick={() => setMode('ia')}
          className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 transition-colors ${
            mode === 'ia' ? 'border-ink font-medium text-ink' : 'border-transparent text-foreground-muted'
          }`}
        >
          <Sparkles size={14} /> Conversar com a IA
        </button>
        <button
          onClick={() => setMode('formulario')}
          className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 transition-colors ${
            mode === 'formulario' ? 'border-ink font-medium text-ink' : 'border-transparent text-foreground-muted'
          }`}
        >
          <FileText size={14} /> Formulário manual
        </button>
      </div>

      {mode === 'ia' ? <AiIntake /> : <ManualForm />}
    </div>
  );
}
