export interface TrendMetric {
  name: string;
  calculate(data: number[], options?: Record<string, any>): number[];
} 