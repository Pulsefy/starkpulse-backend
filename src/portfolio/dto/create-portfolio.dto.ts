import { IsNumber, IsObject, IsString } from 'class-validator';

export class CreatePortfolioDto {
  @IsString()
  userId: string;

  @IsNumber()
  totalValue: number;

  @IsObject()
  assetBreakdown: Record<string, number>;
}
