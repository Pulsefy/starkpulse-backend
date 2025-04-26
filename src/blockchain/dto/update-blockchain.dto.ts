import { PartialType } from '@nestjs/swagger';
import { CreateBlockchainDto } from './create-blockchain.dto';

export class UpdateBlockchainDto extends PartialType(CreateBlockchainDto) {}
