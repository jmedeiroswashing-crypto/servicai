'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Wrench } from 'lucide-react';
import { repairApi } from '@/lib/repair-api';
import { REPAIR_STATUS_LABEL, REPAIR_STATUS_ORDER } from '@/lib/repair-status';
import type { PublicRepairTracking } from '@/lib/types';

function AcompanharConsertoContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['repair', 'track', token],
    enabled: !!token,
    queryFn: async () => (await repairApi.get<PublicRepairTracking>(`/repair/devices/track/${token}`)).data,
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md border border-border bg-surface p-8">
        <div className="mb-6 flex items-center gap-2">
          <Wrench size={20} className="text-accent" />
          <span className="font-display text-xl text-ink">Acompanhamento</span>
        </div>

        {!token && <p className="text-sm text-danger">Link inválido.</p>}
        {isLoading && <p className="text-sm text-foreground-muted">Carregando...</p>}
        {isError && <p className="text-sm text-danger">Não encontramos esse acompanhamento. Confira o link.</p>}

        {data && (
          <div>
            <p className="text-sm text-foreground-muted">{data.shop.name}</p>
            <h1 className="font-display mt-1 text-2xl text-ink">{data.deviceModel}</h1>
            <p className="mt-1 text-sm text-foreground-muted">{data.defect}</p>

            {data.budgetValue != null && (
              <p className="mt-3 text-sm text-ink">
                Orçamento: <span className="font-medium">R$ {data.budgetValue.toFixed(2).replace('.', ',')}</span>
              </p>
            )}

            <div className="mt-6 space-y-3">
              {REPAIR_STATUS_ORDER.map((status, i) => {
                const currentIndex = REPAIR_STATUS_ORDER.indexOf(data.status);
                const done = i < currentIndex;
                const active = i === currentIndex;
                return (
                  <div key={status} className="flex items-center gap-3">
                    {done || active ? (
                      <CheckCircle2 size={18} className={active ? 'text-accent' : 'text-success'} />
                    ) : (
                      <Clock3 size={18} className="text-foreground-muted/40" />
                    )}
                    <span className={`text-sm ${active ? 'font-medium text-ink' : done ? 'text-foreground-muted' : 'text-foreground-muted/50'}`}>
                      {REPAIR_STATUS_LABEL[status]}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-xs text-foreground-muted">
              Atualizado em {new Date(data.updatedAt).toLocaleString('pt-BR')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcompanharConsertoPage() {
  return (
    <Suspense fallback={null}>
      <AcompanharConsertoContent />
    </Suspense>
  );
}
