import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProviderDraftDto {
  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsInt()
  yearsExperience?: number;
}

export class ProviderAiIntakeDto {
  @IsString()
  message!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProviderDraftDto)
  draft?: ProviderDraftDto;
}
