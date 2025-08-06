import { TrendMetric } from './trend.interface';
import { TrendRegistry } from './trend-registry';

export class MomentumMetric implements TrendMetric {
  name = 'Momentum';
  calculate(data: number[], options?: Record<string, any>): number[] {
    // TODO: Implement momentum calculation
    return [];
  }
}

TrendRegistry.register(new MomentumMetric()); 