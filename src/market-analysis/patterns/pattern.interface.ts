export interface Pattern {
  name: string;
  detect(data: number[], options?: Record<string, any>): boolean;
} 