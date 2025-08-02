import { Indicator } from './indicator.interface';
import { IndicatorRegistry } from './indicator-registry';

export class BollingerBandsIndicator implements Indicator {
  name = 'BollingerBands';
  calculate(data: number[], options?: { period: number, stdDev?: number }): number[] {
    const period = options?.period ?? 20;
    const stdDev = options?.stdDev ?? 2;
    if (period <= 0 || data.length < period) return [];
    const result: number[] = [];
    for (let i = 0; i <= data.length - period; i++) {
      const slice = data.slice(i, i + period);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      // For compatibility, return the middle band (mean) only
      result.push(mean);
      // To get upper/lower bands, use a different method or extend the interface
    }
    return result;
  }
}

IndicatorRegistry.register(new BollingerBandsIndicator()); 