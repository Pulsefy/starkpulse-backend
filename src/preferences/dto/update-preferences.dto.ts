import { PartialType } from '@nestjs/mapped-types';
import { CreatePreferencesDto } from '../dto/create-preferences.dto';

export class UpdatePreferencesDto extends PartialType(CreatePreferencesDto) {}

// No changes needed, inherits new fields from CreatePreferencesDto
