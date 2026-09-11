import { IsString } from 'class-validator';

export class StartConversationDto {
  @IsString()
  providerId!: string;
}
