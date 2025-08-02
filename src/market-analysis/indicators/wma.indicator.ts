import { Indicator } from './indicator.interface';
import { IndicatorRegistry } from './indicator-registry';

export class WMAIndicator implements Indicator {
  name = 'WMA';
  calculate(data: number[], options?: { period: number }): number[] {
    const period = options?.period ?? 14;
    if (period <= 0 || data.length < period) return [];
    const result: number[] = [];
    for (let i = 0; i <= data.length - period; i++) {
      let sum = 0;
      let weightSum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i + j] * (j + 1);
        weightSum += (j + 1);
      }
      result.push(sum / weightSum);
    }
    return result;
  }
}

IndicatorRegistry.register(new WMAIndicator()); 