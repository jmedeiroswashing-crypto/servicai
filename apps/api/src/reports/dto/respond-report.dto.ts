import { IsString, MaxLength, MinLength } from 'class-validator';

export class RespondReportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  statement!: string;
}
