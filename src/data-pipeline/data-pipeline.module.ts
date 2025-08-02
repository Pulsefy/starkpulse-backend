import { Module } from '@nestjs/common';

import { KafkaStreamService } from './services/kafka-stream.service';
import { DataIngestionService } from './services/data-ingestion.service';
import { DataTransformationService } from './services/data-transformation.service';
import { DataValidationService } from './services/data-validation.service';
import { DataLineageService } from './services/data-lineage.service';
import { BatchProcessingService } from './services/batch-processing.service';
import { StreamProcessingService } from './services/stream-processing.service';

@Module({
  providers: [
    DataIngestionService,
    DataTransformationService,
    DataValidationService,
    DataLineageService,
    BatchProcessingService,
    StreamProcessingService,
    KafkaStreamService,
  ],
  exports: [
    DataIngestionService,
    DataTransformationService,
    DataValidationService,
    DataLineageService,
    BatchProcessingService,
    StreamProcessingService,
    KafkaStreamService,
  ],
})
export class DataPipelineModule {}
