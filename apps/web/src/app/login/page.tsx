'use client';

import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { MinimalLogo } from '@/components/MinimalLogo';

export default function LoginPage() {
  const router = useRouter();
  return (
    <div className="px-4 py-16">
      <div className="mx-auto w-full max-w-md">
        <MinimalLogo />
      </div>
      <AuthForm role="CLIENTE" initialMode="login" onBack={() => router.push('/')} />
    </div>
  );
}
