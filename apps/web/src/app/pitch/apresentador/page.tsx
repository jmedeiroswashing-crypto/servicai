import type { Metadata } from 'next';
import { Apresentador } from '@/pitch/componentes/Apresentador';

export const metadata: Metadata = { title: 'Apresentador' };

/** Janela do apresentador: fala atual, cronômetro e controles, sincronizada com /pitch. */
export default function ApresentadorPage() {
  return <Apresentador />;
}
