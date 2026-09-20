import { IsArray, IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  price?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['NOVO', 'USADO'])
  condition?: 'NOVO' | 'USADO';

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @IsOptional()
  @IsIn(['DISPONIVEL', 'RESERVADO', 'VENDIDO'])
  status?: 'DISPONIVEL' | 'RESERVADO' | 'VENDIDO';
}
