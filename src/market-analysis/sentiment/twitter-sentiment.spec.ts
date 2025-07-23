import { TwitterSentimentSource } from './twitter-sentiment';

describe('TwitterSentimentSource', () => {
  const source = new TwitterSentimentSource();

  it('returns 0 for placeholder logic', () => {
    expect(source.analyze(['tweet1', 'tweet2'])).toBe(0);
  });
}); 