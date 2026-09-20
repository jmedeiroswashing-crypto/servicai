'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

function VerificarEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    api
      .post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="px-4 py-16">
      <div className="mx-auto w-full max-w-md border border-border bg-surface p-8 text-center sm:p-10">
        {status === 'loading' && (
          <>
            <Loader2 size={28} className="mx-auto animate-spin text-foreground-muted" />
            <p className="mt-4 text-sm text-foreground-muted">Confirmando seu e-mail...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 size={28} className="mx-auto text-success" />
            <h1 className="font-display mt-4 text-xl text-ink">E-mail confirmado!</h1>
            <p className="mt-2 text-sm text-foreground-muted">Sua conta agora está verificada.</p>
            <Link href="/perfil" className="mt-5 inline-block text-sm text-accent hover:underline">
              Ir para meu perfil
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={28} className="mx-auto text-danger" />
            <h1 className="font-display mt-4 text-xl text-ink">Link inválido ou expirado</h1>
            <p className="mt-2 text-sm text-foreground-muted">
              Faça login e solicite um novo link de verificação no seu perfil.
            </p>
            <Link href="/login" className="mt-5 inline-block text-sm text-accent hover:underline">
              Ir para o login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerificarEmailContent />
    </Suspense>
  );
}
