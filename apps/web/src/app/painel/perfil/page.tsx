'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Send, Sparkles, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { CATEGORIES } from '@/lib/categories';
import type { ProviderDraft, ProviderIntakeResult, ProviderProfile } from '@/lib/types';

function DraftField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs text-foreground-muted">{label}</dt>
      <dd className={`mt-0.5 text-sm ${value ? 'text-ink' : 'text-foreground-muted/50'}`}>{value ?? 'ainda não informado'}</dd>
    </div>
  );
}

function nextStepHint(draft: ProviderDraft) {
  if (!draft.specialty) return 'Diga sua especialidade. Ex: "sou eletricista residencial".';
  if (!draft.categories?.length) return 'Diga quais categorias você atende. Ex: "eletricista e encanador".';
  if (!draft.city) return 'Diga a cidade onde atende. Ex: "Recife" ou "Recife, PE".';
  if (draft.bio === undefined) return 'Pode escrever uma descrição curta, ou dizer "pular".';
  return 'Revise ao lado e salve seu perfil.';
}

function AiProfileIntake({ onSaved }: { onSaved: () => void }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content:
        'Oi! Vamos montar seu perfil profissional. Me conta sua especialidade — por exemplo: "sou eletricista residencial, atendo em Recife".',
    },
  ]);
  const [draft, setDraft] = useState<ProviderDraft>({});
  const [input, setInput] = useState('');
  const [saved, setSaved] = useState(false);

  const intakeMutation = useMutation({
    mutationFn: async (message: string) =>
      (await api.post<ProviderIntakeResult>('/providers/ai-intake', { message, draft })).data,
    onSuccess: (result, message) => {
      setMessages((m) => [...m, { role: 'user', content: message }, { role: 'assistant', content: result.assistantReply }]);
      setDraft(result.draft);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () =>
      (
        await api.patch('/providers/me', {
          specialty: draft.specialty,
          categories: draft.categories,
          city: draft.city,
          bio: draft.bio || undefined,
        })
      ).data,
    onSuccess: () => {
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2500);
    },
  });

  function sendMessage(message: string) {
    if (!message || intakeMutation.isPending) return;
    setInput('');
    intakeMutation.mutate(message);
  }

  const readyToSave = !!(draft.specialty && draft.categories?.length && draft.city);
  const showCategoryChips = !!draft.specialty && !draft.categories?.length && !intakeMutation.isPending;

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
                  onClick={() => sendMessage(c.label)}
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
              placeholder="Escreva sua resposta..."
              className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-foreground-muted/50"
            />
            <button onClick={() => sendMessage(input.trim())} className="p-2 text-ink hover:text-accent" aria-label="Enviar">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="border border-border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Rascunho do perfil</p>
        <dl className="mt-4 space-y-3">
          <DraftField label="Especialidade" value={draft.specialty} />
          <DraftField label="Categorias" value={draft.categories?.join(', ')} />
          <DraftField label="Cidade" value={draft.city} />
          <DraftField label="Sobre você" value={draft.bio || undefined} />
        </dl>

        {saveMutation.isError && <p className="mt-3 text-xs text-danger">Não foi possível salvar. Tente novamente.</p>}

        <button
          onClick={() => saveMutation.mutate()}
          disabled={!readyToSave || saveMutation.isPending}
          className="mt-5 w-full bg-ink py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {saveMutation.isPending ? 'Salvando...' : 'Salvar perfil'}
        </button>
        {saved && <p className="mt-2 text-center text-xs text-success">Salvo com sucesso.</p>}
      </div>
    </div>
  );
}

function ManualProfileForm({ provider }: { provider: ProviderProfile }) {
  const queryClient = useQueryClient();

  const [specialty, setSpecialty] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [yearsExperience, setYearsExperience] = useState(0);
  const [saved, setSaved] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');

  useEffect(() => {
    setSpecialty(provider.specialty === 'A definir' ? '' : provider.specialty);
    setCategories(provider.categories ?? []);
    setBio(provider.bio ?? '');
    setYearsExperience(provider.yearsExperience ?? 0);
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

  return (
    <div className="mt-10 max-w-3xl space-y-6">
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
        <div className="mb-3 flex items-center gap-2 border border-border px-3 py-2">
          <Search size={14} className="shrink-0 text-foreground-muted" />
          <input
            value={categoryQuery}
            onChange={(e) => setCategoryQuery(e.target.value)}
            placeholder="Buscar categoria..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-foreground-muted/50"
          />
        </div>
        <div className="flex flex-wrap gap-2">
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
  );
}

export default function PerfilPrestadorPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'ia' | 'formulario'>('formulario');

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'PRESTADOR') router.push('/');
  }, [token, user, router]);

  const { data: provider } = useQuery({
    queryKey: ['providers', 'me'],
    enabled: !!token,
    queryFn: async () => (await api.get<ProviderProfile>('/providers/me')).data,
  });

  if (!provider) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-foreground-muted">Carregando perfil...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl text-ink">Editar perfil profissional</h1>
      <p className="mt-2 text-foreground-muted">
        Essas informações definem em quais oportunidades você aparece no mural de clientes procurando serviços.
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

      {mode === 'ia' ? (
        <AiProfileIntake onSaved={() => queryClient.invalidateQueries({ queryKey: ['providers', 'me'] })} />
      ) : (
        <ManualProfileForm provider={provider} />
      )}
    </div>
  );
}
