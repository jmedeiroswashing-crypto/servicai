export interface ProductCategory {
  slug: string;
  label: string;
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { slug: 'eletronicos', label: 'Eletrônicos' },
  { slug: 'moveis', label: 'Móveis e decoração' },
  { slug: 'eletrodomesticos', label: 'Eletrodomésticos' },
  { slug: 'roupas', label: 'Roupas e acessórios' },
  { slug: 'veiculos', label: 'Veículos' },
  { slug: 'ferramentas', label: 'Ferramentas' },
  { slug: 'esportes', label: 'Esportes e lazer' },
  { slug: 'bebes-criancas', label: 'Bebês e crianças' },
  { slug: 'livros-hobbies', label: 'Livros e hobbies' },
  { slug: 'casa-jardim', label: 'Casa e jardim' },
  { slug: 'outros', label: 'Outros' },
];
