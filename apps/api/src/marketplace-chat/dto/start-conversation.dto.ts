import { IsString } from 'class-validator';

export class StartMarketplaceConversationDto {
  @IsString()
  productId!: string;
}
