'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { AuthenticatedImage } from '@/components/AuthenticatedImage';
import type { IdentityVerification } from '@/lib/types';

function PendingRow({ item }: { item: IdentityVerification }) {
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (approve: boolean) =>
      (await api.patch(`/identity/${item.id}/review`, { approve, rejectionReason: approve ? undefined : rejectionReason || undefined }))
        .data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['identity', 'pending'] }),
  });

  return (
    <div className="border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink">{item.name}</p>
          <p className="text-xs text-foreground-muted">{item.email}</p>
          {item.identitySubmittedAt && (
            <p className="mt-1 text-xs text-foreground-muted">
              Enviado em {new Date(item.identitySubmittedAt).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      </div>

      {item.identityDocumentUrl && (
        <AuthenticatedImage
          src={`/identity/document/${item.id}`}
          alt={`Documento de ${item.name}`}
          className="mt-3 h-64 max-w-full border border-border object-contain"
        />
      )}

      {mutation.isError && <p className="mt-2 text-xs text-danger">Não foi possível concluir. Tente novamente.</p>}

      {!rejecting ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => mutation.mutate(true)}
            disabled={mutation.isPending}
            className="border border-success/40 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/10 disabled:opacity-50"
          >
            Aprovar
          </button>
          <button
            onClick={() => setRejecting(true)}
            disabled={mutation.isPending}
            className="border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            Rejeitar
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <input
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Motivo da rejeição (ex: foto ilegível, documento vencido)"
            className="w-full border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-ink"
          />
          <div className="flex gap-2">
            <button
              onClick={() => mutation.mutate(false)}
              disabled={mutation.isPending}
              className="border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
            >
              {mutation.isPending ? 'Enviando...' : 'Confirmar rejeição'}
            </button>
            <button onClick={() => setRejecting(false)} className="px-3 py-1.5 text-xs text-foreground-muted hover:text-ink">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminIdentidadePage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.push('/login');
    else if (user && user.role !== 'ADMIN') router.push('/');
  }, [token, user, router]);

  const { data: pending, isLoading } = useQuery({
    queryKey: ['identity', 'pending'],
    enabled: !!token && user?.role === 'ADMIN',
    queryFn: async () => (await api.get<IdentityVerification[]>('/identity/pending')).data,
  });

  if (user?.role !== 'ADMIN') {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-foreground-muted">Carregando...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="flex items-center gap-2 font-display text-3xl text-ink">
        <ShieldCheck size={26} /> Verificação de identidade
      </h1>
      <p className="mt-2 text-foreground-muted">Revise os documentos enviados por prestadores para liberar o selo de identidade verificada.</p>

      <div className="mt-8 space-y-4">
        {isLoading && <p className="text-foreground-muted">Carregando pendências...</p>}
        {!isLoading && pending?.length === 0 && <p className="text-foreground-muted">Nenhuma verificação pendente no momento.</p>}
        {pending?.map((item) => (
          <PendingRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
