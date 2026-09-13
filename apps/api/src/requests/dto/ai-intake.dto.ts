import { IsNumber, IsOptional, IsString } from 'class-validator';

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
  draft?: RequestDraftDto;
}
