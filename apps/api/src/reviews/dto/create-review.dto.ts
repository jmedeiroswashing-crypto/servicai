import { IsArray, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  bookingId!: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  rating!: number;

  @IsNumber()
  @Min(0)
  @Max(5)
  pontualidade!: number;

  @IsNumber()
  @Min(0)
  @Max(5)
  qualidade!: number;

  @IsNumber()
  @Min(0)
  @Max(5)
  preco!: number;

  @IsNumber()
  @Min(0)
  @Max(5)
  atendimento!: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;
}
