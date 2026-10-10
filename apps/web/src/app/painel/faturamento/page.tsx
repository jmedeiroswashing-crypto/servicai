'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, TrendingUp, TrendingDown, Receipt, Info, Plus, Trash2, Scale, Repeat, HandCoins } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { EXPENSE_CATEGORIES, suggestExpenseCategory } from '@/lib/expense-categories';
import { ReceiptScanButton } from '@/components/ReceiptScanButton';
import type { Earnings, Expense, Income } from '@/lib/types';

function formatMoney(v: number) {
  const sign = v < 0 ? '-' : '';
  return `${sign}R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function EarningsChart({ months }: { months: Earnings['months'] }) {
  const max = Math.max(...months.map((m) => Math.max(m.total, m.expenses)), 1);

  return (
    <div className="flex items-end gap-3 border border-border p-5" style={{ height: 200 }}>
      {months.map((m, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-full w-full items-end gap-1">
            <div
              className={`w-full transition-all ${m.total > 0 ? 'bg-ink' : 'bg-surface-muted'}`}
              style={{ height: `${m.total > 0 ? Math.max((m.total / max) * 100, 4) : 2}%` }}
              title={`Receita: ${formatMoney(m.total)}`}
            />
            <div
              className={`w-full transition-all ${m.expenses > 0 ? 'bg-danger/60' : 'bg-surface-muted'}`}
              style={{ height: `${m.expenses > 0 ? Math.max((m.expenses / max) * 100, 4) : 2}%` }}
              title={`Despesas: ${formatMoney(m.expenses)}`}
            />
          </div>
          <span className="text-xs capitalize text-foreground-muted">{m.label}</span>
        </div>
      ))}
      <div className="sr-only">Barra escura: receita. Barra vermelha: despesas.</div>
    </div>
  );
}

function AddIncomeForm({ onAdded }: { onAdded: () => void }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/incomes', { description, amount: Number(amount) })).data,
    onSuccess: () => {
      setDescription('');
      setAmount('');
      onAdded();
    },
  });

  const inputClass =
    'w-full border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-ink placeholder:text-foreground-muted/50';

  return (
    <div className="border border-border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <Plus size={14} /> Lançar receita
        </p>
        <ReceiptScanButton onExtracted={(value) => value !== null && setAmount(String(value))} />
      </div>
      <div className="grid gap-2.5 sm:grid-cols-[2fr_1fr_auto]">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
          placeholder="O que você ganhou? Ex: serviço cobrado no pix"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
          placeholder="R$ 0,00"
        />
        <button
          onClick={() => mutation.mutate()}
          disabled={!description.trim() || !amount || Number(amount) <= 0 || mutation.isPending}
          className="bg-ink px-4 py-2 text-sm font-medium text-background hover:opacity-85 disabled:opacity-40"
        >
          {mutation.isPending ? '...' : 'Lançar'}
        </button>
      </div>
      <p className="mt-2 text-xs text-foreground-muted/70">
        Pra serviços feitos fora de uma reserva do app (ex: combinado por fora, dinheiro, pix direto).
      </p>
      {mutation.isError && <p className="mt-2 text-xs text-danger">Não foi possível lançar a receita. Tente novamente.</p>}
    </div>
  );
}

function IncomesList() {
  const queryClient = useQueryClient();
  const { data: incomes, isLoading } = useQuery({
    queryKey: ['incomes', 'mine'],
    queryFn: async () => (await api.get<Income[]>('/incomes/mine')).data,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['incomes', 'mine'] });
    queryClient.invalidateQueries({ queryKey: ['bookings', 'earnings'] });
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/incomes/${id}`),
    onSuccess: refresh,
  });

  return (
    <div className="mt-10">
      <h2 className="mb-3 flex items-center gap-1.5 font-display text-xl text-ink">
        <HandCoins size={18} className="text-foreground-muted" /> Receita lançada manualmente
      </h2>
      <div className="space-y-3">
        <AddIncomeForm onAdded={refresh} />
        {isLoading && <p className="text-sm text-foreground-muted">Carregando receitas...</p>}
        {!isLoading && incomes?.length === 0 && (
          <p className="text-sm text-foreground-muted">Nenhuma receita avulsa lançada ainda.</p>
        )}
        {incomes?.map((inc) => (
          <div key={inc.id} className="flex items-center justify-between border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">{inc.description}</p>
              <p className="text-xs text-foreground-muted">{new Date(inc.date).toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-success">+{formatMoney(inc.amount)}</span>
              <button
                onClick={() => deleteMutation.mutate(inc.id)}
                disabled={deleteMutation.isPending}
                className="text-foreground-muted hover:text-danger disabled:opacity-40"
                aria-label="Remover receita"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddExpenseForm({ onAdded }: { onAdded: () => void }) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [amount, setAmount] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  const mutation = useMutation({
    mutationFn: async () =>
      (await api.post('/expenses', { description, category, amount: Number(amount), isRecurring })).data,
    onSuccess: () => {
      setDescription('');
      setAmount('');
      setIsRecurring(false);
      setCategoryTouched(false);
      setCategory(EXPENSE_CATEGORIES[0]);
      onAdded();
    },
  });

  function handleDescriptionChange(value: string) {
    setDescription(value);
    if (!categoryTouched) setCategory(suggestExpenseCategory(value));
  }

  const inputClass =
    'w-full border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-ink placeholder:text-foreground-muted/50';

  return (
    <div className="border border-border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
          <Plus size={14} /> Lançar despesa
        </p>
        <ReceiptScanButton onExtracted={(value) => value !== null && setAmount(String(value))} />
      </div>
      <div className="grid gap-2.5 sm:grid-cols-[1.5fr_1fr_0.8fr_auto]">
        <input
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          className={inputClass}
          placeholder="Descrição"
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setCategoryTouched(true);
          }}
          className={inputClass}
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
          placeholder="R$ 0,00"
        />
        <button
          onClick={() => mutation.mutate()}
          disabled={!description.trim() || !amount || Number(amount) <= 0 || mutation.isPending}
          className="bg-ink px-4 py-2 text-sm font-medium text-background hover:opacity-85 disabled:opacity-40"
        >
          {mutation.isPending ? '...' : 'Lançar'}
        </button>
      </div>
      <label className="mt-3 flex w-fit items-center gap-2 text-xs text-foreground-muted">
        <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="accent-ink" />
        <Repeat size={12} /> Repetir todo mês automaticamente
      </label>
      {mutation.isError && <p className="mt-2 text-xs text-danger">Não foi possível lançar a despesa. Tente novamente.</p>}
    </div>
  );
}

function ExpensesList() {
  const queryClient = useQueryClient();
  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', 'mine'],
    queryFn: async () => (await api.get<Expense[]>('/expenses/mine')).data,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['expenses', 'mine'] });
    queryClient.invalidateQueries({ queryKey: ['bookings', 'earnings'] });
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: refresh,
  });

  return (
    <div className="mt-10">
      <h2 className="mb-3 flex items-center gap-1.5 font-display text-xl text-ink">
        <Receipt size={18} className="text-foreground-muted" /> Despesas
      </h2>
      <div className="space-y-3">
        <AddExpenseForm onAdded={refresh} />
        {isLoading && <p className="text-sm text-foreground-muted">Carregando despesas...</p>}
        {!isLoading && expenses?.length === 0 && (
          <p className="text-sm text-foreground-muted">Nenhuma despesa lançada ainda.</p>
        )}
        {expenses?.map((e) => (
          <div key={e.id} className="flex items-center justify-between border border-border px-4 py-3">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                {e.description}
                {(e.isRecurring || e.recurringParentId) && (
                  <span title="Despesa recorrente">
                    <Repeat size={11} className="text-accent" />
                  </span>
                )}
              </p>
              <p className="text-xs text-foreground-muted">
                {e.category} · {new Date(e.date).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-danger">-{formatMoney(e.amount)}</span>
              <button
                onClick={() => deleteMutation.mutate(e.id)}
                disabled={deleteMutation.isPending}
                className="text-foreground-muted hover:text-danger disabled:opacity-40"
                aria-label="Remover despesa"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FaturamentoPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'PRESTADOR') router.push('/');
  }, [token, user, router]);

  const { data: earnings, isLoading } = useQuery({
    queryKey: ['bookings', 'earnings'],
    enabled: !!token,
    queryFn: async () => (await api.get<Earnings>('/bookings/earnings')).data,
  });

  if (isLoading || !earnings) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-foreground-muted">Carregando faturamento...</div>;
  }

  const profitPositive = earnings.netProfitAllTime >= 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="flex items-center gap-2 font-display text-3xl text-ink">
        <Wallet size={26} className="text-accent" /> Faturamento
      </h1>
      <p className="mt-2 text-foreground-muted">Receita, despesas e lucro líquido para ajudar na gestão do seu negócio.</p>

      <div className="mt-4 flex items-start gap-2 border border-accent/30 bg-accent/5 p-4 text-sm text-foreground-muted">
        <Info size={15} className="mt-0.5 shrink-0 text-accent" />
        <p>
          A receita soma o que foi <strong className="text-ink">combinado</strong> nas reservas concluídas pelo app
          com o que você lança manualmente abaixo (serviços fechados por fora, por exemplo) — o app ainda não
          processa pagamento, então nada aqui é uma confirmação financeira auditada. Despesas também são lançadas
          manualmente.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 border border-border sm:grid-cols-4">
        <div className="border-r border-border p-5">
          <p className="font-display text-2xl text-ink">{formatMoney(earnings.currentMonthTotal)}</p>
          <p className="mt-1 text-xs text-foreground-muted">Receita este mês</p>
        </div>
        <div className="border-r border-border p-5 sm:border-r">
          <p className="font-display text-2xl text-danger">{formatMoney(earnings.currentMonthExpenses)}</p>
          <p className="mt-1 text-xs text-foreground-muted">Despesas este mês</p>
        </div>
        <div className="border-r border-border p-5">
          <p className={`font-display text-2xl ${profitPositive ? 'text-success' : 'text-danger'}`}>
            {formatMoney(earnings.netProfitCurrentMonth)}
          </p>
          <p className="mt-1 text-xs text-foreground-muted">Lucro líquido do mês</p>
        </div>
        <div className="p-5">
          <p className="font-display text-2xl text-ink">{formatMoney(earnings.avgTicket)}</p>
          <p className="mt-1 text-xs text-foreground-muted">Ticket médio</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 border border-border p-4 text-sm">
        <span className="flex items-center gap-1.5 text-foreground-muted">
          <TrendingUp size={14} className="text-ink" /> Receita acumulada: <strong className="text-ink">{formatMoney(earnings.totalAllTime)}</strong>
        </span>
        <span className="flex items-center gap-1.5 text-foreground-muted">
          <TrendingDown size={14} className="text-danger" /> Despesas acumuladas: <strong className="text-ink">{formatMoney(earnings.totalExpensesAllTime)}</strong>
        </span>
        <span className="flex items-center gap-1.5 text-foreground-muted">
          <Scale size={14} className={profitPositive ? 'text-success' : 'text-danger'} /> Lucro líquido acumulado:{' '}
          <strong className={profitPositive ? 'text-success' : 'text-danger'}>{formatMoney(earnings.netProfitAllTime)}</strong>
        </span>
      </div>

      <div className="mt-10">
        <h2 className="mb-3 flex items-center gap-1.5 font-display text-xl text-ink">
          <TrendingUp size={18} className="text-foreground-muted" /> Últimos 6 meses
        </h2>
        <EarningsChart months={earnings.months} />
        <p className="mt-2 text-xs text-foreground-muted">
          <span className="mr-1 inline-block h-2 w-2 bg-ink align-middle" /> Receita
          <span className="mr-1 ml-4 inline-block h-2 w-2 bg-danger/60 align-middle" /> Despesas
        </p>
      </div>

      <IncomesList />

      <ExpensesList />

      <div className="mt-10 flex items-center gap-2 text-sm text-foreground-muted">
        <Receipt size={15} />
        {earnings.totalServicesCompleted} serviço{earnings.totalServicesCompleted === 1 ? '' : 's'} concluído
        {earnings.totalServicesCompleted === 1 ? '' : 's'} no total desde que você começou.
      </div>
    </div>
  );
}
