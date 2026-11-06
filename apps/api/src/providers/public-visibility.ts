import type { Prisma } from '../generated/prisma/client.js';
import { BusinessMode } from '../generated/prisma/enums.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const TEST_NAME = /(^|[^\p{L}])(test|teste|testes)($|[^\p{L}])/iu;
const REPLACEMENT_CHAR = '�';

/** Só palavras inteiras, para não esconder um sobrenome como "Testoni". */
export function isTestName(name: string): boolean {
  return TEST_NAME.test(name);
}

export function isValidPublicCity(city: string | null | undefined): boolean {
  if (!city) return false;
  const trimmed = city.trim();
  return trimmed.length > 0 && trimmed.toLowerCase() !== 'não informado' && !trimmed.includes(REPLACEMENT_CHAR);
}

export interface ProfileCompletenessInput {
  name: string;
  avatarUrl: string | null | undefined;
  specialty: string;
  categories: string[];
  city: string;
}

/** Perfil completo é o mínimo para aparecer na vitrine: foto real, nome, profissão, categoria e cidade. */
export function computeProfileComplete(input: ProfileCompletenessInput): boolean {
  const specialty = input.specialty.trim();
  return (
    input.name.trim().length > 0 &&
    !input.name.includes(REPLACEMENT_CHAR) &&
    !!input.avatarUrl &&
    specialty.length > 0 &&
    specialty.toLowerCase() !== 'a definir' &&
    input.categories.length > 0 &&
    isValidPublicCity(input.city)
  );
}

/** Recalcula a completude depois de mudar o perfil profissional ou os dados do usuário. */
export async function refreshProfileComplete(prisma: PrismaService, userId: string): Promise<void> {
  const provider = await prisma.providerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      specialty: true,
      categories: true,
      city: true,
      user: { select: { name: true, avatarUrl: true } },
    },
  });
  if (!provider) return;
  await prisma.providerProfile.update({
    where: { id: provider.id },
    data: {
      profileComplete: computeProfileComplete({
        name: provider.user.name,
        avatarUrl: provider.user.avatarUrl,
        specialty: provider.specialty,
        categories: provider.categories,
        city: provider.city,
      }),
    },
  });
}

/** Regra única para tudo que clientes veem: vitrine, busca e páginas de categoria. */
export function publicProviderWhere(): Prisma.ProviderProfileWhereInput {
  return {
    isTest: false,
    profileComplete: true,
    user: { deletedAt: null },
    // Quem escolheu "só gestão" pediu para não ser encontrado por clientes.
    OR: [{ businessMode: null }, { businessMode: BusinessMode.COMPLETO }, { businessMode: BusinessMode.CONTRATACAO }],
  };
}
