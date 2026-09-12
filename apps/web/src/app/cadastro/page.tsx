'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import type { Role } from '@/lib/types';

function CadastroContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role: Role = searchParams.get('tipo') === 'PRESTADOR' ? 'PRESTADOR' : 'CLIENTE';

  return (
    <div className="px-4 py-16">
      <AuthForm role={role} initialMode="cadastro" onBack={() => router.push('/')} />
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
