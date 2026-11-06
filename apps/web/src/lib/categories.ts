import { TAXONOMY } from './taxonomy';

export interface Category {
  slug: string;
  label: string;
}

/** Todas as subcategorias, usadas nos seletores de cadastro e de pedido. */
export const CATEGORIES: Category[] = TAXONOMY.flatMap((category) => category.subcategories);
