'use client';

import { useState } from 'react';
import { ChevronDown, Scale } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { ReportButton } from './ReportButton';
import type { Report, ReportReason, BookingStatus } from '@/lib/types';

const DISPUTE_REASONS: ReportReason[] = ['SERVICO_NAO_CONFORME', 'GOLPE_FRAUDE', 'OUTRO'];
const DISPUTABLE_STATUSES: BookingStatus[] = ['EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'];

const REASON_LABEL: Record<string, string> = {
  SERVICO_NAO_CONFORME: 'Serviço não realizado conforme combinado',
  GOLPE_FRAUDE: 'Golpe ou fraude',
  OUTRO: 'Outro motivo',
};

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: 'Aguardando resposta',
  EM_ANALISE: 'Em análise pela equipe',
  RESOLVIDO: 'Resolvida',
  REJEITADO: 'Rejeitada',
};

function RespondForm({ reportId }: { reportId: string }) {
  const queryClient = useQueryClient();
  const [statement, setStatement] = useState('');

  const mutation = useMutation({
    mutationFn: async () => (await api.patch(`/reports/${reportId}/respond`, { statement })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports', 'booking'] }),
  });

  if (mutation.isSuccess) {
    return <p className="mt-2 text-xs text-success">Sua resposta foi enviada e a disputa está em análise.</p>;
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Conte sua versão do que aconteceu"
        className="w-full resize-none border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-ink"
      />
      {mutation.isError && <p className="text-xs text-danger">Não foi possível enviar sua resposta. Tente novamente.</p>}
      <button
        onClick={() => mutation.mutate()}
        disabled={!statement.trim() || mutation.isPending}
        className="border border-ink px-3 py-1.5 text-xs font-medium text-ink hover:bg-ink hover:text-background disabled:opacity-40"
      >
        {mutation.isPending ? 'Enviando...' : 'Responder à disputa'}
      </button>
    </div>
  );
}

function DisputeItem({ report, userId }: { report: Report; userId?: string }) {
  const isOpen = report.status === 'PENDENTE' || report.status === 'EM_ANALISE';
  const canRespond = isOpen && !report.respondentId && report.reporter?.id !== userId;

  return (
    <div className="border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink">{REASON_LABEL[report.reason] ?? report.reason}</p>
        <span
          className={`shrink-0 border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
            report.status === 'RESOLVIDO'
              ? 'border-success/40 text-success'
              : report.status === 'REJEITADO'
                ? 'border-danger/40 text-danger'
                : 'border-warning/40 text-warning'
          }`}
        >
          {STATUS_LABEL[report.status]}
        </span>
      </div>
      <p className="mt-1 text-xs text-foreground-muted">Aberta por {report.reporter?.name ?? 'alguém'}</p>
      {report.details && <p className="mt-1.5 text-sm text-ink">{report.details}</p>}
      {report.respondentStatement && (
        <p className="mt-1.5 border-l-2 border-border pl-2 text-sm text-ink">
          Resposta de {report.respondent?.name ?? 'outra parte'}: {report.respondentStatement}
        </p>
      )}
      {report.resolutionNote && (
        <p className="mt-1.5 text-xs text-foreground-muted">Decisão da equipe: {report.resolutionNote}</p>
      )}
      {canRespond && <RespondForm reportId={report.id} />}
    </div>
  );
}

export function BookingDisputeSection({ bookingId, bookingStatus }: { bookingId: string; bookingStatus: BookingStatus }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const { data: disputes, isLoading } = useQuery({
    queryKey: ['reports', 'booking', bookingId],
    enabled: expanded,
    queryFn: async () => (await api.get<Report[]>(`/reports/booking/${bookingId}`)).data,
  });

  if (!DISPUTABLE_STATUSES.includes(bookingStatus)) return null;

  const hasOpenDispute = disputes?.some((d) => d.status === 'PENDENTE' || d.status === 'EM_ANALISE');

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-foreground-muted hover:text-ink"
      >
        <Scale size={13} />
        Disputas
        <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {isLoading && <p className="text-xs text-foreground-muted">Carregando...</p>}
          {disputes?.map((d) => (
            <DisputeItem key={d.id} report={d} userId={user?.id} />
          ))}
          {!isLoading && !hasOpenDispute && (
            <ReportButton
              targetType="RESERVA"
              targetId={bookingId}
              reasons={DISPUTE_REASONS}
              label="Abrir disputa sobre esta reserva"
              title="Abrir disputa"
              detailsPlaceholder="Explique o que não saiu como combinado"
              submitLabel="Abrir disputa"
              successMessage="Disputa registrada. A outra parte poderá responder e nossa equipe vai analisar."
              className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-medium text-foreground-muted hover:border-danger hover:text-danger"
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ['reports', 'booking', bookingId] })}
            />
          )}
        </div>
      )}
    </div>
  );
}
