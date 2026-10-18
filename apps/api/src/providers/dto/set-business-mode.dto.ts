import { IsEnum } from 'class-validator';
import { BusinessMode } from '../../generated/prisma/enums.js';

export class SetBusinessModeDto {
  @IsEnum(BusinessMode)
  businessMode!: BusinessMode;
}
