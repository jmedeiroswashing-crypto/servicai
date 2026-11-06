'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ClipboardList, Download, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useBookings } from '@/components/painel/dados';
import { ErroAoCarregar, Esqueleto, Mini, Vazio } from '@/components/painel/pecas';
import { baixarCsv } from '@/lib/painel/exportar';
import { ABERTOS, aReceber, atrasado, brl, linkWhats } from '@/lib/painel/numeros';
import { dataCurta, diaDe, hoje, nomeMes, somaDias } from '@/lib/painel/periodo';
import type { Booking, BookingStatus } from '@/lib/types';

type Coluna = {
  status: BookingStatus;
  nome: string;
  cor: string;
  proximo?: { status: BookingStatus; nome: string };
  sair?: { status: BookingStatus; nome: string; pergunta: string };
  whats: (nome: string) => string;
};

const COLUNAS: Coluna[] = [
  {
    status: 'SOLICITADO',
    nome: 'Novos pedidos',
    cor: 'var(--ate)',
    proximo: { status: 'ACEITO', nome: 'Confirmar' },
    sair: { status: 'RECUSADO', nome: 'Recusar', pergunta: 'Recusar este pedido?' },
    whats: (n) => `Olá, ${n}! Recebi seu pedido no ServiçAi. Pode me contar um pouco mais?`,
  },
  {
    status: 'ACEITO',
    nome: 'Confirmados',
    cor: 'var(--inf)',
    proximo: { status: 'EM_ANDAMENTO', nome: 'Iniciar' },
    sair: { status: 'CANCELADO', nome: 'Cancelar', pergunta: 'Cancelar este serviço?' },
    whats: (n) => `Olá, ${n}! Seu serviço está confirmado. Qualquer mudança, me avise por aqui.`,
  },
  {
    status: 'EM_ANDAMENTO',
    nome: 'Em andamento',
    cor: 'var(--teal)',
    proximo: { status: 'CONCLUIDO', nome: 'Concluir' },
    whats: (n) => `Olá, ${n}! Estou cuidando do seu serviço e aviso assim que terminar.`,
  },
  {
    status: 'CONCLUIDO',
    nome: 'Concluídos',
    cor: 'var(--ent)',
    whats: (n) => `Olá, ${n}! Obrigado pela confiança. Se puder, deixe sua avaliação no ServiçAi.`,
  },
];

const DIAS_CONCLUIDOS = 30;

function Cartao({ booking, coluna, h }: { booking: Booking; coluna: Coluna; h: string }) {
  const queryClient = useQueryClient();
  const mudar = useMutation({
    mutationFn: async (status: BookingStatus) =>
      (await api.patch<Booking & { recognition?: { title: string } | null }>(`/bookings/${booking.id}/status`, { status })).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['incomes', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['goals', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['cash-register'] });
      if (data.recognition) toast.success(data.recognition.title);
    },
    onError: () => toast.error('Não foi possível atualizar. Tente de novo.'),
  });

  const atraso = atrasado(booking, h);
  const nome = booking.client?.name ?? 'Cliente';
  const telefone = booking.client?.phone;
  const semValor = booking.status === 'EM_ANDAMENTO' && booking.priceQuoted == null;

  return (
    <article className={`e-cartao${atraso ? ' atrasado' : ''}`}>
      <b>{booking.service?.title ?? (booking.notes?.slice(0, 40) || 'Serviço')}</b>
      <span>{nome}</span>
      {booking.scheduledAt && (
        <span className="e-mut">
          {new Date(booking.scheduledAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}{' '}
          {atraso && <span className="e-pill sai">Atrasado</span>}
        </span>
      )}
      {booking.priceQuoted != null ? <span className="valor">R$ {brl(booking.priceQuoted, true)}</span> : <span className="e-mut">Sem valor combinado</span>}
      {semValor && (
        <span className="e-mut">
          Ao concluir sem valor, <Link href="/painel/lancar" className="underline">lance o que recebeu</Link>.
        </span>
      )}
      <div className="e-cartao-acoes">
        {coluna.proximo && (
          <button type="button" className="e-bt e-bt--p e-bt--forte" disabled={mudar.isPending} onClick={() => mudar.mutate(coluna.proximo!.status)}>
            {coluna.proximo.nome} <ChevronRight size={14} aria-hidden="true" />
          </button>
        )}
        {telefone && (
          <a className="e-bt e-bt--p" href={linkWhats(telefone, coluna.whats(nome.split(' ')[0]))} target="_blank" rel="noopener noreferrer" aria-label={`Mandar WhatsApp para ${nome}`}>
            <MessageCircle size={14} aria-hidden="true" />
          </a>
        )}
        {coluna.sair && (
          <button
            type="button"
            className="e-bt e-bt--p e-bt--perigo"
            disabled={mudar.isPending}
            onClick={() => {
              if (window.confirm(coluna.sair!.pergunta)) mudar.mutate(coluna.sair!.status);
            }}
          >
            {coluna.sair.nome}
          </button>
        )}
      </div>
    </article>
  );
}

