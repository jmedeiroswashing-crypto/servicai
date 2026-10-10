import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateIncomeDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  description!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsDateString()
  date?: string;
}
