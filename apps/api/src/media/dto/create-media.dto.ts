import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateMediaDto {
  @IsIn(['photo', 'video', 'before_after'])
  type!: 'photo' | 'video' | 'before_after';

  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  beforeUrl?: string;

  @IsOptional()
  @IsString()
  afterUrl?: string;
}
