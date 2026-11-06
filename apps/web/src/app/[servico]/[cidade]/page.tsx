import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ServiceCityResults } from '@/components/ServiceCityResults';
import { allServiceCityParams, findServiceCity } from '@/lib/seo-pages';

// Export estático: só existem as combinações listadas em seo-pages.ts.
export const dynamicParams = false;

type Props = { params: Promise<{ servico: string; cidade: string }> };

export function generateStaticParams() {
  return allServiceCityParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { servico, cidade } = await params;
  const match = findServiceCity(servico, cidade);
  if (!match) return {};
  const title = `${match.service.label} em ${match.city.name}`;
  const description = `Encontre ${match.service.label.toLowerCase()} em ${match.city.name}, receba propostas grátis e converse pelo chat antes de contratar.`;
  return {
    title,
    description,
    alternates: { canonical: `/${servico}/${cidade}` },
    openGraph: { title, description, url: `/${servico}/${cidade}` },
  };
}

export default async function ServiceCityPage({ params }: Props) {
  const { servico, cidade } = await params;
  const match = findServiceCity(servico, cidade);
  if (!match) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14">
      <nav aria-label="Caminho" className="text-sm text-foreground-muted">
        <Link href="/categorias" className="inline-flex min-h-11 items-center hover:text-ink hover:underline">
          Categorias
        </Link>
      </nav>
      <h1 className="font-display text-3xl text-ink">
        {match.service.label} em {match.city.name}
      </h1>
      <p className="mb-8 mt-2 text-foreground-muted">
        Compare profissionais, receba propostas grátis e converse pelo chat antes de contratar.
      </p>
      <ServiceCityResults service={match.service.label} city={match.city.name} />
    </div>
  );
}
