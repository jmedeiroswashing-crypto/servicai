import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Planos para prestadores',
  description: 'Compare os planos do ServiçAi e escolha o melhor para conseguir clientes e organizar seu negócio.',
  alternates: { canonical: '/precos' },
};

export default function PrecosLayout({ children }: { children: ReactNode }) {
  return children;
}
