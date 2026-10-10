import { IsBoolean, IsDateString, IsNumber, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  description!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  category!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;
}
