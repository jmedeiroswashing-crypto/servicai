import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewIdentityDto {
  @IsBoolean()
  approve!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
