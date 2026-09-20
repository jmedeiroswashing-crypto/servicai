import { IsEnum, IsOptional } from 'class-validator';
import { ReportStatus } from '../../generated/prisma/enums.js';

export class ReportFiltersDto {
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;
}
