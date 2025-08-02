import { SentimentSource } from './sentiment.interface';
import { SentimentRegistry } from './sentiment-registry';

export class TwitterSentimentSource implements SentimentSource {
  name = 'Twitter';
  analyze(data: string[], options?: Record<string, any>): number {
    // TODO: Implement sentiment analysis
    return 0;
  }
}

SentimentRegistry.register(new TwitterSentimentSource()); 