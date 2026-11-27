interface CategoryGroup {
  keywords: string[];
}

// O OpenStreetMap (via Nominatim) só casa texto livre com o NOME literal do
// estabelecimento, não com a categoria do negócio — então buscar por "salão
// de beleza" ou "clínica odontológica" direto costuma dar zero resultado,
// mesmo tendo salões e clínicas cadastrados na região. Esse mapa reconhece o
// nicho que o prestador digitou e troca por palavras mais curtas e literais
// que costumam aparecer de verdade no nome do estabelecimento no Brasil
// (ex: "cabeleireiro", "barbearia"), tentando cada uma até achar resultado.
const CATEGORIES: CategoryGroup[] = [
  { keywords: ['salao de beleza', 'cabeleireiro', 'barbearia', 'barbeiro'] },
  { keywords: ['clinica odontologica', 'dentista', 'odontologia', 'consultorio dentario'] },
  { keywords: ['advocacia', 'advogado'] },
  { keywords: ['contabilidade', 'contador'] },
  { keywords: ['imobiliaria', 'corretora de imoveis', 'corretor de imoveis'] },
  { keywords: ['restaurante', 'lanchonete'] },
  { keywords: ['padaria', 'panificadora'] },
  { keywords: ['farmacia', 'drogaria'] },
  { keywords: ['supermercado', 'mercado'] },
  { keywords: ['mercearia'] },
  { keywords: ['pet shop', 'petshop'] },
  { keywords: ['clinica veterinaria', 'veterinario', 'veterinaria'] },
  { keywords: ['academia', 'academia de ginastica'] },
  { keywords: ['oficina mecanica', 'oficina', 'auto center'] },
  { keywords: ['concessionaria'] },
  { keywords: ['hotel', 'pousada'] },
  { keywords: ['loja de roupas', 'boutique', 'confeccao'] },
  { keywords: ['loja de calcados', 'sapataria'] },
  { keywords: ['clinica medica', 'consultorio medico', 'policlinica'] },
  { keywords: ['hospital'] },
  { keywords: ['escola', 'colegio'] },
  { keywords: ['creche'] },
  { keywords: ['posto de gasolina', 'posto de combustivel'] },
  { keywords: ['material de construcao'] },
  { keywords: ['loja de moveis', 'moveis planejados'] },
  { keywords: ['otica'] },
  { keywords: ['joalheria'] },
  { keywords: ['floricultura'] },
  { keywords: ['papelaria'] },
  { keywords: ['livraria'] },
  { keywords: ['lavanderia'] },
  { keywords: ['estudio de tatuagem', 'tatuador'] },
  { keywords: ['clinica de estetica', 'estetica', 'spa'] },
  { keywords: ['banco'] },
  { keywords: ['seguradora', 'corretora de seguros'] },
  { keywords: ['agencia de publicidade', 'agencia de marketing'] },
  { keywords: ['coworking'] },
  { keywords: ['fisioterapia', 'fisioterapeuta'] },
  { keywords: ['grafica', 'copiadora'] },
  { keywords: ['buffet', 'salao de festas'] },
  { keywords: ['administradora de condominios', 'condominio'] },
  { keywords: ['construtora', 'empreiteira'] },
];

// Troca direta de caractere acentuado -> sem acento. Evita depender de
// String.prototype.normalize('NFD'), que em alguns runtimes de produção não
// se comportou igual ao ambiente local durante os testes.
const MAPA_ACENTOS: Record<string, string> = {
  á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', ô: 'o', õ: 'o', ö: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ç: 'c', ñ: 'n',
};

export function normalizeTexto(texto: string): string {
  return texto
    .toLowerCase()
    .trim()
    .replace(/[áàâãäéèêëíìîïóòôõöúùûüçñ]/g, (c) => MAPA_ACENTOS[c] ?? c);
}

// Plural em português normalmente só acrescenta "s" no fim de cada palavra
// ("clínica odontológica" -> "clínicas odontológicas"). Isso quebra a
// comparação por substring quando o "s" cai bem antes de um espaço no meio da
// frase, então tiramos o "s" final de cada palavra antes de comparar.
function singularizarPalavra(palavra: string): string {
  // "salão" -> "salões", "ação" -> "ações": plural irregular em -ão vira -oes.
  if (palavra.length > 4 && palavra.endsWith('oes')) return `${palavra.slice(0, -3)}ao`;
  if (palavra.length > 3 && palavra.endsWith('s')) return palavra.slice(0, -1);
  return palavra;
}

function singularizar(texto: string): string {
  return texto.split(' ').map(singularizarPalavra).join(' ');
}

// Se o que o prestador digitou bater com um nicho conhecido, devolve as
// palavras alternativas pra tentar na busca (incluindo a original). Se não
// reconhecer nada, devolve [] e a busca segue só com o texto literal digitado.
export function matchSearchTerms(query: string): string[] {
  const q = singularizar(normalizeTexto(query));
  for (const group of CATEGORIES) {
    if (group.keywords.some((k) => { const kn = singularizar(k); return q.includes(kn) || kn.includes(q); })) {
      return group.keywords;
    }
  }
  return [];
}
