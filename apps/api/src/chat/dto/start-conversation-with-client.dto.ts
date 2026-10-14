import { IsString } from 'class-validator';

export class StartConversationWithClientDto {
  @IsString()
  clientId!: string;
}
