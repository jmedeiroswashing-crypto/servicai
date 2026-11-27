'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bookmark, Crown, Download, ExternalLink, MessageCircle, Phone, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore, hasSession } from '@/store/auth-store';
import { loginUrl } from '@/lib/redirect';
import { linkWhats } from '@/lib/painel/numeros';
import { baixarCsv } from '@/lib/painel/exportar';
import { Vazio } from '@/components/painel/pecas';
import type { LeadResult, LeadSearchResponse, SavedLead } from '@/lib/types';

const RECENTES_KEY = 'servicai:leads-recentes';
type Filtro = 'todos' | 'whatsapp' | 'telefone' | 'site';

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'whatsapp', rotulo: 'Com WhatsApp' },
  { valor: 'telefone', rotulo: 'Com telefone' },
  { valor: 'site', rotulo: 'Com site' },
];

function lerRecentes(): { query: string; location: string }[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTES_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function salvarRecente(query: string, location: string) {
  try {
    const atual = lerRecentes().filter((r) => !(r.query === query && r.location === location));
    localStorage.setItem(RECENTES_KEY, JSON.stringify([{ query, location }, ...atual].slice(0, 5)));
  } catch {
    // Sem localStorage, só não guarda o histórico — a busca em si funciona igual.
  }
}

function leadKey(l: { name: string; phone?: string | null }) {
  return `${l.name}|${l.phone ?? ''}`;
}

export default function ProspeccaoPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!hasSession()) router.push(loginUrl());
    else if (user && user.role !== 'PRESTADOR') router.push('/');
  }, [token, user, router]);

  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [limit, setLimit] = useState(20);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [resultado, setResultado] = useState<LeadSearchResponse | null>(null);
  const [recentes, setRecentes] = useState<{ query: string; location: string }[]>([]);

  useEffect(() => {
    // Histórico de buscas vive só no aparelho — não precisa ir ao servidor
    // pra isso, e lê depois da montagem pra não divergir do HTML do servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentes(lerRecentes());
  }, []);

  const { data: salvos } = useQuery({
    queryKey: ['leads', 'saved'],
    enabled: !!token,
    queryFn: async () => (await api.get<SavedLead[]>('/leads/saved')).data,
  });

  const buscar = useMutation({
    mutationFn: async (vars: { query: string; location: string; limit: number }) =>
      (await api.get<LeadSearchResponse>('/leads/search', { params: vars })).data,
    onSuccess: (data, vars) => {
      setResultado(data);
      setFiltro('todos');
      salvarRecente(vars.query, vars.location);
      setRecentes(lerRecentes());
    },
  });

  const errStatus = (buscar.error as { response?: { status?: number } } | null)?.response?.status;
  const errMessage = (buscar.error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message;
  const locked = errStatus === 403;
  const indisponivel = errStatus === 503;

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || !location.trim()) return;
    buscar.mutate({ query: query.trim(), location: location.trim(), limit });
  }

  const salvarMutation = useMutation({
    mutationFn: async (lead: LeadResult) =>
      (
        await api.post<SavedLead>('/leads/saved', {
          name: lead.name,
          phone: lead.phone,
          address: lead.address,
          website: lead.website,
          rating: lead.rating,
          ratingCount: lead.ratingCount,
          mapsUrl: lead.mapsUrl,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', 'saved'] });
      toast.success('Lead salvo em "Meus leads".');
    },
  });

  const apagarMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/leads/saved/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads', 'saved'] }),
  });

  const jaSalvos = useMemo(() => new Set((salvos ?? []).map(leadKey)), [salvos]);

  const resultadosFiltrados = useMemo(() => {
    const lista = resultado?.results ?? [];
    switch (filtro) {
      case 'whatsapp':
        return lista.filter((l) => l.likelyWhatsapp);
      case 'telefone':
        return lista.filter((l) => !!l.phone);
      case 'site':
        return lista.filter((l) => !!l.website);
      default:
        return lista;
    }
  }, [resultado, filtro]);

  return (
    <div className={`mx-auto max-w-2xl px-4 sm:px-6 ${embedded ? 'py-6' : 'py-12 sm:py-16'}`}>
      {!embedded && (
        <>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-accent">
            <Crown size={13} /> Recurso Premium
          </p>
          <h1 className="font-display text-3xl text-ink">Encontrar novos clientes</h1>
          <p className="mt-2 text-foreground-muted">
            Busque empresas reais perto de você (dados públicos do OpenStreetMap) e monte sua própria lista de prospecção.
          </p>
        </>
      )}

      <form onSubmit={handleBuscar} className="e-painel mt-8">
        <div className="grid gap-3 sm:grid-cols-[1.4fr_1.4fr_1fr]">
          <label className="e-campo">
            O que você procura?
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex: clínicas odontológicas" />
          </label>
          <label className="e-campo">
            Em qual cidade ou região?
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: São Paulo, SP" />
          </label>
          <label className="e-campo">
            Quantidade
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value={10}>10 leads</option>
              <option value={20}>20 leads</option>
            </select>
          </label>
        </div>
        <button type="submit" className="e-bt e-bt--p e-bt--forte mt-3" disabled={buscar.isPending}>
          <Search size={16} aria-hidden="true" /> {buscar.isPending ? 'Buscando...' : 'Encontrar leads'}
        </button>

        {resultado && (
          <p className="e-nota mt-3">
            Você usou {resultado.usage.usedSoFar} de {resultado.usage.limit} buscas deste mês. O &quot;Com
            WhatsApp&quot; é só uma estimativa pelo formato do número — nenhuma fonte confirma isso de verdade.
          </p>
        )}

        {recentes.length > 0 && !resultado && (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-foreground-muted">Pesquisas recentes</p>
            <div className="e-fichas">
              {recentes.map((r) => (
                <button
                  key={`${r.query}|${r.location}`}
                  type="button"
                  className="e-ficha"
                  onClick={() => {
                    setQuery(r.query);
                    setLocation(r.location);
                    buscar.mutate({ query: r.query, location: r.location, limit });
                  }}
                >
                  {r.query} · {r.location}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {locked && (
        <div className="e-painel mt-6 text-center">
          <Crown size={28} className="mx-auto text-accent" />
          <p className="mt-3 font-medium text-ink">Exclusivo do plano Premium</p>
          <p className="mt-1 text-sm text-foreground-muted">
            {errMessage ?? 'Assine o Premium para buscar empresas reais pra prospectar.'}
          </p>
          <Link
            href="/precos"
            className="mt-5 inline-block bg-ink px-6 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85"
          >
            Ver planos
          </Link>
        </div>
      )}

      {indisponivel && (
        <p className="e-nota mt-6">{errMessage ?? 'Não foi possível buscar agora. Tente novamente em instantes.'}</p>
      )}

      {resultado && (
        <section className="e-painel mt-6">
          <div className="e-painel-t">
            <h2>Leads encontrados {resultadosFiltrados.length}</h2>
          </div>
          <div className="e-fichas mb-4">
            {FILTROS.map((f) => (
              <button
                key={f.valor}
                type="button"
                className="e-ficha"
                aria-pressed={filtro === f.valor}
                onClick={() => setFiltro(f.valor)}
              >
                {f.rotulo}
              </button>
            ))}
          </div>

          {resultadosFiltrados.length === 0 ? (
            <Vazio icone={Search} titulo="Nenhum resultado com esse filtro" texto="Tente outro filtro ou uma nova busca." />
          ) : (
            <div className="e-linhas">
              {resultadosFiltrados.map((lead) => {
                const jaSalvo = jaSalvos.has(leadKey(lead));
                return (
                  <div key={leadKey(lead) + (lead.address ?? '')} className="e-linha">
                    <div>
                      <b>{lead.name}</b>
                      <small>{lead.address}</small>
                    </div>
                    <div className="e-linha-fim">
                      {lead.phone && lead.likelyWhatsapp && (
                        <a
                          className="e-bt e-bt--p"
                          href={linkWhats(lead.phone, 'Olá! Vi o contato da sua empresa e gostaria de oferecer meus serviços.')}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`WhatsApp de ${lead.name}`}
                        >
                          <MessageCircle size={14} aria-hidden="true" />
                        </a>
                      )}
                      {lead.phone && (
                        <a className="e-bt e-bt--p" href={`tel:${lead.phone}`} aria-label={`Ligar para ${lead.name}`}>
                          <Phone size={14} aria-hidden="true" />
                        </a>
                      )}
                      {lead.website && (
                        <a
                          className="e-bt e-bt--p"
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Site de ${lead.name}`}
                        >
                          <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      )}
                      <button
                        type="button"
                        className="e-bt e-bt--p"
                        disabled={jaSalvo || salvarMutation.isPending}
                        onClick={() => salvarMutation.mutate(lead)}
                        aria-label={jaSalvo ? `${lead.name} já salvo` : `Salvar ${lead.name}`}
                      >
                        <Bookmark size={14} aria-hidden="true" fill={jaSalvo ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section className="e-painel mt-6">
        <div className="e-painel-t">
          <h2>Meus leads {salvos?.length ?? 0}</h2>
          <button
            type="button"
            className="e-bt"
            disabled={!salvos?.length}
            onClick={() =>
              baixarCsv('meus-leads', salvos ?? [], [
                { titulo: 'Nome', valor: (l) => l.name },
                { titulo: 'Telefone', valor: (l) => l.phone ?? '' },
                { titulo: 'Endereço', valor: (l) => l.address ?? '' },
                { titulo: 'Site', valor: (l) => l.website ?? '' },
              ])
            }
          >
            <Download size={14} aria-hidden="true" /> Exportar CSV
          </button>
        </div>
        {!salvos?.length ? (
          <Vazio icone={Bookmark} titulo="Nenhum lead salvo ainda" texto="Os leads que você salvar na busca aparecem aqui." />
        ) : (
          <div className="e-linhas">
            {salvos.map((s) => (
              <div key={s.id} className="e-linha">
                <div>
                  <b>{s.name}</b>
                  <small>
                    {s.phone}
                    {s.phone && s.address ? ' · ' : ''}
                    {s.address}
                  </small>
                </div>
                <div className="e-linha-fim">
                  {s.phone && (
                    <a
                      className="e-bt e-bt--p"
                      href={linkWhats(s.phone, 'Olá! Vi o contato da sua empresa e gostaria de oferecer meus serviços.')}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`WhatsApp de ${s.name}`}
                    >
                      <MessageCircle size={14} aria-hidden="true" />
                    </a>
                  )}
                  <button
                    type="button"
                    className="e-bt e-bt--p e-bt--perigo"
                    onClick={() => apagarMutation.mutate(s.id)}
                    aria-label={`Remover ${s.name}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
