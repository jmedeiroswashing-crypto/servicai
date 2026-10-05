'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { LifeBuoy, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

const inputClass =
  'w-full border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-foreground-muted/50';

export default function AjudaPage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/support/contact', { subject, message })).data,
    onSuccess: () => {
      setSubject('');
      setMessage('');
    },
  });

  if (!token) return null;

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="flex items-center gap-2 font-display text-3xl text-ink">
        <LifeBuoy size={26} /> Central de ajuda
      </h1>
      <p className="mt-2 text-foreground-muted">
        Teve um problema, encontrou um bug ou tem uma dúvida? Mande uma mensagem e nossa equipe responde pelo seu e-mail cadastrado.
      </p>

      {mutation.isSuccess ? (
        <div className="mt-8 border border-success/30 bg-success/5 p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <CheckCircle2 size={16} className="text-success" /> Mensagem enviada. Vamos responder o quanto antes.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground-muted">Assunto</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputClass}
              placeholder="Ex: Problema ao enviar avaliação"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground-muted">Mensagem</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className={inputClass}
              placeholder="Descreva o que aconteceu com o máximo de detalhes possível"
            />
          </div>
          {mutation.isError && (
            <p className="text-sm text-danger">
              {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Não foi possível enviar sua mensagem. Tente novamente.'}
            </p>
          )}
          <button
            onClick={() => mutation.mutate()}
            disabled={subject.trim().length < 3 || message.trim().length < 5 || mutation.isPending}
            className="bg-ink px-5 py-2.5 text-sm font-medium text-background hover:opacity-85 disabled:opacity-40"
          >
            {mutation.isPending ? 'Enviando...' : 'Enviar mensagem'}
          </button>
        </div>
      )}
    </div>
  );
}
