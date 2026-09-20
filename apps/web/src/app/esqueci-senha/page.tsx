'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail } from 'lucide-react';
import { api } from '@/lib/api';

const inputClass =
  'w-full border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-foreground-muted/50';

export default function EsqueciSenhaPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError('Não foi possível processar o pedido. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-16">
      <div className="mx-auto w-full max-w-md border border-border bg-surface p-8 sm:p-10">
        <button
          onClick={() => router.push('/login')}
          className="mb-8 flex items-center gap-1.5 text-sm text-foreground-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Voltar
        </button>

        <h1 className="font-display mb-2 text-2xl text-ink">Recuperar senha</h1>

        {sent ? (
          <div className="mt-6 border border-success/30 bg-success/5 p-4">
            <p className="flex items-center gap-2 text-sm text-ink">
              <Mail size={15} className="text-success" /> Se este e-mail estiver cadastrado, enviamos um link de
              redefinição para ele.
            </p>
            <p className="mt-2 text-xs text-foreground-muted">O link expira em 1 hora.</p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-foreground-muted">
              Informe seu e-mail cadastrado. Vamos enviar um link para você redefinir sua senha.
            </p>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground-muted">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="Ex: voce@email.com"
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ink py-3 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-xs text-foreground-muted">
          Lembrou a senha?{' '}
          <Link href="/login" className="text-accent hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
