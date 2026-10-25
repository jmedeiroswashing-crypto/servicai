import { IsEmail, IsString } from 'class-validator';

export class LoginShopDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
