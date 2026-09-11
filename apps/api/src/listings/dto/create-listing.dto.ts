import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateListingDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsNumber()
  priceMin?: number;

  @IsOptional()
  @IsNumber()
  priceMax?: number;

  @IsOptional()
  @IsString()
  estimatedTime?: string;
}
