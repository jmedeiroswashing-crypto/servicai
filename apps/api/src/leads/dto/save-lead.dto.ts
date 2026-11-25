import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveLeadDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  website?: string;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsNumber()
  ratingCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mapsUrl?: string;
}
