import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateProposalDto {
  @IsNumber()
  @Min(0)
  price!: number;

  @IsString()
  @MinLength(5)
  message!: string;

  @IsOptional()
  @IsString()
  deadline?: string;

  @IsOptional()
  @IsString()
  availableAt?: string;
}
