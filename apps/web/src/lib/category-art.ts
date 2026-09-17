import {
  Zap,
  Wrench,
  HardHat,
  PaintRoller,
  Hammer,
  Scale,
  Brain,
  Stethoscope,
  Car,
  Droplets,
  Sparkles,
  Smile,
  Scissors,
  SprayCan,
  Truck,
  Snowflake,
  Wind,
  Smartphone,
  Code2,
  PenTool,
  GraduationCap,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';

/**
 * Emblema por categoria mostrado nos cards de busca — nunca a foto real do
 * prestador ali (isso fica só na página do perfil, com as fotos que ele
 * mesmo enviou). Dá identidade visual imediata mesmo para quem ainda não
 * subiu nenhuma foto, sem depender de banco de imagens de terceiros.
 * Chaveado pelo label (minúsculo) das categorias em lib/categories.ts.
 */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  eletricista: Zap,
  encanador: Wrench,
  pedreiro: HardHat,
  pintor: PaintRoller,
  marceneiro: Hammer,
  advogado: Scale,
  psicólogo: Brain,
  médico: Stethoscope,
  mecânico: Car,
  'lava rápido': Droplets,
  estética: Sparkles,
  odontologia: Smile,
  salão: Scissors,
  barbeiro: Scissors,
  limpeza: SprayCan,
  mudanças: Truck,
  refrigeração: Snowflake,
  'ar-condicionado': Wind,
  'assist. técnica': Smartphone,
  desenvolvedor: Code2,
  designer: PenTool,
  'professor particular': GraduationCap,
};

export function getCategoryIcon(categoryLabel: string): LucideIcon {
  return CATEGORY_ICON[categoryLabel.trim().toLowerCase()] ?? Briefcase;
}
