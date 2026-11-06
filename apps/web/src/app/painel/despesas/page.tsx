'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleDollarSign, Download, Repeat, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ReceiptScanButton } from '@/components/ReceiptScanButton';
import { useExpenses, useIntervalo } from '@/components/painel/dados';
import { ErroAoCarregar, Esqueleto, Kpi, Vazio } from '@/components/painel/pecas';
import { baixarCsv } from '@/lib/painel/exportar';
import { EXPENSE_CATEGORIES, suggestExpenseCategory } from '@/lib/expense-categories';
import { agrupar, brl, pct, resumo } from '@/lib/painel/numeros';
import { dataParaApi, diaDe, hoje } from '@/lib/painel/periodo';

function useAtualizar() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['expenses', 'mine'] });
    queryClient.invalidateQueries({ queryKey: ['bookings', 'earnings'] });
    queryClient.invalidateQueries({ queryKey: ['calendar'] });
    queryClient.invalidateQueries({ queryKey: ['cash-register'] });
  };
}

function NovaDespesa() {
  const atualizar = useAtualizar();
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [mexeuCategoria, setMexeuCategoria] = useState(false);
  const [valor, setValor] = useState('');
  const [dia, setDia] = useState(hoje);
  const [repete, setRepete] = useState(false);

  const mutation = useMutation({
    mutationFn: async () =>
      (await api.post('/expenses', { description: descricao.trim(), category: categoria, amount: Number(valor), isRecurring: repete, date: dataParaApi(dia) })).data,
    onSuccess: () => {
      setDescricao('');
      setValor('');
      setRepete(false);
      setMexeuCategoria(false);
      setCategoria(EXPENSE_CATEGORIES[0]);
      setDia(hoje());
      atualizar();
      toast.success('Despesa lançada.');
    },
    onError: () => toast.error('Não foi possível lançar a despesa. Tente de novo.'),
  });

  const valido = descricao.trim().length >= 2 && Number(valor) > 0 && !!dia;

  return (
    <section className="e-painel" id="nova" style={{ scrollMarginTop: 16 }}>
      <div className="e-painel-t">
        <h2>Lançar despesa</h2>
        <ReceiptScanButton onExtracted={(v) => v !== null && setValor(String(v))} />
      </div>
      <form
        className="e-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (valido) mutation.mutate();
        }}
      >
        <div className="e-form-linha">
          <label className="e-campo">
            O que foi pago
            <input
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value);
                if (!mexeuCategoria) setCategoria(suggestExpenseCategory(e.target.value));
              }}
              placeholder="Ex.: gasolina"
              maxLength={100}
              required
            />
          </label>
          <label className="e-campo">
            Categoria
            <select
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value);
                setMexeuCategoria(true);
              }}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="e-campo">
            Valor (R$)
            <input type="number" inputMode="decimal" min="0.01" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" required />
          </label>
          <label className="e-campo">
            Data
            <input type="date" value={dia} onChange={(e) => setDia(e.target.value)} required />
          </label>
        </div>
        <label className="e-check">
          <input type="checkbox" checked={repete} onChange={(e) => setRepete(e.target.checked)} />
          <Repeat size={14} aria-hidden="true" /> Repetir todo mês automaticamente
        </label>
        <div className="e-bts">
          <button type="submit" className="e-bt e-bt--forte" disabled={!valido || mutation.isPending}>
            {mutation.isPending ? 'Lançando...' : 'Lançar despesa'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function DespesasPage() {
  const expenses = useExpenses();
  const iv = useIntervalo();
  const atualizar = useAtualizar();

  const apagar = useMutation({
    mutationFn: async (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      atualizar();
      toast.success('Despesa apagada.');
    },
    onError: () => toast.error('Não foi possível apagar.'),
  });

  const lista = useMemo(
    () =>
      (expenses.data ?? []).filter((e) => {
        const d = diaDe(e.date);
        return d >= iv.de && d <= iv.ate;
      }),
    [expenses.data, iv.de, iv.ate],
  );

  if (expenses.isError) return <ErroAoCarregar tentar={() => expenses.refetch()} />;
  if (!expenses.data) {
    return (
      <section className="e-painel">
        <Esqueleto />
      </section>
    );
  }

  const r = resumo([], expenses.data, iv.de, iv.ate);
  const antes = resumo([], expenses.data, iv.ant.de, iv.ant.ate);
  const porCategoria = agrupar(lista, (e) => e.category, (e) => e.amount);
  const fixas = expenses.data.filter((e) => e.isRecurring && !e.recurringParentId);

  return (
    <>
      <section className="e-kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }} aria-label="Resumo das despesas">
        <Kpi rotulo="Despesas no período" cor="var(--sai)" inverso valor={r.despesas} antes={antes.despesas} comparacao={iv.comparacao} frase={`${lista.length} ${lista.length === 1 ? 'lançamento' : 'lançamentos'}.`} />
        <Kpi rotulo="Fixas por mês" cor="var(--ate)" valor={fixas.reduce((t, e) => t + e.amount, 0)} frase={`${fixas.length} ${fixas.length === 1 ? 'conta que repete' : 'contas que repetem'} todo mês.`} />
      </section>

      <NovaDespesa />

      <div className="e-grade-2">
        <section className="e-painel">
          <div className="e-painel-t">
            <h2>Lançamentos do período</h2>
            <button
              type="button"
              className="e-bt e-bt--p"
              disabled={lista.length === 0}
              onClick={() =>
                baixarCsv(`despesas-${iv.de}-a-${iv.ate}`, lista, [
                  { titulo: 'Data', valor: (e) => new Date(e.date).toLocaleDateString('pt-BR') },
                  { titulo: 'Descrição', valor: (e) => e.description },
                  { titulo: 'Categoria', valor: (e) => e.category },
                  { titulo: 'Valor', valor: (e) => e.amount },
                ])
              }
            >
              <Download size={14} aria-hidden="true" /> Baixar planilha
            </button>
          </div>
          {lista.length === 0 ? (
            <Vazio icone={CircleDollarSign} titulo="Nenhuma despesa neste período" texto="Lance o que sai para saber o seu lucro de verdade." />
          ) : (
            <div className="e-linhas">
              {lista.map((e) => (
                <div key={e.id} className="e-linha">
                  <div>
                    <b>{e.description}</b>
                    <small>
                      {e.category} · {new Date(e.date).toLocaleDateString('pt-BR')}
                      {(e.isRecurring || e.recurringParentId) && ' · repete todo mês'}
                    </small>
                  </div>
                  <div className="e-linha-fim">
                    <span className="val sai">R$ {brl(e.amount, true)}</span>
                    <button
                      type="button"
                      className="e-bt e-bt--p e-bt--perigo"
                      aria-label={`Apagar ${e.description}`}
                      disabled={apagar.isPending}
                      onClick={() => {
                        if (window.confirm(`Apagar "${e.description}" de R$ ${brl(e.amount, true)}?`)) apagar.mutate(e.id);
                      }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="e-painel">
          <div className="e-painel-t">
            <h2>Por categoria</h2>
          </div>
          {porCategoria.length === 0 ? (
            <p className="e-mut">Sem despesas no período.</p>
          ) : (
            <div className="e-barras">
              {porCategoria.map((g) => (
                <div key={g.nome}>
                  <div className="t">
                    <b>{g.nome}</b>
                    <span>
                      R$ {brl(g.total)} · {pct(g.total / r.despesas)}
                    </span>
                  </div>
                  <div className="e-trilho">
                    <i style={{ width: `${(g.total / r.despesas) * 100}%`, background: 'var(--sai)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
