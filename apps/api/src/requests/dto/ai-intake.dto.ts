import { IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RequestDraftDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsNumber()
  budgetMin?: number;

  @IsOptional()
  @IsNumber()
  budgetMax?: number;

  @IsOptional()
  @IsString()
  desiredDate?: string;

  @IsOptional()
  @IsString()
  desiredTime?: string;
}

export class AiIntakeDto {
  @IsString()
  message!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RequestDraftDto)
  draft?: RequestDraftDto;
}
