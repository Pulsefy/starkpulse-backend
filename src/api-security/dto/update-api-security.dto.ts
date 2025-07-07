import { PartialType } from '@nestjs/swagger';
import { CreateApiSecurityDto } from './create-api-security.dto';

export class UpdateApiSecurityDto extends PartialType(CreateApiSecurityDto) {}
