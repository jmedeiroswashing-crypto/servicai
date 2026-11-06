import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Buscar profissionais',
  description: 'Busque profissionais por serviço e cidade, compare avaliações e peça orçamentos grátis.',
  alternates: { canonical: '/buscar' },
};

export default function BuscarLayout({ children }: { children: ReactNode }) {
  return children;
}
