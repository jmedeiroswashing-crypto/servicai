import { IsArray, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  yearsExperience?: number;

  // Campo ainda não lido em nenhuma tela/serviço (grava mas nada consome) —
  // validação mínima aqui pra não aceitar qualquer coisa enquanto a feature de
  // horário de atendimento não é construída de verdade.
  @IsOptional()
  @IsObject()
  businessHours?: Record<string, unknown>;
}
