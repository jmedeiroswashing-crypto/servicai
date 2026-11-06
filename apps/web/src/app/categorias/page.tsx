import type { Metadata } from 'next';
import { CategoryDirectory } from '@/components/CategoryDirectory';

export const metadata: Metadata = {
  title: 'Todas as categorias de serviços',
  description: 'Veja todas as categorias e encontre profissionais de reformas, casa, beleza, tecnologia, eventos e muito mais.',
  alternates: { canonical: '/categorias' },
};

export default function CategoriasPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
      <h1 className="font-display text-3xl text-ink">Todas as categorias</h1>
      <p className="mt-2 text-foreground-muted">Escolha um serviço para ver os profissionais disponíveis.</p>
      <CategoryDirectory />
    </div>
  );
}
