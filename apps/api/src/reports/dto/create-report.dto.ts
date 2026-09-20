import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportReason, ReportTargetType } from '../../generated/prisma/enums.js';

export class CreateReportDto {
  @IsEnum(ReportTargetType)
  targetType!: ReportTargetType;

  @IsString()
  targetId!: string;

  @IsEnum(ReportReason)
  reason!: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
