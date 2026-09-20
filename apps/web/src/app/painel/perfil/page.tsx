'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Send, Sparkles, FileText, Images, Trash2, Pencil, X, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { CATEGORIES } from '@/lib/categories';
import { ImageUploadField } from '@/components/ImageUploadField';
import type { MediaItem, ProviderDraft, ProviderIntakeResult, ProviderProfile } from '@/lib/types';

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

const MEDIA_TYPE_LABEL: Record<string, string> = {
  photo: 'Foto',
  video: 'Vídeo',
  before_after: 'Antes e depois',
};

function AddPortfolioItemForm({
  providerId,
  services,
  onAdded,
}: {
  providerId: string;
  services: ProviderProfile['services'];
  onAdded: () => void;
}) {
  const [type, setType] = useState<'photo' | 'video' | 'before_after'>('photo');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [serviceId, setServiceId] = useState('');

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/media', {
          type,
          url,
          title: title || undefined,
          caption: caption || undefined,
          serviceId: serviceId || undefined,
        })
      ).data,
    onSuccess: () => {
      setUrl('');
      setTitle('');
      setCaption('');
      setServiceId('');
      onAdded();
    },
  });

  const inputClass =
    'w-full border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-foreground-muted/50';

  return (
    <div className="border border-border p-5">
      <h3 className="flex items-center gap-1.5 font-medium text-ink">
        <Images size={15} className="text-accent" /> Adicionar ao portfólio
      </h3>
      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={inputClass}>
            <option value="photo">Foto</option>
            <option value="video">Vídeo</option>
            <option value="before_after">Antes e depois</option>
          </select>
          {!!services?.length && (
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputClass}>
              <option value="">Sem serviço associado</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          )}
        </div>
        {type === 'video' ? (
          <input value={url} onChange={(e) => setUrl(e.target.value)} className={inputClass} placeholder="URL do vídeo" />
        ) : (
          <ImageUploadField value={url} onChange={setUrl} label="Escolher imagem" previewClassName="h-16 w-16" />
        )}
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Título do trabalho (opcional)" />
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
          className={inputClass}
          placeholder="Descrição do trabalho (opcional)"
        />
        {mutation.isError && (
          <p className="text-xs text-danger">
            {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Não foi possível adicionar. Tente novamente.'}
          </p>
        )}
        <button
          onClick={() => mutation.mutate()}
          disabled={!url.trim() || mutation.isPending}
          className="w-full bg-ink py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {mutation.isPending ? 'Adicionando...' : 'Adicionar item'}
        </button>
      </div>
    </div>
  );
}

function PortfolioItemCard({ item, onChanged }: { item: MediaItem; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title ?? '');
  const [caption, setCaption] = useState(item.caption ?? '');

  const updateMutation = useMutation({
    mutationFn: async () => (await api.patch(`/media/${item.id}`, { title: title || undefined, caption: caption || undefined })).data,
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/media/${item.id}`),
    onSuccess: onChanged,
  });

  return (
    <div className="border border-border">
      <div className="aspect-video w-full overflow-hidden bg-surface-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.url}
          alt={item.title ?? item.caption ?? ''}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
      <div className="p-3">
        <span className="text-[0.65rem] font-medium uppercase tracking-wide text-foreground-muted">
          {MEDIA_TYPE_LABEL[item.type] ?? item.type}
        </span>
        {editing ? (
          <div className="mt-2 space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título"
              className="w-full border border-border bg-transparent px-2 py-1.5 text-sm outline-none focus:border-ink"
            />
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Descrição"
              rows={2}
              className="w-full border border-border bg-transparent px-2 py-1.5 text-sm outline-none focus:border-ink"
            />
            <div className="flex gap-2">
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="flex items-center gap-1 bg-ink px-2.5 py-1.5 text-xs font-medium text-background hover:opacity-85"
              >
                <Check size={12} /> Salvar
              </button>
              <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground-muted hover:text-ink">
                <X size={12} /> Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm font-medium text-ink">{item.title || 'Sem título'}</p>
            {item.caption && <p className="mt-0.5 text-xs text-foreground-muted">{item.caption}</p>}
            <div className="mt-2 flex gap-3">
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-foreground-muted hover:text-ink">
                <Pencil size={12} /> Editar
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1 text-xs text-foreground-muted hover:text-danger"
              >
                <Trash2 size={12} /> Remover
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PortfolioManager() {
  const queryClient = useQueryClient();
  const { data: provider } = useQuery({
    queryKey: ['providers', 'me', 'full'],
    queryFn: async () => (await api.get<ProviderProfile>('/providers/me/full')).data,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['providers', 'me', 'full'] });
  }

  if (!provider) {
    return <p className="mt-10 text-foreground-muted">Carregando portfólio...</p>;
  }

  return (
    <div className="mt-10 grid gap-8 sm:grid-cols-[1fr_1.3fr]">
      <AddPortfolioItemForm providerId={provider.id} services={provider.services} onAdded={refresh} />

      <div>
        <h3 className="mb-3 text-sm font-medium text-foreground-muted">Seu portfólio</h3>
        {(!provider.media || provider.media.length === 0) && (
          <p className="text-sm text-foreground-muted">
            Nenhum trabalho no portfólio ainda. Adicione fotos dos seus melhores serviços para atrair mais clientes.
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          {provider.media?.map((item) => (
            <PortfolioItemCard key={item.id} item={item} onChanged={refresh} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PerfilPrestadorPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'ia' | 'formulario' | 'portfolio'>('formulario');

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
        <button
          onClick={() => setMode('portfolio')}
          className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 transition-colors ${
            mode === 'portfolio' ? 'border-ink font-medium text-ink' : 'border-transparent text-foreground-muted'
          }`}
        >
          <Images size={14} /> Portfólio
        </button>
      </div>

      {mode === 'ia' && (
        <AiProfileIntake onSaved={() => queryClient.invalidateQueries({ queryKey: ['providers', 'me'] })} />
      )}
      {mode === 'formulario' && <ManualProfileForm provider={provider} />}
      {mode === 'portfolio' && <PortfolioManager />}
    </div>
  );
}
