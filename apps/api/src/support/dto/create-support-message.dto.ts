import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSupportMessageDto {
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  subject!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(3000)
  message!: string;
}
