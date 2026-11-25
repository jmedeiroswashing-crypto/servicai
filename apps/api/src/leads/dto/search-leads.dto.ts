import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchLeadsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  query!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  location!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}
