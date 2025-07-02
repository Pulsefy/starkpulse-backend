import { Injectable } from '@nestjs/common';

@Injectable()
export class DataTransformationService {
  // Transform and enrich raw data
  async transform(raw: any): Promise<any> {
    // Example: add enrichment fields
    return {
      ...raw,
      enriched: true,
      processedAt: new Date(),
    };
  }
}
