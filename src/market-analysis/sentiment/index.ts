export { SentimentSource } from './sentiment.interface';
export { SentimentRegistry } from './sentiment-registry';
// Import all sentiment sources to ensure registration
import './twitter-sentiment';
// TODO: Import more sentiment sources here

export class MarketSentiment {
  // TODO: Implement sentiment analysis logic
} 