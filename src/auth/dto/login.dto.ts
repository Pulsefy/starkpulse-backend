import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email' })
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  walletAddress?: string;
}
