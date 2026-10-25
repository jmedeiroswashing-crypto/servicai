import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDeviceDto {
  @IsString()
  clientName!: string;

  @IsString()
  clientPhone!: string;

  @IsString()
  deviceModel!: string;

  @IsOptional()
  @IsString()
  imei?: string;

  @IsString()
  defect!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetValue?: number;
}
