import { IsNotEmpty, IsNumber, IsPositive, IsString, Min } from 'class-validator';

export class CreateDelegationDto {
  @IsNotEmpty()
  @IsString()
  delegateAddress: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Min(1)
  amount: number;
}