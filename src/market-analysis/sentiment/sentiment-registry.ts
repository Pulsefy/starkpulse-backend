import { SentimentSource } from './sentiment.interface';

export class SentimentRegistry {
  private static sources: Record<string, SentimentSource> = {};

  static register(source: SentimentSource) {
    this.sources[source.name] = source;
  }

  static get(name: string): SentimentSource | undefined {
    return this.sources[name];
  }

  static list(): string[] {
    return Object.keys(this.sources);
  }
} 