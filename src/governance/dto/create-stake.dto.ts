import { IsNotEmpty, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

export class CreateStakeDto {
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  lockupPeriodDays?: number;
}