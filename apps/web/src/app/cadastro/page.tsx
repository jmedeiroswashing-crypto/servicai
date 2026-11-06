'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { MinimalLogo } from '@/components/MinimalLogo';
import { safeNext, withNext } from '@/lib/redirect';
import type { BusinessMode, Role } from '@/lib/types';

function CadastroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role: Role = searchParams.get('tipo') === 'PRESTADOR' ? 'PRESTADOR' : 'CLIENTE';
  const modoParam = searchParams.get('modo');
  const businessMode: BusinessMode | undefined =
    modoParam === 'GESTAO' || modoParam === 'COMPLETO' || modoParam === 'CONTRATACAO' ? modoParam : undefined;
  const next = safeNext(searchParams.get('next'));

  return (
    <div className="px-4 py-16">
      <div className="mx-auto w-full max-w-md">
        <MinimalLogo />
      </div>
      <AuthForm
        role={role}
        mode="cadastro"
        initialBusinessMode={businessMode}
        next={next}
        onBack={() => router.push(withNext(role === 'PRESTADOR' ? '/comecar?tipo=empresario' : '/comecar', next))}
      />
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={null}>
      <CadastroContent />
    </Suspense>
  );
}
