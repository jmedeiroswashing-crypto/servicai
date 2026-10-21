import { IsIn } from 'class-validator';
import { Plan } from '../../generated/prisma/enums.js';
import { SELLABLE_PLANS } from '../plans.config.js';

export class ChangePlanDto {
  // Só os planos vendidos hoje — BUSINESS é legado (ver plans.config.ts) e não
  // pode ser escolhido via API, senão qualquer prestador ganharia os benefícios
  // do Premium de graça.
  @IsIn(SELLABLE_PLANS, { message: 'Plano inválido' })
  plan!: Plan;
}
