export interface SentimentSource {
  name: string;
  analyze(data: any, options?: Record<string, any>): number;
} 