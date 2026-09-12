'use client';

import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';

export default function LoginPage() {
  const router = useRouter();
  return (
    <div className="px-4 py-16">
      <AuthForm role="CLIENTE" initialMode="login" onBack={() => router.push('/')} />
    </div>
  );
}
