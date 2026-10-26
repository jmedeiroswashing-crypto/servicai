import { IsEnum, IsNumber, IsString, Min, MinLength } from 'class-validator';
import { CashMovementType } from '../../generated/prisma/enums.js';

export class AddCashMovementDto {
  @IsEnum(CashMovementType)
  type!: CashMovementType;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @MinLength(2)
  reason!: string;
}
