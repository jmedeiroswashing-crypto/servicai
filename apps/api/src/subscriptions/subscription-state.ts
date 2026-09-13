import type { Plan, SubscriptionStatus } from '../generated/prisma/enums.js';

/**
 * Estados em que os benefícios do plano contratado ainda valem. Fora deles
 * (expirada, cancelada, inadimplente, pagamento pendente), o prestador é tratado
 * como Grátis para efeito de permissões e ranking — mesmo que o campo `plan` na
 * assinatura ainda registre qual era o plano contratado, para fins de histórico.
 */
const BENEFITS_ACTIVE_STATUSES: SubscriptionStatus[] = ['ATIVA', 'TESTE', 'CANCELAMENTO_SOLICITADO'];

export function isEffectivelyPaid(status: SubscriptionStatus): boolean {
  return BENEFITS_ACTIVE_STATUSES.includes(status);
}

export function getEffectivePlan(sub: { plan: Plan; status: SubscriptionStatus }): Plan {
  return isEffectivelyPaid(sub.status) ? sub.plan : 'GRATIS';
}

/** Uma assinatura paga com prazo vencido deve deixar de valer, independente do status gravado. */
export function isExpired(sub: { currentPeriodEnd: Date | null }, now = new Date()): boolean {
  return !!sub.currentPeriodEnd && sub.currentPeriodEnd < now;
}
