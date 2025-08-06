import { Indicator } from './indicator.interface';
import { IndicatorRegistry } from './indicator-registry';

export class SMAIndicator implements Indicator {
  name = 'SMA';
  calculate(data: number[], options?: { period: number }): number[] {
    const period = options?.period ?? 14;
    if (period <= 0 || data.length < period) return [];
    const result: number[] = [];
    for (let i = 0; i <= data.length - period; i++) {
      const sum = data.slice(i, i + period).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  }
}

IndicatorRegistry.register(new SMAIndicator()); 