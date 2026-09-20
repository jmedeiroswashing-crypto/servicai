import { IsString } from 'class-validator';

export class SendMarketplaceMessageDto {
  @IsString()
  content!: string;
}
