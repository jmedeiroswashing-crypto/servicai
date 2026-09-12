import { IsEmail, IsEnum, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { Role, PersonType } from '../../generated/prisma/enums.js';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  name!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  // Campos abaixo só se aplicam a vendedores (role = PRESTADOR)

  @ValidateIf((o) => o.role === Role.PRESTADOR)
  @IsEnum(PersonType)
  personType?: PersonType;

  @ValidateIf((o) => o.personType === PersonType.PF || o.personType === PersonType.PJ)
  @IsString()
  cpf?: string;

  @ValidateIf((o) => o.personType === PersonType.PJ)
  @IsString()
  cnpj?: string;

  @ValidateIf((o) => o.personType === PersonType.PJ)
  @IsString()
  razaoSocial?: string;

  @IsOptional()
  @IsString()
  nomeFantasia?: string;

  @IsOptional()
  @IsString()
  addressCep?: string;

  @IsOptional()
  @IsString()
  addressStreet?: string;

  @IsOptional()
  @IsString()
  addressNumber?: string;
}
