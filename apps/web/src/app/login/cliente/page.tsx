import type { Metadata } from 'next';
import { LoginDoor } from '@/components/LoginDoor';

export const metadata: Metadata = {
  title: 'Entrar como cliente',
  description: 'Acesse sua conta de cliente no ServiçAi.',
};

export default function LoginClientePage() {
  return <LoginDoor role="CLIENTE" />;
}
