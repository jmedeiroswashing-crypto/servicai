'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Printer, ReceiptText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useIncomes, useIntervalo, useProviderCompleto } from '@/components/painel/dados';
import { ErroAoCarregar, Esqueleto, Mini, Vazio } from '@/components/painel/pecas';
import { abrirRecibo, baixarCsv } from '@/lib/painel/exportar';
import { brl, lerDescricao, resumo } from '@/lib/painel/numeros';
import { diaDe } from '@/lib/painel/periodo';
import { useAuthStore } from '@/store/auth-store';

export default function FeitosPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const incomes = useIncomes();
  const { data: provider } = useProviderCompleto();
  const iv = useIntervalo();
  const [busca, setBusca] = useState('');

  const apagar = useMutation({
    mutationFn: async (id: string) => api.delete(`/incomes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', 'earnings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['cash-register'] });
      toast.success('Lançamento apagado.');
    },
    onError: () => toast.error('Não foi possível apagar.'),
  });

  const doPeriodo = useMemo(
    () =>
      (incomes.data ?? [])
        .filter((i) => {
          const d = diaDe(i.date);
          return d >= iv.de && d <= iv.ate;
        })
        .map((i) => ({ ...i, ...lerDescricao(i.description) })),
    [incomes.data, iv.de, iv.ate],
  );

  const q = busca.trim().toLowerCase();
  const lista = q ? doPeriodo.filter((i) => i.description.toLowerCase().includes(q)) : doPeriodo;

  if (incomes.isError) return <ErroAoCarregar tentar={() => incomes.refetch()} />;
  if (!incomes.data) {
    return (
      <section className="e-painel">
        <Esqueleto />
      </section>
    );
  }

  const r = resumo(incomes.data, [], iv.de, iv.ate);
  const daReserva = doPeriodo.filter((i) => i.source === 'RESERVA');

  return (
    <>
      <section className="e-minis" aria-label="Resumo do período">
        <Mini rotulo="Faturamento" valor={`R$ ${brl(r.faturamento)}`} />
        <Mini rotulo="Serviços" valor={r.servicos} />
        <Mini rotulo="Ticket médio" valor={`R$ ${brl(r.ticket)}`} />
        <Mini rotulo="Pelo app" valor={daReserva.length} nota={`${r.servicos - daReserva.length} lançados à mão`} />
      </section>

      <section className="e-painel">
        <div className="e-barra-busca" style={{ marginBottom: 12 }}>
          <label className="e-busca">
            <span className="sr-only">Buscar serviço ou cliente</span>
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar serviço ou cliente" />
          </label>
          <button
            type="button"
            className="e-bt"
            disabled={lista.length === 0}
            onClick={() =>
              baixarCsv(`servicos-${iv.de}-a-${iv.ate}`, lista, [
                { titulo: 'Data', valor: (i) => new Date(i.date).toLocaleDateString('pt-BR') },
                { titulo: 'Serviço', valor: (i) => i.servico },
                { titulo: 'Cliente', valor: (i) => i.cliente ?? '' },
                { titulo: 'Pagamento', valor: (i) => i.forma ?? '' },
                { titulo: 'Origem', valor: (i) => (i.source === 'RESERVA' ? 'Reserva' : 'Manual') },
                { titulo: 'Valor', valor: (i) => i.amount },
              ])
            }
          >
            <Download size={16} aria-hidden="true" /> Baixar planilha
          </button>
        </div>

        {lista.length === 0 ? (
          <Vazio icone={ReceiptText} titulo={q ? 'Nada encontrado' : 'Nenhum serviço neste período'} texto={q ? 'Tente outra palavra.' : 'Conclua um serviço no Quadro ou lance um serviço para ele aparecer aqui.'} />
        ) : (
          <div className="e-linhas">
            {lista.map((i) => (
              <div key={i.id} className="e-linha">
                <div>
                  <b>{i.servico}</b>
                  <small>
                    {new Date(i.date).toLocaleDateString('pt-BR')}
                    {i.cliente ? ` · ${i.cliente}` : ''}
                    {i.forma ? ` · ${i.forma}` : ''}
                  </small>
                </div>
                <div className="e-linha-fim">
                  {i.source === 'RESERVA' && <span className="e-pill so-pc">Reserva</span>}
                  <span className="val ent">R$ {brl(i.amount, true)}</span>
                  <button
                    type="button"
                    className="e-bt e-bt--p"
                    aria-label={`Recibo de ${i.servico}`}
                    onClick={() => {
                      const abriu = abrirRecibo({ prestador: user?.name ?? 'Prestador', telefone: provider?.user.phone, servico: i.servico, cliente: i.cliente, forma: i.forma, valor: i.amount, data: i.date });
                      if (!abriu) toast.error('O navegador bloqueou a janela do recibo. Libere e tente de novo.');
                    }}
                  >
                    <Printer size={14} aria-hidden="true" />
                  </button>
                  {i.source !== 'RESERVA' && (
                    <button
                      type="button"
                      className="e-bt e-bt--p e-bt--perigo"
                      aria-label={`Apagar ${i.servico}`}
                      disabled={apagar.isPending}
                      onClick={() => {
                        if (window.confirm(`Apagar "${i.servico}" de R$ ${brl(i.amount, true)}?`)) apagar.mutate(i.id);
                      }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
