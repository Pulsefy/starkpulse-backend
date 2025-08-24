import { IsNotEmpty, IsString } from 'class-validator';

export class TokenAuthDto {
  @IsNotEmpty()
  @IsString()
  walletAddress: string;

  @IsNotEmpty()
  @IsString()
  signature: string;

  @IsNotEmpty()
  @IsString()
  message: string;
}