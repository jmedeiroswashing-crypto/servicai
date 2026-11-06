'use client';

import { useMemo, useState } from 'react';
import { Download, FileBarChart, Printer } from 'lucide-react';
import { useClientes, useExpenses, useIncomes, useIntervalo } from '@/components/painel/dados';
import { ErroAoCarregar, Esqueleto, Vazio } from '@/components/painel/pecas';
import { baixarCsv } from '@/lib/painel/exportar';
import { agrupar, brl, lerDescricao, serie } from '@/lib/painel/numeros';
import { dataCurta, diaDe } from '@/lib/painel/periodo';

type Linha = { nome: string; qtd?: number; a?: number; b?: number; total: number };
type Relatorio = { id: string; nome: string; colunas: { nome: string; a?: string; b?: string; qtd?: string; total: string }; linhas: Linha[] };

const dinheiro = (v: number) => `R$ ${brl(v, true)}`;

export default function RelatoriosPage() {
  const incomes = useIncomes();
  const expenses = useExpenses();
  const clientes = useClientes();
  const iv = useIntervalo();
  const [atual, setAtual] = useState('dias');

  const relatorios = useMemo<Relatorio[]>(() => {
    const entradas = (incomes.data ?? []).filter((i) => {
      const d = diaDe(i.date);
      return d >= iv.de && d <= iv.ate;
    });
    const saidas = (expenses.data ?? []).filter((e) => {
      const d = diaDe(e.date);
      return d >= iv.de && d <= iv.ate;
    });
    const { pontos, passo } = serie(entradas, saidas, iv.de, iv.ate);
    const dia = pontos.filter((p) => p.fat || p.desp).map((p) => ({
      nome: passo === 30 ? `${p.dia.slice(5, 7)}/${p.dia.slice(0, 4)}` : passo === 7 ? `Semana de ${dataCurta(p.dia)}` : dataCurta(p.dia),
      a: p.fat,
      b: p.desp,
      total: p.lucro,
    }));
    const paraLinha = (g: { nome: string; total: number; qtd: number }) => ({ nome: g.nome, qtd: g.qtd, total: g.total });
    return [
      { id: 'dias', nome: 'Dia a dia', colunas: { nome: 'Quando', a: 'Faturamento', b: 'Despesas', total: 'Lucro' }, linhas: dia },
      {
        id: 'servicos',
        nome: 'Por serviço',
        colunas: { nome: 'Serviço', qtd: 'Vezes', total: 'Faturamento' },
        linhas: agrupar(entradas, (i) => lerDescricao(i.description).servico, (i) => i.amount).map(paraLinha),
      },
      {
        id: 'formas',
        nome: 'Forma de pagamento',
        colunas: { nome: 'Forma', qtd: 'Serviços', total: 'Faturamento' },
        linhas: agrupar(entradas, (i) => lerDescricao(i.description).forma ?? 'Não informada', (i) => i.amount).map(paraLinha),
      },
      {
        id: 'despesas',
        nome: 'Despesas',
        colunas: { nome: 'Categoria', qtd: 'Lançamentos', total: 'Total' },
        linhas: agrupar(saidas, (e) => e.category, (e) => e.amount).map(paraLinha),
      },
      {
        id: 'clientes',
        nome: 'Clientes',
        colunas: { nome: 'Cliente', qtd: 'Serviços', total: 'Total desde o início' },
        linhas: [...(clientes.data ?? [])].sort((a, b) => b.totalSpent - a.totalSpent).map((c) => ({ nome: c.name, qtd: c.servicesCount, total: c.totalSpent })),
      },
    ];
  }, [incomes.data, expenses.data, clientes.data, iv.de, iv.ate]);

  if (incomes.isError || expenses.isError) {
    return (
      <ErroAoCarregar
        tentar={() => {
          incomes.refetch();
          expenses.refetch();
        }}
      />
    );
  }
  if (!incomes.data || !expenses.data) {
    return (
      <section className="e-painel">
        <Esqueleto />
      </section>
    );
  }

  const r = relatorios.find((x) => x.id === atual) ?? relatorios[0];
  const c = r.colunas;
  const soma = (f: (l: Linha) => number | undefined) => r.linhas.reduce((t, l) => t + (f(l) ?? 0), 0);

  return (
    <section className="e-painel">
      <div className="e-fichas e-nao-imprimir" role="group" aria-label="Escolha o relatório" style={{ marginBottom: 14 }}>
        {relatorios.map((x) => (
          <button key={x.id} type="button" className="e-ficha" aria-pressed={x.id === r.id} onClick={() => setAtual(x.id)}>
            {x.nome}
          </button>
        ))}
      </div>
      <div className="e-painel-t">
        <h2>
          {r.nome} <span>· {iv.rotulo}</span>
        </h2>
        <div className="e-bts e-nao-imprimir">
          <button type="button" className="e-bt e-bt--p" onClick={() => window.print()} disabled={r.linhas.length === 0}>
            <Printer size={14} aria-hidden="true" /> Imprimir
          </button>
          <button
            type="button"
            className="e-bt e-bt--p"
            disabled={r.linhas.length === 0}
            onClick={() =>
              baixarCsv(`relatorio-${r.id}-${iv.de}-a-${iv.ate}`, r.linhas, [
                { titulo: c.nome, valor: (l) => l.nome },
                ...(c.qtd ? [{ titulo: c.qtd, valor: (l: Linha) => l.qtd ?? 0 }] : []),
                ...(c.a ? [{ titulo: c.a, valor: (l: Linha) => l.a ?? 0 }] : []),
                ...(c.b ? [{ titulo: c.b, valor: (l: Linha) => l.b ?? 0 }] : []),
                { titulo: c.total, valor: (l) => l.total },
              ])
            }
          >
            <Download size={14} aria-hidden="true" /> Baixar planilha
          </button>
        </div>
      </div>
      {r.linhas.length === 0 ? (
        <Vazio icone={FileBarChart} titulo="Sem dados neste período" texto="Lance serviços e despesas ou troque o período no cabeçalho." />
      ) : (
        <div className="e-tabela-caixa" tabIndex={0} role="region" aria-label={`Tabela: ${r.nome}`}>
          <table className="e-tabela">
            <thead>
              <tr>
                <th>{c.nome}</th>
                {c.qtd && <th className="dir">{c.qtd}</th>}
                {c.a && <th className="dir">{c.a}</th>}
                {c.b && <th className="dir">{c.b}</th>}
                <th className="dir">{c.total}</th>
              </tr>
            </thead>
            <tbody>
              {r.linhas.map((l) => (
                <tr key={l.nome}>
                  <td>
                    <b>{l.nome}</b>
                  </td>
                  {c.qtd && <td className="dir">{l.qtd}</td>}
                  {c.a && <td className="dir">{dinheiro(l.a ?? 0)}</td>}
                  {c.b && <td className="dir">{dinheiro(l.b ?? 0)}</td>}
                  <td className="dir">{dinheiro(l.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                {c.qtd && <td className="dir">{soma((l) => l.qtd)}</td>}
                {c.a && <td className="dir">{dinheiro(soma((l) => l.a))}</td>}
                {c.b && <td className="dir">{dinheiro(soma((l) => l.b))}</td>}
                <td className="dir">{dinheiro(soma((l) => l.total))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
