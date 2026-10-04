import { IsString, MinLength } from 'class-validator';

export class SubmitIdentityDto {
  @IsString()
  @MinLength(1)
  documentUrl!: string;
}
