import type { Metadata } from 'next';
import { PainelShell } from '@/components/painel/PainelShell';
import './escala.css';

export const metadata: Metadata = {
  title: 'Painel',
  robots: { index: false },
};

export default function PainelLayout({ children }: LayoutProps<'/painel'>) {
  return <PainelShell>{children}</PainelShell>;
}
