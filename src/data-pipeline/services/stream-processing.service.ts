import { Injectable } from '@nestjs/common';
import { DataTransformationService } from './data-transformation.service';
import { DataValidationService } from './data-validation.service';
import { DataLineageService } from './data-lineage.service';

@Injectable()
export class StreamProcessingService {
  constructor(
    private readonly transformation: DataTransformationService,
    private readonly validation: DataValidationService,
    private readonly lineage: DataLineageService,
  ) {}

  // Stream processing with Kafka
  async processStream(message: any): Promise<void> {
    // 1. Transform and enrich
    const transformed = await this.transformation.transform(message);
    // 2. Validate and cleanse
    const validation = await this.validation.validate(transformed);
    // 3. Track lineage
    await this.lineage.trackLineage(validation.cleansed, 'stream');
    // 4. Forward to analytics/reporting (TODO: implement actual integration)
  }
}
