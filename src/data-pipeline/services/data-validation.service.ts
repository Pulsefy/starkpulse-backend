import { Injectable } from '@nestjs/common';

@Injectable()
export class DataValidationService {
  // Validate and cleanse data
  async validate(data: any): Promise<{ valid: boolean; cleansed: any; errors?: string[] }> {
    // Example: check for required fields and cleanse
    const errors: string[] = [];
    if (!data.source) errors.push('Missing source');
    if (!data.payload) errors.push('Missing payload');
    const valid = errors.length === 0;
    const cleansed = { ...data };
    if (!valid) {
      // Remove invalid fields or set defaults
      if (!cleansed.source) cleansed.source = 'unknown';
      if (!cleansed.payload) cleansed.payload = {};
    }
    return { valid, cleansed, errors: valid ? undefined : errors };
  }
}
