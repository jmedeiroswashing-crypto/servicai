'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, CalendarClock, CircleAlert, Clock, Heart, MessageCircle, Radio, Star, UserX } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { GraficoBarras, Esqueleto, ErroAoCarregar, Kpi, Mini } from '@/components/painel/pecas';
import { useBookings, useClientes, useExpenses, useGoals, useIncomes, useIntervalo, useProvider } from '@/components/painel/dados';
import { alertasDoDia, aReceber, brl, linkWhats, mensagensDoDia, pct, resumo, serie, type Alerta, type Mensagem } from '@/lib/painel/numeros';
import { temCaptacao, temFinanceiro } from '@/lib/painel/modulos';
import { dataCurta, hoje, nomeMes, somaDias } from '@/lib/painel/periodo';
import { UNLIMITED, type CashRegister, type ProviderProfile, type Subscription } from '@/lib/types';

const ICONE_ALERTA: Record<Alerta['id'] | string, typeof Clock> = {
  atrasados: AlertTriangle,
  novos: CircleAlert,
  hoje: CalendarClock,
};
const ICONE_MSG: Record<Mensagem['tipo'], typeof Clock> = { lembrete: CalendarClock, obrigado: Heart, sumido: UserX };
const NOME_MSG: Record<Mensagem['tipo'], string> = { lembrete: 'Lembrete', obrigado: 'Agradecer', sumido: 'Cliente sumido' };

function Disponibilidade({ provider }: { provider: ProviderProfile }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (available: boolean) => (await api.patch('/providers/me/availability', { available })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers', 'me'] }),
  });
  const ligado = !!provider.availableNow;
  return (
    <section className="e-painel e-linha" aria-label="Disponibilidade">
      <div>
        <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Radio size={15} aria-hidden="true" style={{ color: ligado ? 'var(--ent)' : 'var(--mut)' }} />
          {ligado ? 'Você está disponível agora' : 'Disponível agora'}
        </b>
        <small>{ligado ? 'Clientes com urgência veem você em destaque. Desliga sozinho em 4 horas.' : 'Avise que pode atender um serviço hoje.'}</small>
      </div>
      <button type="button" className={`e-bt e-bt--p${ligado ? '' : ' e-bt--forte'}`} disabled={mutation.isPending} onClick={() => mutation.mutate(!ligado)}>
        {ligado ? 'Desativar' : 'Ativar'}
      </button>
    </section>
  );
}

function Alertas({ alertas }: { alertas: Alerta[] }) {
  const [todos, setTodos] = useState(false);
  const vistos = todos ? alertas : alertas.slice(0, 3);
  return (
    <section className="e-painel" aria-labelledby="alertas-t">
      <div className="e-painel-t">
        <h2 id="alertas-t">Alertas do dia</h2>
        <span>{alertas.length ? `${alertas.length} ${alertas.length === 1 ? 'pede' : 'pedem'} atenção` : 'tudo em dia'}</span>
      </div>
      {alertas.length ? (
        <div className="e-alertas">
          {vistos.map((a) => {
            const Icone = ICONE_ALERTA[a.id] ?? Clock;
            return (
              <Link key={a.id} className={`e-alerta ${a.tipo}`} href={a.href}>
                <span className="e-alerta-ic">
                  <Icone size={18} aria-hidden="true" />
                </span>
                <span>
                  <b>{a.titulo}</b>
                  <small>{a.texto}</small>
                </span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            );
          })}
          {alertas.length > 3 && (
            <button type="button" className="e-bt e-bt--p" onClick={() => setTodos(!todos)}>
              {todos ? 'Mostrar só os 3 principais' : `Ver os outros ${alertas.length - 3}`}
            </button>
          )}
        </div>
      ) : (
        <p className="e-mut">Nenhum serviço atrasado e nenhum pedido esperando resposta.</p>
      )}
    </section>
  );
}

const CHAVE_ENVIADAS = 'servicai:painel-msgs';

/** Enviadas ficam guardadas por dia neste aparelho, para a fila não repetir. */
function lerEnviadas(h: string): string[] {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_ENVIADAS) ?? 'null') as { dia: string; ids: string[] } | null;
    return salvo?.dia === h ? salvo.ids : [];
  } catch {
    return [];
  }
}

