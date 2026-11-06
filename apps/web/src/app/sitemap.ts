import type { MetadataRoute } from 'next';
import { allServiceCityParams } from '@/lib/seo-pages';
import { SITE_URL } from '@/lib/site-config';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/buscar', '/categorias', '/precos', '/sobre', '/termos', '/privacidade'];
  return [
    ...pages.map((path) => ({ url: `${SITE_URL}${path}` })),
    ...allServiceCityParams().map(({ servico, cidade }) => ({ url: `${SITE_URL}/${servico}/${cidade}` })),
  ];
}