const quando = (b: Booking) => (b as Booking & { updatedAt?: string }).updatedAt ?? b.createdAt;

export default function QuadroPage() {
  const bookings = useBookings();
  const [busca, setBusca] = useState('');
  const [soAtrasados, setSoAtrasados] = useState(false);
  const h = hoje();

  const todos = useMemo(() => bookings.data ?? [], [bookings.data]);
  const q = busca.trim().toLowerCase();
  const filtrados = useMemo(
    () =>
      todos.filter((b) => {
        if (soAtrasados && !atrasado(b, h)) return false;
        if (!q) return true;
        return [b.client?.name, b.service?.title, b.notes].filter(Boolean).join(' ').toLowerCase().includes(q);
      }),
    [todos, soAtrasados, q, h],
  );

  if (bookings.isError) return <ErroAoCarregar tentar={() => bookings.refetch()} />;
  if (!bookings.data) {
    return (
      <section className="e-painel">
        <Esqueleto />
      </section>
    );
  }

  const abertos = todos.filter((b) => ABERTOS.includes(b.status));
  const atrasados = todos.filter((b) => atrasado(b, h));
  const deHoje = abertos.filter((b) => b.scheduledAt && diaDe(b.scheduledAt) === h);
  const mes = h.slice(0, 7);
  const concluidosMes = todos.filter((b) => b.status === 'CONCLUIDO' && diaDe(quando(b)).slice(0, 7) === mes);
  const limite = somaDias(h, -DIAS_CONCLUIDOS);

  return (
    <>
      <section className="e-minis" aria-label="Resumo do quadro">
        <Mini rotulo="Abertos" valor={abertos.length} nota={atrasados.length ? `${atrasados.length} ${atrasados.length === 1 ? 'atrasado' : 'atrasados'}` : 'nenhum atrasado'} alerta={atrasados.length > 0} />
        <Mini rotulo="Para hoje" valor={deHoje.length} />
        <Mini rotulo="A receber" valor={`R$ ${brl(aReceber(todos))}`} nota="confirmados e em andamento" />
        <Mini rotulo={`Concluídos em ${nomeMes(mes)}`} valor={concluidosMes.length} />
      </section>

      <div className="e-barra-busca">
        <label className="e-busca">
          <span className="sr-only">Buscar por cliente ou serviço</span>
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por cliente ou serviço" />
        </label>
        <button type="button" className="e-ficha" aria-pressed={soAtrasados} onClick={() => setSoAtrasados(!soAtrasados)}>
          Só atrasados ({atrasados.length})
        </button>
        <button
          type="button"
          className="e-bt"
          disabled={todos.length === 0}
          onClick={() =>
            baixarCsv(`quadro-${h}`, filtrados, [
              { titulo: 'Situação', valor: (b) => COLUNAS.find((c) => c.status === b.status)?.nome ?? b.status },
              { titulo: 'Cliente', valor: (b) => b.client?.name ?? '' },
              { titulo: 'Serviço', valor: (b) => b.service?.title ?? '' },
              { titulo: 'Data', valor: (b) => (b.scheduledAt ? new Date(b.scheduledAt).toLocaleString('pt-BR') : '') },
              { titulo: 'Valor', valor: (b) => b.priceQuoted ?? 0 },
            ])
          }
        >
          <Download size={16} aria-hidden="true" /> Baixar planilha
        </button>
      </div>

      {todos.length === 0 ? (
        <section className="e-painel">
          <Vazio icone={ClipboardList} titulo="Nenhum serviço no quadro ainda" texto="Quando um cliente pedir um serviço, ele aparece aqui. Você também pode lançar um serviço feito por fora.">
            <Link className="e-bt e-bt--forte" href="/painel/lancar">
              Lançar serviço
            </Link>
          </Vazio>
        </section>
      ) : (
        <div className="e-quadro">
          {COLUNAS.map((coluna) => {
            const cartoes = filtrados
              .filter((b) => b.status === coluna.status)
              .filter((b) => coluna.status !== 'CONCLUIDO' || diaDe(quando(b)) >= limite);
            return (
              <section key={coluna.status} className="e-col" aria-label={coluna.nome}>
                <h2 className="e-col-t">
                  <i style={{ '--c': coluna.cor } as CSSProperties} />
                  {coluna.nome}
                  <span>{cartoes.length}</span>
                </h2>
                {cartoes.length === 0 && <p className="e-col-vazia">Nada aqui.</p>}
                {cartoes.map((b) => (
                  <Cartao key={b.id} booking={b} coluna={coluna} h={h} />
                ))}
                {coluna.status === 'CONCLUIDO' && cartoes.length > 0 && <p className="e-col-vazia">Últimos {DIAS_CONCLUIDOS} dias, desde {dataCurta(limite)}.</p>}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
