export interface Indicator {
  name: string;
  calculate(data: number[], options?: Record<string, any>): number[];
} 