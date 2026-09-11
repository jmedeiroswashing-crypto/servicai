'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { UserPlus, Briefcase, User } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

const schema = z.object({
  name: z.string().min(2, 'Informe seu nome completo'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo de 6 caracteres'),
  city: z.string().min(2, 'Informe sua cidade'),
});

type FormData = z.infer<typeof schema>;

function CadastroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [role, setRole] = useState<'CLIENTE' | 'PRESTADOR'>(
    searchParams.get('tipo') === 'PRESTADOR' ? 'PRESTADOR' : 'CLIENTE',
  );
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      const res = await api.post('/auth/register', { ...data, role });
      setAuth(res.data.accessToken, res.data.user);
      router.push(role === 'PRESTADOR' ? '/painel' : '/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Não foi possível criar sua conta.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border bg-surface p-8"
      >
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl gradient-brand text-white">
            <UserPlus size={18} />
          </span>
          <h1 className="text-xl font-bold">Criar conta</h1>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-full bg-surface-muted p-1">
          <button
            type="button"
            onClick={() => setRole('CLIENTE')}
            className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors ${
              role === 'CLIENTE' ? 'gradient-brand text-white' : 'text-foreground/60'
            }`}
          >
            <User size={14} /> Sou cliente
          </button>
          <button
            type="button"
            onClick={() => setRole('PRESTADOR')}
            className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors ${
              role === 'PRESTADOR' ? 'gradient-brand text-white' : 'text-foreground/60'
            }`}
          >
            <Briefcase size={14} /> Sou prestador
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nome completo</label>
            <input
              {...register('name')}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-brand"
              placeholder="Seu nome"
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <input
              {...register('email')}
              type="email"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-brand"
              placeholder="voce@email.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Cidade</label>
            <input
              {...register('city')}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-brand"
              placeholder="São Paulo"
            />
            {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Senha</label>
            <input
              {...register('password')}
              type="password"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 outline-none focus:border-brand"
              placeholder="Mínimo 6 caracteres"
            />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full gradient-brand py-2.5 font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {isSubmitting ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/60">
          Já tem conta?{' '}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Entrar
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={null}>
      <CadastroForm />
    </Suspense>
  );
}
