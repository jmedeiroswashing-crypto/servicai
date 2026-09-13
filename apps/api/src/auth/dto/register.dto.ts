import { IsEmail, IsEnum, IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { Role, PersonType } from '../../generated/prisma/enums.js';
import { IsCPF } from '../../common/validators/is-cpf.decorator.js';
import { IsCNPJ } from '../../common/validators/is-cnpj.decorator.js';

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  name!: string;

  // Auto-cadastro nunca pode criar um ADMIN — esse papel só existe via provisionamento
  // manual (seed/administração direta do banco).
  @IsIn([Role.CLIENTE, Role.PRESTADOR], { message: 'Papel inválido' })
  role!: Role;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsIn(ESTADOS_BR, { message: 'Estado (UF) inválido' })
  addressState?: string;

  // Campos abaixo só se aplicam a vendedores (role = PRESTADOR)

  @ValidateIf((o) => o.role === Role.PRESTADOR)
  @IsEnum(PersonType)
  personType?: PersonType;

  @ValidateIf((o) => o.personType === PersonType.PF || o.personType === PersonType.PJ)
  @IsCPF({ message: 'CPF inválido' })
  cpf?: string;

  @ValidateIf((o) => o.personType === PersonType.PJ)
  @IsCNPJ({ message: 'CNPJ inválido' })
  cnpj?: string;

  @ValidateIf((o) => o.personType === PersonType.PJ)
  @IsString()
  razaoSocial?: string;

  @IsOptional()
  @IsString()
  nomeFantasia?: string;

  @ValidateIf((o) => o.personType === PersonType.PJ)
  @IsString()
  addressCep?: string;

  @ValidateIf((o) => o.personType === PersonType.PJ)
  @IsString()
  addressStreet?: string;

  @ValidateIf((o) => o.personType === PersonType.PJ)
  @IsString()
  addressNumber?: string;
}
