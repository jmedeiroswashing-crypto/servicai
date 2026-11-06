'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthForm } from './AuthForm';
import { MinimalLogo } from './MinimalLogo';
import { safeNext, withNext } from '@/lib/redirect';
import type { Role } from '@/lib/types';

function Door({ role }: { role: Role }) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));

  return (
    <div className="px-4 py-16">
      <div className="mx-auto w-full max-w-md">
        <MinimalLogo />
      </div>
      <AuthForm role={role} mode="login" next={next} onBack={() => router.push(withNext('/login', next))} />
    </div>
  );
}

/** Página de login de um tipo de conta. As duas portas usam a mesma API. */
export function LoginDoor({ role }: { role: Role }) {
  return (
    <Suspense fallback={null}>
      <Door role={role} />
    </Suspense>
  );
}
