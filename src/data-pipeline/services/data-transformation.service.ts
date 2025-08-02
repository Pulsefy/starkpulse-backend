import { Injectable } from '@nestjs/common';
import { Chain } from '../../blockchain/enums/chain.enum';

@Injectable()
export class DataTransformationService {
  // Transform and enrich raw data
  async transform(raw: any): Promise<any> {
    // Ensure normalized structure for blockchain data
    let normalized = { ...raw };
    if (raw.source === 'blockchain') {
      if (!normalized.payload.chain || !Object.values(Chain).includes(normalized.payload.chain)) {
        normalized.payload.chain = Chain.Others;
      }
      
    }
    return {
      ...normalized,
      enriched: true,
      processedAt: new Date(),
    };
  }
}
