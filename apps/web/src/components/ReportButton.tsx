'use client';

import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import type { ReportReason, ReportTargetType } from '@/lib/types';

const REASON_LABEL: Record<ReportReason, string> = {
  SPAM: 'Spam ou propaganda indevida',
  GOLPE_FRAUDE: 'Golpe ou fraude',
  CONTEUDO_INAPROPRIADO: 'Conteúdo inapropriado',
  ASSEDIO: 'Assédio ou comportamento abusivo',
  OUTRO: 'Outro motivo',
};

export function ReportButton({
  targetType,
  targetId,
  label = 'Denunciar',
  className = 'flex items-center gap-1.5 text-xs text-foreground-muted hover:text-danger',
}: {
  targetType: ReportTargetType;
  targetId: string;
  label?: string;
  className?: string;
}) {
  const { token } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('SPAM');
  const [details, setDetails] = useState('');

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/reports', { targetType, targetId, reason, details: details || undefined })).data,
    onSuccess: () => {
      setTimeout(() => setOpen(false), 1500);
    },
  });

  if (!token) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Flag size={13} /> {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm border border-border bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg text-ink">
                <Flag size={16} /> Denunciar
              </h2>
              <button onClick={() => setOpen(false)} className="text-foreground-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>

            {mutation.isSuccess ? (
              <p className="text-sm text-success">Denúncia enviada. Nossa equipe vai analisar.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground-muted">Motivo</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ReportReason)}
                    className="w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-ink"
                  >
                    {Object.entries(REASON_LABEL).map(([value, text]) => (
                      <option key={value} value={value}>
                        {text}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground-muted">Detalhes (opcional)</label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    className="w-full resize-none border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-ink"
                    placeholder="Descreva o que aconteceu"
                  />
                </div>
                {mutation.isError && <p className="text-xs text-danger">Não foi possível enviar a denúncia. Tente novamente.</p>}
                <button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                  className="w-full bg-ink py-2.5 text-sm font-medium text-background hover:opacity-85 disabled:opacity-50"
                >
                  {mutation.isPending ? 'Enviando...' : 'Enviar denúncia'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
