import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataIngestionService } from './data-ingestion.service';
import { DataTransformationService } from './data-transformation.service';
import { DataValidationService } from './data-validation.service';
import { DataLineageService } from './data-lineage.service';

@Injectable()
export class BatchProcessingService {
  constructor(
    private readonly ingestion: DataIngestionService,
    private readonly transformation: DataTransformationService,
    private readonly validation: DataValidationService,
    private readonly lineage: DataLineageService,
  ) {}

  // Batch ETL jobs (scheduled)
  @Cron(CronExpression.EVERY_HOUR)
  async processBatch(): Promise<void> {
    // Example: fetch batch data from a source
    const batch = [
      { source: 'blockchain', payload: { /* ... */ } },
      { source: 'market', payload: { /* ... */ } },
    ];
    for (const item of batch) {
      const raw = await this.ingestion.ingest(item.source, item.payload);
      const transformed = await this.transformation.transform(raw);
      const validation = await this.validation.validate(transformed);
      await this.lineage.trackLineage(validation.cleansed, 'batch');
      // TODO: Save cleansed data to DB or analytics/reporting system
    }
  }
}
