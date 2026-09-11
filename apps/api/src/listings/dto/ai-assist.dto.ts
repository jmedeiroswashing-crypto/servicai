import { IsString } from 'class-validator';

export class GenerateDescriptionDto {
  @IsString()
  specialty!: string;

  @IsString()
  keyPoints!: string;
}

export class SuggestPriceDto {
  @IsString()
  category!: string;

  @IsString()
  description!: string;

  @IsString()
  city!: string;
}
