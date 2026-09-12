import { IsDateString, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRequestDto {
  @IsString()
  category!: string;

  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsNumber()
  budgetMin?: number;

  @IsOptional()
  @IsNumber()
  budgetMax?: number;

  @IsOptional()
  @IsDateString()
  desiredDate?: string;

  @IsOptional()
  @IsString()
  desiredTime?: string;
}
