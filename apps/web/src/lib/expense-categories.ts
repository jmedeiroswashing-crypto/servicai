export const EXPENSE_CATEGORIES = [
  'Material/insumos',
  'Transporte/combustível',
  'Ferramentas e equipamentos',
  'Marketing/anúncios',
  'Impostos e taxas',
  'Outro',
];

const KEYWORD_MAP: { category: string; keywords: string[] }[] = [
  { category: 'Transporte/combustível', keywords: ['gasolina', 'combustível', 'combustivel', 'uber', '99', 'estacionamento', 'pedágio', 'pedagio', 'ônibus', 'onibus', 'posto'] },
  { category: 'Material/insumos', keywords: ['tinta', 'parafuso', 'cimento', 'cano', 'fio', 'material', 'peça', 'peca', 'insumo', 'cola', 'madeira'] },
  { category: 'Ferramentas e equipamentos', keywords: ['ferramenta', 'furadeira', 'equipamento', 'máquina', 'maquina', 'aparelho', 'bateria'] },
  { category: 'Marketing/anúncios', keywords: ['anúncio', 'anuncio', 'impulsionar', 'marketing', 'panfleto', 'cartão de visita', 'cartao de visita', 'propaganda'] },
  { category: 'Impostos e taxas', keywords: ['imposto', 'taxa', 'mei', 'das', 'alvará', 'alvara', 'inss'] },
];

/**
 * Sugere uma categoria com base em palavras-chave na descrição — não é IA, é
 * só um dicionário simples. Sempre retorna algo plausível (cai em "Outro" se
 * nada bater), e a pessoa pode sempre trocar manualmente.
 */
export function suggestExpenseCategory(description: string): string {
  const normalized = description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  for (const { category, keywords } of KEYWORD_MAP) {
    const normalizedKeywords = keywords.map((k) =>
      k.normalize('NFD').replace(/[̀-ͯ]/g, ''),
    );
    if (normalizedKeywords.some((k) => normalized.includes(k))) {
      return category;
    }
  }

  return 'Outro';
}
