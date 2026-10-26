'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Lock, LockOpen, History, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { CashMovementType, CashRegister } from '@/lib/types';

const inputClass =
  'w-full border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-foreground-muted/50';

function formatMoney(v: number) {
  const sign = v < 0 ? '-' : '';
  return `${sign}R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function OpenRegisterForm({ onOpened }: { onOpened: () => void }) {
  const [amount, setAmount] = useState('');

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/cash-register/open', { openingAmount: Number(amount) })).data,
    onSuccess: onOpened,
  });

  return (
    <div className="border border-border p-6">
      <h2 className="flex items-center gap-1.5 font-medium text-ink">
        <LockOpen size={16} className="text-accent" /> Abrir o caixa de hoje
      </h2>
      <p className="mt-1 text-sm text-foreground-muted">Conte o troco que está começando o dia e abra o caixa.</p>
      <div className="mt-4 flex gap-2.5">
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
          placeholder="Troco inicial (R$)"
        />
        <button
          onClick={() => mutation.mutate()}
          disabled={!amount || Number(amount) < 0 || mutation.isPending}
          className="shrink-0 bg-ink px-5 py-2.5 text-sm font-medium text-background hover:opacity-85 disabled:opacity-40"
        >
          {mutation.isPending ? 'Abrindo...' : 'Abrir caixa'}
        </button>
      </div>
      {mutation.isError && <p className="mt-2 text-xs text-danger">Não foi possível abrir o caixa. Tente de novo.</p>}
    </div>
  );
}

function AddMovementForm({ onAdded }: { onAdded: () => void }) {
  const [type, setType] = useState<CashMovementType>('SANGRIA');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/cash-register/movement', { type, amount: Number(amount), reason })).data,
    onSuccess: () => {
      setAmount('');
      setReason('');
      onAdded();
    },
  });

  return (
    <div className="border border-border p-4">
      <p className="mb-3 text-sm font-medium text-ink">Tirar ou pôr dinheiro no caixa</p>
      <div className="grid gap-2.5 sm:grid-cols-[1fr_1fr_1.5fr_auto]">
        <select value={type} onChange={(e) => setType(e.target.value as CashMovementType)} className={inputClass}>
          <option value="SANGRIA">Tirar (sangria)</option>
          <option value="SUPRIMENTO">Pôr (suprimento)</option>
        </select>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
          placeholder="Valor (R$)"
        />
        <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} placeholder="Motivo" />
        <button
          onClick={() => mutation.mutate()}
          disabled={!amount || Number(amount) <= 0 || !reason.trim() || mutation.isPending}
          className="bg-ink px-4 py-2 text-sm font-medium text-background hover:opacity-85 disabled:opacity-40"
        >
          {mutation.isPending ? '...' : 'Registrar'}
        </button>
      </div>
      {mutation.isError && <p className="mt-2 text-xs text-danger">Não foi possível registrar. Tente de novo.</p>}
    </div>
  );
}

function CloseRegisterForm({ expected, onClosed }: { expected: number | null | undefined; onClosed: () => void }) {
  const [counted, setCounted] = useState('');

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/cash-register/close', { countedAmount: Number(counted) })).data,
    onSuccess: onClosed,
  });

  const diff = counted ? Number(counted) - (expected ?? 0) : null;

  return (
    <div className="border border-border p-4">
      <p className="mb-1 text-sm font-medium text-ink">Fechar o caixa</p>
      <p className="mb-3 text-xs text-foreground-muted">
        Esperado (estimado): <strong className="text-ink">{formatMoney(expected ?? 0)}</strong>
      </p>
      <div className="flex gap-2.5">
        <input
          type="number"
          min="0"
          step="0.01"
          value={counted}
          onChange={(e) => setCounted(e.target.value)}
          className={inputClass}
          placeholder="Quanto você contou na gaveta (R$)"
        />
        <button
          onClick={() => mutation.mutate()}
          disabled={!counted || Number(counted) < 0 || mutation.isPending}
          className="shrink-0 border border-ink px-4 py-2.5 text-sm font-medium text-ink hover:bg-ink hover:text-background disabled:opacity-40"
        >
          {mutation.isPending ? '...' : 'Fechar caixa'}
        </button>
      </div>
      {diff !== null && (
        <p className={`mt-2 text-sm font-medium ${Math.abs(diff) < 0.01 ? 'text-success' : 'text-danger'}`}>
          Diferença: {formatMoney(diff)}
        </p>
      )}
    </div>
  );
}

function MovementRow({ movement }: { movement: CashRegister['movements'][number] }) {
  const isOut = movement.type === 'SANGRIA';
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0">
      <div className="flex items-center gap-2">
        {isOut ? (
          <ArrowUpCircle size={15} className="text-danger" />
        ) : (
          <ArrowDownCircle size={15} className="text-success" />
        )}
        <span className="text-sm text-ink">{movement.reason}</span>
      </div>
      <span className={`text-sm font-medium ${isOut ? 'text-danger' : 'text-success'}`}>
        {isOut ? '-' : '+'}
        {formatMoney(movement.amount)}
      </span>
    </div>
  );
}

export default function CaixaPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'PRESTADOR') router.push('/');
  }, [token, user, router]);

  const { data: register, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['cash-register', 'today'],
    enabled: !!token,
    queryFn: async () => (await api.get<CashRegister | null>('/cash-register/today')).data,
  });

  const { data: history } = useQuery({
    queryKey: ['cash-register', 'history'],
    enabled: !!token,
    queryFn: async () => (await api.get<CashRegister[]>('/cash-register/history')).data,
  });

  const reopenMutation = useMutation({
    mutationFn: async () => (await api.post('/cash-register/reopen')).data,
    onSuccess: refresh,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['cash-register'] });
  }

  if (isError) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-foreground-muted">
          Não foi possível carregar o caixa{status ? ` (erro ${status})` : ''}. Verifique sua conexão e tente de novo.
        </p>
        <button onClick={() => refetch()} className="mt-4 border border-ink px-4 py-2 text-sm font-medium text-ink hover:bg-ink hover:text-background">
          Tentar novamente
        </button>
      </div>
    );
  }

  if (isLoading) {
    return <div className="mx-auto max-w-2xl px-4 py-20 text-foreground-muted">Carregando caixa...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="flex items-center gap-2 font-display text-3xl text-ink">
        <Wallet size={26} className="text-accent" /> Caixa do dia
      </h1>
      <p className="mt-2 text-foreground-muted">Abra com o troco, registre o que entra e sai, e feche conferindo o esperado.</p>

      <div className="mt-4 flex items-start gap-2 border border-accent/30 bg-accent/5 p-4 text-sm text-foreground-muted">
        <Info size={15} className="mt-0.5 shrink-0 text-accent" />
        <p>
          O &ldquo;esperado&rdquo; é uma estimativa (troco + receita lançada hoje + suprimentos − sangrias − despesas de hoje) —
          o ServiçAi não distingue dinheiro de Pix/cartão em cada lançamento.
        </p>
      </div>

      <div className="mt-8">
        {!register && <OpenRegisterForm onOpened={refresh} />}

        {register && !register.closedAt && (
          <div className="space-y-4">
            <div className="border border-border p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Troco de abertura</span>
                <span className="font-medium text-ink">{formatMoney(register.openingAmount)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Esperado agora</span>
                <span className="font-medium text-ink">{formatMoney(register.expectedAmount ?? 0)}</span>
              </div>
            </div>

            <AddMovementForm onAdded={refresh} />

            {register.movements.length > 0 && (
              <div className="border border-border p-4">
                <p className="mb-2 text-sm font-medium text-ink">Movimentos de hoje</p>
                {register.movements.map((m) => (
                  <MovementRow key={m.id} movement={m} />
                ))}
              </div>
            )}

            <CloseRegisterForm expected={register.expectedAmount} onClosed={refresh} />
          </div>
        )}

        {register && register.closedAt && (
          <div className="border border-success/40 bg-success/5 p-5">
            <p className="flex items-center gap-1.5 font-medium text-ink">
              <Lock size={15} className="text-success" /> Caixa de hoje fechado
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-foreground-muted">Esperado</p>
                <p className="font-medium text-ink">{formatMoney(register.expectedAmount ?? 0)}</p>
              </div>
              <div>
                <p className="text-foreground-muted">Contado</p>
                <p className="font-medium text-ink">{formatMoney(register.closingCountedAmount ?? 0)}</p>
              </div>
              <div>
                <p className="text-foreground-muted">Diferença</p>
                <p className="font-medium text-ink">
                  {formatMoney((register.closingCountedAmount ?? 0) - (register.expectedAmount ?? 0))}
                </p>
              </div>
            </div>
            <button
              onClick={() => reopenMutation.mutate()}
              disabled={reopenMutation.isPending}
              className="mt-4 flex items-center gap-1.5 text-xs font-medium text-accent hover:underline disabled:opacity-40"
            >
              <LockOpen size={12} /> Reabrir caixa
            </button>
          </div>
        )}
      </div>

      {history && history.length > 1 && (
        <div className="mt-12">
          <h2 className="mb-3 flex items-center gap-1.5 font-display text-xl text-ink">
            <History size={18} className="text-foreground-muted" /> Fechamentos anteriores
          </h2>
          <div className="divide-y divide-border border-t border-border">
            {history
              .filter((h) => h.closedAt)
              .map((h) => (
                <div key={h.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-ink">{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                  <span className="text-foreground-muted">
                    Abriu com {formatMoney(h.openingAmount)} · Fechou com {formatMoney(h.closingCountedAmount ?? 0)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
