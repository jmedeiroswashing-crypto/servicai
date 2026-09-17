import { IsOptional, IsString, MinLength } from 'class-validator';

export class EstimatePriceDto {
  @IsString()
  @MinLength(2)
  category!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MinLength(2)
  city!: string;
}
