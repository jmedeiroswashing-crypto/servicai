import { IsNumber, IsPositive, Matches } from 'class-validator';

export class UpsertGoalDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month deve estar no formato YYYY-MM' })
  month!: string;

  @IsNumber()
  @IsPositive()
  targetAmount!: number;
}
