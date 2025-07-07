import { PartialType } from '@nestjs/swagger';
import { CreateEncryptionDto } from './create-encryption.dto';

export class UpdateEncryptionDto extends PartialType(CreateEncryptionDto) {}
