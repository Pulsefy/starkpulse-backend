import { Indicator } from './indicator.interface';
import { IndicatorRegistry } from './indicator-registry';

export class MACDIndicator implements Indicator {
  name = 'MACD';
  calculate(data: number[], options?: { fastPeriod?: number, slowPeriod?: number, signalPeriod?: number }): number[] {
    const fast = options?.fastPeriod ?? 12;
    const slow = options?.slowPeriod ?? 26;
    const signal = options?.signalPeriod ?? 9;
    if (data.length < slow) return [];
    // EMA helper
    const ema = (arr: number[], period: number): number[] => {
      const k = 2 / (period + 1);
      let prev = arr.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const out = [prev];
      for (let i = period; i < arr.length; i++) {
        prev = arr[i] * k + prev * (1 - k);
        out.push(prev);
      }
      return out;
    };
    const emaFast = ema(data, fast);
    const emaSlow = ema(data, slow);
    const macd = emaFast.slice(emaFast.length - emaSlow.length).map((v, i) => v - emaSlow[i]);
    const signalLine = ema(macd, signal);
    return macd.map((v, i) => v - (signalLine[i] ?? 0));
  }
}

IndicatorRegistry.register(new MACDIndicator()); 