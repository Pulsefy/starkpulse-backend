import { Indicator } from './indicator.interface';
import { IndicatorRegistry } from './indicator-registry';

export class RSIIndicator implements Indicator {
  name = 'RSI';
  calculate(data: number[], options?: { period: number }): number[] {
    const period = options?.period ?? 14;
    if (period <= 0 || data.length < period) return [];
    const result: number[] = [];
    for (let i = 0; i <= data.length - period; i++) {
      let gains = 0, losses = 0;
      for (let j = 1; j < period; j++) {
        const diff = data[i + j] - data[i + j - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
      }
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
    return result;
  }
}

IndicatorRegistry.register(new RSIIndicator()); 