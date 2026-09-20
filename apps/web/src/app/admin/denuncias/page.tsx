'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag, User, Package, Star, Wrench } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { Report, ReportStatus, ReportTargetType } from '@/lib/types';

const REASON_LABEL: Record<string, string> = {
  SPAM: 'Spam ou propaganda indevida',
  GOLPE_FRAUDE: 'Golpe ou fraude',
  CONTEUDO_INAPROPRIADO: 'Conteúdo inapropriado',
  ASSEDIO: 'Assédio ou comportamento abusivo',
  OUTRO: 'Outro motivo',
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em análise',
  RESOLVIDO: 'Resolvido',
  REJEITADO: 'Rejeitado',
};

const TARGET_ICON: Record<ReportTargetType, typeof User> = {
  USUARIO: User,
  PRODUTO: Package,
  AVALIACAO: Star,
  SERVICO: Wrench,
};

function ReportRow({ report }: { report: Report }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const Icon = TARGET_ICON[report.targetType];

  const mutation = useMutation({
    mutationFn: async (status: ReportStatus) =>
      (await api.patch(`/reports/${report.id}/resolve`, { status, resolutionNote: note || undefined })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });

  return (
    <div className="border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <Icon size={14} className="text-foreground-muted" />
            {report.targetType} · {REASON_LABEL[report.reason] ?? report.reason}
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            Denunciado por {report.reporter?.name ?? 'usuário'} ({report.reporter?.email}) em{' '}
            {new Date(report.createdAt).toLocaleString('pt-BR')}
          </p>
          <p className="mt-1 text-xs text-foreground-muted">ID do alvo: {report.targetId}</p>
          {report.details && <p className="mt-2 text-sm text-ink">{report.details}</p>}
        </div>
        <span
          className={`shrink-0 border px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${
            report.status === 'PENDENTE'
              ? 'border-warning/40 text-warning'
              : report.status === 'RESOLVIDO'
                ? 'border-success/40 text-success'
                : report.status === 'REJEITADO'
                  ? 'border-danger/40 text-danger'
                  : 'border-border text-foreground-muted'
          }`}
        >
          {STATUS_LABEL[report.status]}
        </span>
      </div>

      {report.status === 'PENDENTE' || report.status === 'EM_ANALISE' ? (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota de resolução (opcional)"
            className="w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-ink"
          />
          <div className="flex flex-wrap gap-2">
            {report.status === 'PENDENTE' && (
              <button
                onClick={() => mutation.mutate('EM_ANALISE')}
                disabled={mutation.isPending}
                className="border border-border px-3 py-1.5 text-xs font-medium hover:border-ink disabled:opacity-50"
              >
                Marcar em análise
              </button>
            )}
            <button
              onClick={() => mutation.mutate('RESOLVIDO')}
              disabled={mutation.isPending}
              className="border border-success/40 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/10 disabled:opacity-50"
            >
              Resolver
            </button>
            <button
              onClick={() => mutation.mutate('REJEITADO')}
              disabled={mutation.isPending}
              className="border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
            >
              Rejeitar
            </button>
          </div>
        </div>
      ) : (
        report.resolutionNote && (
          <p className="mt-3 border-t border-border pt-3 text-xs text-foreground-muted">
            Nota: {report.resolutionNote} — por {report.resolvedBy?.name ?? '—'}
          </p>
        )
      )}
    </div>
  );
}

export default function AdminDenunciasPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [filter, setFilter] = useState<ReportStatus | 'TODAS'>('PENDENTE');

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'ADMIN') router.push('/');
  }, [token, user, router]);

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports', filter],
    enabled: !!token && user?.role === 'ADMIN',
    queryFn: async () =>
      (await api.get<Report[]>('/reports', { params: filter === 'TODAS' ? {} : { status: filter } })).data,
  });

  if (user?.role !== 'ADMIN') {
    return <div className="mx-auto max-w-4xl px-4 py-20 text-foreground-muted">Carregando...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="flex items-center gap-2 font-display text-3xl text-ink">
        <Flag size={26} /> Denúncias
      </h1>
      <p className="mt-2 text-foreground-muted">Modere conteúdo e usuários denunciados por outros usuários.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {(['PENDENTE', 'EM_ANALISE', 'RESOLVIDO', 'REJEITADO', 'TODAS'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`border px-3 py-1.5 text-xs font-medium ${
              filter === s ? 'border-ink bg-ink text-background' : 'border-border text-foreground-muted hover:border-ink'
            }`}
          >
            {s === 'TODAS' ? 'Todas' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-foreground-muted">Carregando denúncias...</p>}
        {!isLoading && reports?.length === 0 && (
          <p className="text-foreground-muted">Nenhuma denúncia {filter !== 'TODAS' ? 'nesse status' : ''} por aqui.</p>
        )}
        {reports?.map((r) => <ReportRow key={r.id} report={r} />)}
      </div>
    </div>
  );
}
