export interface Category {
  slug: string;
  label: string;
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { slug: 'eletricista', label: 'Eletricista', emoji: '⚡' },
  { slug: 'encanador', label: 'Encanador', emoji: '🔧' },
  { slug: 'pedreiro', label: 'Pedreiro', emoji: '🧱' },
  { slug: 'pintor', label: 'Pintor', emoji: '🎨' },
  { slug: 'marceneiro', label: 'Marceneiro', emoji: '🪚' },
  { slug: 'advogado', label: 'Advogado', emoji: '⚖️' },
  { slug: 'psicologo', label: 'Psicólogo', emoji: '🧠' },
  { slug: 'medico', label: 'Médico', emoji: '🩺' },
  { slug: 'mecanico', label: 'Mecânico', emoji: '🚗' },
  { slug: 'lava-rapido', label: 'Lava Rápido', emoji: '🚿' },
  { slug: 'estetica', label: 'Estética', emoji: '💅' },
  { slug: 'odontologia', label: 'Odontologia', emoji: '🦷' },
  { slug: 'salao', label: 'Salão', emoji: '💇' },
  { slug: 'barbeiro', label: 'Barbeiro', emoji: '💈' },
  { slug: 'limpeza', label: 'Limpeza', emoji: '🧹' },
  { slug: 'mudancas', label: 'Mudanças', emoji: '📦' },
  { slug: 'refrigeracao', label: 'Refrigeração', emoji: '❄️' },
  { slug: 'ar-condicionado', label: 'Ar-condicionado', emoji: '🌬️' },
  { slug: 'assistencia-tecnica', label: 'Assist. Técnica', emoji: '🛠️' },
  { slug: 'desenvolvedor', label: 'Desenvolvedor', emoji: '💻' },
  { slug: 'designer', label: 'Designer', emoji: '🖌️' },
  { slug: 'professor-particular', label: 'Professor Particular', emoji: '📚' },
];
