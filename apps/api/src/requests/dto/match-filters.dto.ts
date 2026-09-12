import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class MatchFiltersDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['cidade', 'estado', 'todas'])
  distance?: 'cidade' | 'estado' | 'todas';

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetMax?: number;

  @IsOptional()
  @IsIn(['recentes', 'proximos', 'match'])
  sort?: 'recentes' | 'proximos' | 'match';
}
