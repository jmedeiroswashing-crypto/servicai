import { CATEGORIES } from './categories';

/**
 * Cidades com páginas indexáveis no formato /eletricista/cruzeiro-do-sul. O site é
 * exportado de forma estática, então cada combinação vira um arquivo: ao adicionar
 * cidades, considere o tamanho do build e do app Android.
 */
export const SEO_CITIES = [
  { slug: 'cruzeiro-do-sul', name: 'Cruzeiro do Sul' },
  { slug: 'recife', name: 'Recife' },
  { slug: 'olinda', name: 'Olinda' },
  { slug: 'sao-paulo', name: 'São Paulo' },
  { slug: 'rio-de-janeiro', name: 'Rio de Janeiro' },
  { slug: 'belo-horizonte', name: 'Belo Horizonte' },
  { slug: 'salvador', name: 'Salvador' },
  { slug: 'fortaleza', name: 'Fortaleza' },
];

export function allServiceCityParams() {
  return CATEGORIES.flatMap((service) =>
    SEO_CITIES.map((city) => ({ servico: service.slug, cidade: city.slug })),
  );
}

export function findServiceCity(servico: string, cidade: string) {
  const service = CATEGORIES.find((c) => c.slug === servico);
  const city = SEO_CITIES.find((c) => c.slug === cidade);
  return service && city ? { service, city } : null;
}
