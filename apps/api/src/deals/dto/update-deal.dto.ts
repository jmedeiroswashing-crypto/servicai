import { IsISO8601, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateDealDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  originalPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  dealPrice?: number;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;
}
