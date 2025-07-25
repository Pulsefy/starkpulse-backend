import { Injectable } from '@nestjs/common';
import { Chain } from '../../blockchain/enums/chain.enum';

@Injectable()
export class DataValidationService {
  // Validate and cleanse data
  async validate(data: any): Promise<{ valid: boolean; cleansed: any; errors?: string[] }> {
    // Example: check for required fields and cleanse
    const errors: string[] = [];
    if (!data.source) errors.push('Missing source');
    if (!data.payload) errors.push('Missing payload');
    if (data.source === 'blockchain') {
      if (!data.payload.chain || !Object.values(Chain).includes(data.payload.chain)) {
        errors.push('Missing or invalid chain field in blockchain payload');
      }
    }
    const valid = errors.length === 0;
    const cleansed = { ...data };
    if (!valid) {
      // Remove invalid fields or set defaults
      if (!cleansed.source) cleansed.source = 'unknown';
      if (!cleansed.payload) cleansed.payload = {};
      if (cleansed.source === 'blockchain' && (!cleansed.payload.chain || !Object.values(Chain).includes(cleansed.payload.chain))) {
        cleansed.payload.chain = Chain.Others;
      }
    }
    return { valid, cleansed, errors: valid ? undefined : errors };
  }
}
