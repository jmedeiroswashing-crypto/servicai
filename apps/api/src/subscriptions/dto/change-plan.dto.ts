import { IsEnum } from 'class-validator';
import { Plan } from '../../generated/prisma/enums.js';

export class ChangePlanDto {
  @IsEnum(Plan)
  plan!: Plan;
}
