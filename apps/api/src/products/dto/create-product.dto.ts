import { IsArray, IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsNumber()
  @Min(1)
  price!: number;

  @IsString()
  category!: string;

  @IsOptional()
  @IsIn(['NOVO', 'USADO'])
  condition?: 'NOVO' | 'USADO';

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
}
