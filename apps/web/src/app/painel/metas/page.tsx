'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Target, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useExpenses, useGoals, useIncomes } from '@/components/painel/dados';
import { ErroAoCarregar, Esqueleto, Mini, Vazio } from '@/components/painel/pecas';
import { brl, pct, resumo } from '@/lib/painel/numeros';
import { hoje, nomeMes } from '@/lib/painel/periodo';

const fimDoMes = (mes: string) => `${mes}-${String(new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).getDate()).padStart(2, '0')}`;
const rotuloMes = (mes: string) => `${nomeMes(mes)} de ${mes.slice(0, 4)}`;

export default function MetasPage() {
  const queryClient = useQueryClient();
  const goals = useGoals();
  const incomes = useIncomes();
  const expenses = useExpenses();
  const h = hoje();
  const mesAtual = h.slice(0, 7);
  const [mes, setMes] = useState(mesAtual);
  const [valor, setValor] = useState('');

  const atualizar = () => queryClient.invalidateQueries({ queryKey: ['goals', 'mine'] });

  const salvar = useMutation({
    mutationFn: async () => (await api.post('/goals', { month: mes, targetAmount: Number(valor) })).data,
    onSuccess: () => {
      setValor('');
      atualizar();
      toast.success('Meta salva.');
    },
    onError: () => toast.error('Não foi possível salvar a meta.'),
  });
  const apagar = useMutation({
    mutationFn: async (m: string) => api.delete(`/goals/${m}`),
    onSuccess: atualizar,
    onError: () => toast.error('Não foi possível apagar a meta.'),
  });

  const lucroDe = useMemo(() => {
    const entradas = incomes.data ?? [];
    const saidas = expenses.data ?? [];
    return (m: string) => resumo(entradas, saidas, `${m}-01`, fimDoMes(m)).lucro;
  }, [incomes.data, expenses.data]);

  if (goals.isError || incomes.isError || expenses.isError) {
    return (
      <ErroAoCarregar
        tentar={() => {
          goals.refetch();
          incomes.refetch();
          expenses.refetch();
        }}
      />
    );
  }
  if (!goals.data || !incomes.data || !expenses.data) {
    return (
      <section className="e-painel">
        <Esqueleto />
      </section>
    );
  }

  const meta = goals.data.find((g) => g.month === mesAtual);
  const lucro = lucroDe(mesAtual);
  const diaAtual = Number(h.slice(8));
  const diasNoMes = Number(fimDoMes(mesAtual).slice(8));
  const passou = diaAtual / diasNoMes;
  const projecao = (lucro / diaAtual) * diasNoMes;
  const feito = meta ? Math.max(lucro, 0) / meta.targetAmount : 0;
  const faltam = diasNoMes - diaAtual;
  const noRitmo = meta ? feito >= passou : false;

  return (
    <>
      {meta ? (
        <section className="e-painel" aria-label={`Meta de ${nomeMes(mesAtual)}`}>
          <div className="e-painel-t">
            <h2>Meta de lucro de {nomeMes(mesAtual)}</h2>
            <span>{faltam === 0 ? 'último dia do mês' : `faltam ${faltam} ${faltam === 1 ? 'dia' : 'dias'}`}</span>
          </div>
          <p className="e-kpi-val">
            <small>R$</small>
            {lucro < 0 && '−'}
            {brl(Math.abs(lucro))} <span className="e-mut" style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0 }}>de R$ {brl(meta.targetAmount)}</span>
          </p>
          <div className="e-meta-barra" role="img" aria-label={`${pct(feito)} da meta, com ${pct(passou)} do mês já passado`}>
            <i style={{ width: `${Math.min(100, feito * 100)}%` }} />
            <em style={{ left: `${passou * 100}%` }} />
          </div>
          <p className="e-mut" style={{ fontSize: 12.5 }}>
            {pct(feito)} da meta. A marca mostra {pct(passou)} do mês já passado.
          </p>
          <p className="e-nota" style={{ marginTop: 12, background: noRitmo || meta.reachedAt ? 'var(--ent-fundo)' : 'var(--ate-fundo)' }}>
            {meta.reachedAt ? 'Meta alcançada neste mês. Parabéns!' : noRitmo ? 'Você está no ritmo da meta.' : `Abaixo do ritmo: faltam R$ ${brl(Math.max(meta.targetAmount - lucro, 0))} de lucro.`}
          </p>
        </section>
      ) : (
        <section className="e-painel">
          <Vazio icone={Target} titulo={`Sem meta para ${nomeMes(mesAtual)}`} texto="Defina quanto quer de lucro neste mês para acompanhar o ritmo." />
        </section>
      )}

      <section className="e-minis" aria-label="Números do mês">
        <Mini rotulo="Lucro até hoje" valor={`R$ ${brl(lucro)}`} />
        <Mini rotulo="Projeção do mês" valor={`R$ ${brl(projecao)}`} nota="mantendo o ritmo atual" />
        <Mini rotulo="Lucro por dia" valor={`R$ ${brl(lucro / diaAtual)}`} />
        <Mini rotulo="Metas alcançadas" valor={goals.data.filter((g) => g.reachedAt).length} nota={`de ${goals.data.length}`} />
      </section>

      <div className="e-grade-2">
        <section className="e-painel">
          <div className="e-painel-t">
            <h2>Metas de cada mês</h2>
          </div>
          {goals.data.length === 0 ? (
            <p className="e-mut">Nenhuma meta definida ainda.</p>
          ) : (
            <div className="e-linhas">
              {goals.data.map((g) => (
                <div key={g.id} className="e-linha">
                  <div>
                    <b style={{ textTransform: 'capitalize' }}>{rotuloMes(g.month)}</b>
                    <small>
                      Lucro de R$ {brl(lucroDe(g.month))} de R$ {brl(g.targetAmount)}
                    </small>
                  </div>
                  <div className="e-linha-fim">
                    {g.reachedAt && (
                      <span className="e-pill ent">
                        <Sparkles size={12} aria-hidden="true" style={{ marginRight: 4 }} /> Alcançada
                      </span>
                    )}
                    <button
                      type="button"
                      className="e-bt e-bt--p e-bt--perigo"
                      aria-label={`Apagar meta de ${rotuloMes(g.month)}`}
                      disabled={apagar.isPending}
                      onClick={() => {
                        if (window.confirm(`Apagar a meta de ${rotuloMes(g.month)}?`)) apagar.mutate(g.month);
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
            <h2>Definir meta</h2>
          </div>
          <form
            className="e-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (Number(valor) > 0) salvar.mutate();
            }}
          >
            <label className="e-campo">
              Mês
              <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} required />
            </label>
            <label className="e-campo">
              Meta de lucro (R$)
              <input type="number" inputMode="decimal" min="0.01" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" required />
            </label>
            <button type="submit" className="e-bt e-bt--forte" disabled={!(Number(valor) > 0) || salvar.isPending}>
              {salvar.isPending ? 'Salvando...' : 'Salvar meta'}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
