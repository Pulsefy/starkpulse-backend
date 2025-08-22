import { PartialType } from '@nestjs/swagger';
import { CreateSecretDto } from './create-secret.dto';

export class UpdateSecretDto extends PartialType(CreateSecretDto) {}
