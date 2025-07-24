import { Indicator } from './indicator.interface';

export class IndicatorRegistry {
  private static indicators: Record<string, Indicator> = {};

  static register(indicator: Indicator) {
    this.indicators[indicator.name] = indicator;
  }

  static get(name: string): Indicator | undefined {
    return this.indicators[name];
  }

  static list(): string[] {
    return Object.keys(this.indicators);
  }
} 