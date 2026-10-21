import { BadRequestException } from '@nestjs/common';

export const WEEKDAY_KEYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export interface DayHours {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

export type BusinessHours = Partial<Record<WeekdayKey, DayHours | null>>;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Valida a forma de `businessHours` vinda do cliente antes de persistir no
 * `Json?` do Prisma — o schema não tipa isso, então a validação de shape fica
 * inteiramente na aplicação. Dia ausente = não configurado (não restringe);
 * dia com valor `null` = fechado nesse dia.
 */
export function validateBusinessHours(input: unknown): BusinessHours {
  if (input === null || input === undefined) return {};
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException('businessHours deve ser um objeto com dias da semana');
  }

  const result: BusinessHours = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!WEEKDAY_KEYS.includes(key as WeekdayKey)) {
      throw new BadRequestException(`Dia inválido em businessHours: ${key}`);
    }
    if (value === null) {
      result[key as WeekdayKey] = null;
      continue;
    }
    if (
      typeof value !== 'object' ||
      typeof (value as DayHours).start !== 'string' ||
      typeof (value as DayHours).end !== 'string' ||
      !TIME_RE.test((value as DayHours).start) ||
      !TIME_RE.test((value as DayHours).end)
    ) {
      throw new BadRequestException(`Horário inválido para ${key}: use { start: "HH:mm", end: "HH:mm" }`);
    }
    const day = value as DayHours;
    if (day.start >= day.end) {
      throw new BadRequestException(`Horário inválido para ${key}: início deve ser antes do fim`);
    }
    result[key as WeekdayKey] = day;
  }
  return result;
}

function weekdayKeyOf(date: Date): WeekdayKey {
  return WEEKDAY_KEYS[date.getDay()];
}

/**
 * Sem `businessHours` configurado (objeto vazio ou dia não mencionado), o
 * prestador é tratado como sempre disponível — mantém o comportamento antigo
 * pra quem nunca configurou nada.
 */
export function isWithinBusinessHours(hours: unknown, date: Date): boolean {
  const parsed = hours as BusinessHours | null | undefined;
  if (!parsed || Object.keys(parsed).length === 0) return true;
  const day = parsed[weekdayKeyOf(date)];
  if (day === undefined) return true;
  if (day === null) return false;

  const minutes = date.getHours() * 60 + date.getMinutes();
  const [sh, sm] = day.start.split(':').map(Number);
  const [eh, em] = day.end.split(':').map(Number);
  return minutes >= sh * 60 + sm && minutes <= eh * 60 + em;
}
