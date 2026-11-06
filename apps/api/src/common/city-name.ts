const LOWERCASE_WORDS = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);

/**
 * Padroniza o nome digitado (espaços, acentos em NFC e maiúsculas) para a mesma
 * cidade não virar registros diferentes. Não adivinha acentos ausentes: as telas
 * oferecem a lista do IBGE, que já traz o nome correto.
 */
export function normalizeCityName(value: string): string {
  const words = value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR').split(' ');
  return words
    .map((word, index) => {
      if (index > 0 && LOWERCASE_WORDS.has(word)) return word;
      return word
        .split('-')
        .map((part) => (LOWERCASE_WORDS.has(part) ? part : part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1)))
        .join('-');
    })
    .join(' ');
}
