import { IsEnum } from 'class-validator';
import { Chain } from '../enums/chain.enum';

export class CreateBlockchainDto {
  @IsEnum(Chain)
  chain: Chain;
}