function FilaDoDia({ mensagens, h }: { mensagens: Mensagem[]; h: string }) {
  const [aberta, setAberta] = useState<string>();
  const [enviadas, setEnviadas] = useState<string[]>(() => lerEnviadas(h));
  const fila = mensagens.filter((m) => !enviadas.includes(m.id));

  function marcar(id: string) {
    const ids = [...enviadas, id];
    setEnviadas(ids);
    try {
      localStorage.setItem(CHAVE_ENVIADAS, JSON.stringify({ dia: h, ids }));
    } catch {
      // Sem armazenamento, a mensagem só volta a aparecer na próxima visita.
    }
  }

  return (
    <section className="e-painel" aria-labelledby="fila-t">
      <div className="e-painel-t">
        <h2 id="fila-t">Mensagens de hoje: {fila.length}</h2>
        <span>o sistema montou sozinho</span>
      </div>
      {fila.length ? (
        <ul className="e-fila">
          {fila.slice(0, 6).map((m) => {
            const Icone = ICONE_MSG[m.tipo];
            return (
              <li key={m.id}>
                <button type="button" className="txt" onClick={() => setAberta(aberta === m.id ? undefined : m.id)} aria-expanded={aberta === m.id}>
                  <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icone size={14} aria-hidden="true" /> {m.titulo}
                  </b>
                  <small>
                    {NOME_MSG[m.tipo]}. {m.sub}
                  </small>
                </button>
                <a className="e-bt e-bt--p" href={linkWhats(m.telefone, m.texto)} target="_blank" rel="noopener noreferrer" onClick={() => marcar(m.id)} aria-label={`Enviar para ${m.titulo} no WhatsApp`}>
                  <MessageCircle size={14} aria-hidden="true" /> Enviar
                </a>
                {aberta === m.id && <pre>{m.texto}</pre>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="e-mut">Nenhuma mensagem para hoje.</p>
      )}
      <p className="e-mut" style={{ marginTop: 12, fontSize: 11.5 }}>
        Toque no nome para ler. O envio abre o seu WhatsApp, com o texto pronto.
      </p>
    </section>
  );
}

export default function PainelPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const financeiro = temFinanceiro(user?.businessMode);
  const incomes = useIncomes();
  const expenses = useExpenses();
  const bookings = useBookings();
  const goals = useGoals();
  const clientes = useClientes();
  const provider = useProvider();
  const iv = useIntervalo();
  const h = hoje();

  const { data: subscription } = useQuery({
    queryKey: ['subscriptions', 'me'],
    enabled: !!token,
    queryFn: async () => (await api.get<Subscription>('/subscriptions/me')).data,
  });
  const { data: caixaHoje, isSuccess: caixaOk } = useQuery({
    queryKey: ['cash-register', 'today'],
    enabled: !!token && financeiro,
    queryFn: async () => (await api.get<CashRegister | null>('/cash-register/today')).data,
  });
  const { data: historicoCaixa } = useQuery({
    queryKey: ['cash-register', 'history'],
    enabled: !!token && financeiro,
    queryFn: async () => (await api.get<CashRegister[]>('/cash-register/history')).data,
  });

  const entradas = incomes.data;
  const saidas = expenses.data;
  const lista = bookings.data;

  const numeros = useMemo(() => {
    if (!entradas || !saidas) return null;
    const a = resumo(entradas, saidas, iv.de, iv.ate);
    const b = resumo(entradas, saidas, iv.ant.de, iv.ant.ate);
    const grafico = serie(entradas, saidas, iv.dias < 7 ? somaDias(iv.ate, -6) : iv.de, iv.ate);
    return { a, b, grafico };
  }, [entradas, saidas, iv]);

  const mes = h.slice(0, 7);
  const meta = goals.data?.find((g) => g.month === mes);
  const doMes = useMemo(() => resumo(entradas ?? [], saidas ?? [], `${mes}-01`, h), [entradas, saidas, mes, h]);
  const alertas = useMemo(
    () =>
      alertasDoDia({
        bookings: lista ?? [],
        h,
        // Só cobra o caixa de quem já usa: quem nunca abriu não precisa desse aviso.
        usaCaixa: financeiro && (historicoCaixa?.length ?? 0) > 0,
        caixaFechadoHoje: caixaOk ? !!caixaHoje : undefined,
        meta: financeiro ? meta : undefined,
        lucroDoMes: doMes.lucro,
      }),
    [lista, h, financeiro, historicoCaixa, caixaOk, caixaHoje, meta, doMes.lucro],
  );
  const mensagens = useMemo(() => mensagensDoDia(lista ?? [], clientes.data ?? [], h), [lista, clientes.data, h]);

  if (incomes.isError || expenses.isError || bookings.isError) {
    return (
      <ErroAoCarregar
        tentar={() => {
          incomes.refetch();
          expenses.refetch();
          bookings.refetch();
        }}
      />
    );
  }
  if (!numeros || !lista) {
    return (
      <section className="e-painel">
        <Esqueleto linhas={6} />
      </section>
    );
  }

  const { a, b, grafico } = numeros;
  const comp = iv.comparacao;
  const diasNoMes = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).getDate();
  const passou = Number(h.slice(8)) / diasNoMes;
  const feitoMeta = meta ? Math.max(doMes.lucro, 0) / meta.targetAmount : 0;

  return (
    <>
      {financeiro ? (
        <section className="e-kpis" aria-label="Números do período">
          <Kpi tipo="destaque" rotulo="Faturamento" valor={a.faturamento} antes={b.faturamento} comparacao={comp} frase={`${a.servicos} ${a.servicos === 1 ? 'serviço' : 'serviços'}. Tudo que foi concluído ou lançado.`} />
          <Kpi tipo="lucro" rotulo="Lucro" valor={a.lucro} antes={b.lucro} comparacao={comp} frase="Faturamento menos as despesas que você lançou." />
          <Kpi rotulo="A receber" valor={aReceber(lista)} frase="Combinado em serviços confirmados ou em andamento." />
          <Kpi rotulo="Despesas" cor="var(--sai)" inverso valor={a.despesas} antes={b.despesas} comparacao={comp} frase="O que saiu no período." />
        </section>
      ) : (
        provider.data && (
          <section className="e-minis" aria-label="Seus números">
            <Mini rotulo="Nota média" valor={provider.data.ratingAvg.toFixed(1)} />
            <Mini rotulo="Score" valor={Math.round(provider.data.scoreIA)} />
            <Mini rotulo="Serviços realizados" valor={provider.data.servicesDone} />
            <Mini rotulo="Clientes" valor={provider.data.clientsCount} />
          </section>
        )
      )}

      {temCaptacao(user?.businessMode) && provider.data && <Disponibilidade provider={provider.data} />}

      {financeiro && (
        <section className="e-painel">
          <div className="e-painel-t">
            <h2>Faturamento e lucro {grafico.passo === 1 ? 'por dia' : grafico.passo === 7 ? 'por semana' : 'por mês'}</h2>
            <span>
              {dataCurta(iv.dias < 7 ? somaDias(iv.ate, -6) : iv.de)} a {dataCurta(iv.ate)}
            </span>
          </div>
          <GraficoBarras pontos={grafico.pontos} rotulo="Faturamento em barras e lucro em linha" />
          <p className="e-legenda">
            <span>
              <i style={{ '--c': 'var(--teal)' } as CSSProperties} /> Faturamento
            </span>
            <span>
              <i style={{ '--c': 'var(--ent)' } as CSSProperties} /> Lucro
            </span>
          </p>
        </section>
      )}

      <div className="e-grade-2">
        <div className="e-coluna">
          <Alertas alertas={alertas} />
          <section className="e-painel" aria-label="Resumo do mês">
            {financeiro && meta && (
              <Link href="/painel/metas" className="e-resumo" style={{ display: 'block' }}>
                <span>
                  Meta de {nomeMes(mes)}: <b>{pct(feitoMeta)}</b> <span className="e-mut">({pct(passou)} do mês passou)</span>
                </span>
                <span className="e-meta-barra" aria-hidden="true" style={{ display: 'block', height: 8 }}>
                  <i style={{ width: `${Math.min(100, feitoMeta * 100)}%` }} />
                  <em style={{ left: `${passou * 100}%` }} />
                </span>
              </Link>
            )}
            {financeiro && (
              <Link href="/painel/feitos" className="e-resumo">
                <span>
                  <b>{doMes.servicos}</b> {doMes.servicos === 1 ? 'serviço' : 'serviços'} em {nomeMes(mes)}, ticket médio de <b>R$ {brl(doMes.ticket)}</b>
                </span>
                <span className="ir">Ver →</span>
              </Link>
            )}
            <Link href="/painel/quadro" className="e-resumo">
              <span>
                <b>{lista.filter((x) => ['SOLICITADO', 'ACEITO', 'EM_ANDAMENTO'].includes(x.status)).length}</b> no quadro de serviços
              </span>
              <span className="ir">Ver →</span>
            </Link>
            {provider.data && provider.data.ratingAvg > 0 && (
              <Link href="/painel/clientes" className="e-resumo">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Star size={14} aria-hidden="true" /> Nota <b>{provider.data.ratingAvg.toFixed(1)}</b>
                </span>
                <span className="ir">Clientes →</span>
              </Link>
            )}
            {subscription && (
              <Link href="/painel/plano" className="e-resumo">
                <span>
                  Plano <b>{subscription.config.label}</b>
                  {temCaptacao(user?.businessMode) && (
                    <span className="e-mut">
                      {' '}
                      ({subscription.config.proposalsPerMonth >= UNLIMITED ? 'propostas ilimitadas' : `até ${subscription.config.proposalsPerMonth} propostas por mês`})
                    </span>
                  )}
                </span>
                <span className="ir">Ver →</span>
              </Link>
            )}
          </section>
        </div>
        <FilaDoDia mensagens={mensagens} h={h} />
      </div>
    </>
  );
}
