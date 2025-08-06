import { TrendMetric } from './trend.interface';

export class TrendRegistry {
  private static metrics: Record<string, TrendMetric> = {};

  static register(metric: TrendMetric) {
    this.metrics[metric.name] = metric;
  }

  static get(name: string): TrendMetric | undefined {
    return this.metrics[name];
  }

  static list(): string[] {
    return Object.keys(this.metrics);
  }
} 