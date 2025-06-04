import { PartialType } from '@nestjs/swagger';
import { CreateMonitoringDto } from './create-monitoring.dto';

export class UpdateMonitoringDto extends PartialType(CreateMonitoringDto) {}
