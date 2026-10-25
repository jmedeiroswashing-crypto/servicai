'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wrench } from 'lucide-react';
import { repairApi } from '@/lib/repair-api';
import { useRepairAuthStore } from '@/store/repair-auth-store';
import { PasswordInput } from '@/components/PasswordInput';

const inputClass =
  'w-full border border-border bg-transparent px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink placeholder:text-foreground-muted/50';
const labelClass = 'mb-1.5 block text-xs font-medium text-foreground-muted';

export default function ConsertoLoginPage() {
  const router = useRouter();
  const setAuth = useRepairAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await repairApi.post('/repair/auth/login', { email, password });
      setAuth(res.data.accessToken, res.data.shop);
      router.push('/conserto');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Credenciais inválidas.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm border border-border bg-surface p-8">
        <div className="mb-6 flex items-center gap-2">
          <Wrench size={20} className="text-accent" />
          <span className="font-display text-xl text-ink">Conserto</span>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>E-mail da loja</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Senha</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-foreground-muted">
          Sua loja ainda não tem conta?{' '}
          <Link href="/conserto/cadastro" className="font-medium text-accent hover:underline">
            Cadastrar
          </Link>
        </p>
      </div>
    </div>
  );
}
