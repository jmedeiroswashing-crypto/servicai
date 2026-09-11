import { IsIn, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsIn(['text', 'photo', 'video', 'audio', 'document', 'location', 'orcamento'])
  type?: string;
}
