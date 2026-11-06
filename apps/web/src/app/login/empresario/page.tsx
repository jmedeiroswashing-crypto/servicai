import type { Metadata } from 'next';
import { LoginDoor } from '@/components/LoginDoor';

export const metadata: Metadata = {
  title: 'Entrar como empresário',
  description: 'Acesse sua conta de profissional autônomo ou empresa no ServiçAi.',
};

export default function LoginEmpresarioPage() {
  return <LoginDoor role="PRESTADOR" />;
}
