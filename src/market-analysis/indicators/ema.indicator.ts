import { Indicator } from './indicator.interface';
import { IndicatorRegistry } from './indicator-registry';

export class EMAIndicator implements Indicator {
  name = 'EMA';
  calculate(data: number[], options?: { period: number }): number[] {
    const period = options?.period ?? 14;
    if (period <= 0 || data.length < period) return [];
    const k = 2 / (period + 1);
    const ema: number[] = [];
    let prevEma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    ema.push(prevEma);
    for (let i = period; i < data.length; i++) {
      prevEma = data[i] * k + prevEma * (1 - k);
      ema.push(prevEma);
    }
    return ema;
  }
}

IndicatorRegistry.register(new EMAIndicator()); 