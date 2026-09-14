import { IsOptional, IsString } from 'class-validator';

export class DealFiltersDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  city?: string;
}
