import { IsIn } from 'class-validator';
import { Plan } from '../../generated/prisma/enums.js';
import { SELLABLE_PLANS } from '../plans.config.js';

const TRIABLE_PLANS = SELLABLE_PLANS.filter((p) => p !== 'GRATIS');

export class StartTrialDto {
  @IsIn(TRIABLE_PLANS, { message: 'Plano inválido para teste gratuito' })
  plan!: Plan;
}
