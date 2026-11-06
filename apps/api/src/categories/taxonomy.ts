/**
 * Taxonomia oficial de serviços. A migração 20261106120000 grava estes dados no
 * banco, e apps/web/src/lib/taxonomy.ts precisa ser uma cópia idêntica deste
 * arquivo (o teste taxonomy.spec.ts confere).
 */
export interface TaxonomySubcategory {
  slug: string;
  label: string;
}

export interface TaxonomyCategory {
  slug: string;
  label: string;
  subcategories: TaxonomySubcategory[];
}

export const TAXONOMY: TaxonomyCategory[] = [
  {
    slug: 'reformas-e-construcao',
    label: 'Reformas e construção',
    subcategories: [
      { slug: 'pedreiro', label: 'Pedreiro' },
      { slug: 'eletricista', label: 'Eletricista' },
      { slug: 'encanador', label: 'Encanador' },
      { slug: 'pintor', label: 'Pintor' },
      { slug: 'gesseiro', label: 'Gesseiro' },
      { slug: 'marceneiro', label: 'Marceneiro' },
      { slug: 'serralheiro', label: 'Serralheiro' },
      { slug: 'vidraceiro', label: 'Vidraceiro' },
      { slug: 'telhadista', label: 'Telhadista' },
      { slug: 'azulejista', label: 'Azulejista' },
    ],
  },
  {
    slug: 'casa-e-manutencao',
    label: 'Casa e manutenção',
    subcategories: [
      { slug: 'diarista', label: 'Diarista' },
      { slug: 'faxina-pos-obra', label: 'Faxina pós-obra' },
      { slug: 'jardinagem', label: 'Jardinagem' },
      { slug: 'piscineiro', label: 'Piscineiro' },
      { slug: 'dedetizacao', label: 'Dedetização' },
      { slug: 'chaveiro', label: 'Chaveiro' },
      { slug: 'montador-de-moveis', label: 'Montador de móveis' },
      { slug: 'desentupidora', label: 'Desentupidora' },
      { slug: 'instalador-de-cameras', label: 'Instalador de câmeras' },
    ],
  },
  {
    slug: 'assistencia-tecnica',
    label: 'Assistência técnica',
    subcategories: [
      { slug: 'conserto-de-celular', label: 'Conserto de celular' },
      { slug: 'conserto-de-informatica', label: 'Conserto de informática' },
      { slug: 'eletrodomesticos', label: 'Eletrodomésticos' },
      { slug: 'tv-e-som', label: 'TV e som' },
      { slug: 'ar-condicionado', label: 'Ar-condicionado' },
      { slug: 'geladeira-e-maquina-de-lavar', label: 'Geladeira e máquina de lavar' },
    ],
  },
  {
    slug: 'automotivo',
    label: 'Automotivo',
    subcategories: [
      { slug: 'mecanico', label: 'Mecânico' },
      { slug: 'eletricista-automotivo', label: 'Eletricista automotivo' },
      { slug: 'funilaria-e-pintura', label: 'Funilaria e pintura' },
      { slug: 'lavagem-e-estetica-automotiva', label: 'Lavagem e estética automotiva' },
      { slug: 'borracharia', label: 'Borracharia' },
      { slug: 'guincho', label: 'Guincho' },
    ],
  },
  {
    slug: 'beleza',
    label: 'Beleza',
    subcategories: [
      { slug: 'cabeleireiro', label: 'Cabeleireiro' },
      { slug: 'barbeiro', label: 'Barbeiro' },
      { slug: 'manicure-e-pedicure', label: 'Manicure e pedicure' },
      { slug: 'maquiagem', label: 'Maquiagem' },
      { slug: 'design-de-sobrancelhas', label: 'Design de sobrancelhas' },
      { slug: 'estetica', label: 'Estética' },
      { slug: 'depilacao', label: 'Depilação' },
    ],
  },
  {
    slug: 'saude-e-bem-estar',
    label: 'Saúde e bem-estar',
    subcategories: [
      { slug: 'personal-trainer', label: 'Personal trainer' },
      { slug: 'fisioterapeuta', label: 'Fisioterapeuta' },
      { slug: 'nutricionista', label: 'Nutricionista' },
      { slug: 'psicologo', label: 'Psicólogo' },
      { slug: 'massoterapeuta', label: 'Massoterapeuta' },
    ],
  },
  {
    slug: 'cuidados',
    label: 'Cuidados',
    subcategories: [
      { slug: 'cuidador-de-idosos', label: 'Cuidador de idosos' },
      { slug: 'baba', label: 'Babá' },
      { slug: 'acompanhante-hospitalar', label: 'Acompanhante hospitalar' },
    ],
  },
  {
    slug: 'eventos',
    label: 'Eventos',
    subcategories: [
      { slug: 'fotografo', label: 'Fotógrafo' },
      { slug: 'filmagem', label: 'Filmagem' },
      { slug: 'dj', label: 'DJ' },
      { slug: 'buffet', label: 'Buffet' },
      { slug: 'confeiteira', label: 'Confeiteira' },
      { slug: 'decoracao', label: 'Decoração' },
      { slug: 'garcom', label: 'Garçom' },
      { slug: 'som-e-iluminacao', label: 'Som e iluminação' },
    ],
  },
  {
    slug: 'pets',
    label: 'Pets',
    subcategories: [
      { slug: 'banho-e-tosa', label: 'Banho e tosa' },
      { slug: 'adestrador', label: 'Adestrador' },
      { slug: 'passeador', label: 'Passeador' },
      { slug: 'pet-sitter', label: 'Pet sitter' },
      { slug: 'veterinario-a-domicilio', label: 'Veterinário a domicílio' },
    ],
  },
  {
    slug: 'fretes-e-mudancas',
    label: 'Fretes e mudanças',
    subcategories: [
      { slug: 'frete', label: 'Frete' },
      { slug: 'mudanca', label: 'Mudança' },
      { slug: 'carreto', label: 'Carreto' },
      { slug: 'motoboy-e-entregas', label: 'Motoboy e entregas' },
    ],
  },
  {
    slug: 'aulas',
    label: 'Aulas',
    subcategories: [
      { slug: 'reforco-escolar', label: 'Reforço escolar' },
      { slug: 'idiomas', label: 'Idiomas' },
      { slug: 'musica', label: 'Música' },
      { slug: 'aulas-de-informatica', label: 'Aulas de informática' },
      { slug: 'preparatorio-para-concursos', label: 'Preparatório para concursos' },
    ],
  },
  {
    slug: 'tecnologia-e-design',
    label: 'Tecnologia e design',
    subcategories: [
      { slug: 'desenvolvedor', label: 'Desenvolvedor' },
      { slug: 'designer', label: 'Designer' },
      { slug: 'social-media', label: 'Social media' },
      { slug: 'edicao-de-video', label: 'Edição de vídeo' },
      { slug: 'suporte-de-ti', label: 'Suporte de TI' },
    ],
  },
  {
    slug: 'juridico-e-financeiro',
    label: 'Jurídico e financeiro',
    subcategories: [
      { slug: 'advogado', label: 'Advogado' },
      { slug: 'contador', label: 'Contador' },
      { slug: 'despachante', label: 'Despachante' },
      { slug: 'consultoria-empresarial', label: 'Consultoria empresarial' },
    ],
  },
];
