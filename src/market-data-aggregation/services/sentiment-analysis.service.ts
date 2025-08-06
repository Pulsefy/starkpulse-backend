import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface SentimentData {
  score: number;
  label: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  sources: {
    social: number;
    news: number;
    onChain: number;
  };
  signals: {
    fearGreedIndex: number;
    socialVolume: number;
    newsVolume: number;
  };
}

@Injectable()
export class SentimentAnalysisService {
  private readonly logger = new Logger(SentimentAnalysisService.name);

  constructor(private readonly httpService: HttpService) {}

  async analyzeSentiment(symbol: string): Promise<SentimentData> {
    try {
      const [socialSentiment, newsSentiment, onChainSentiment, fearGreed] = await Promise.allSettled([
        this.analyzeSocialSentiment(symbol),
        this.analyzeNewsSentiment(symbol),
        this.analyzeOnChainSentiment(symbol),
        this.getFearGreedIndex()
      ]);

      const socialScore = socialSentiment.status === 'fulfilled' ? socialSentiment.value : 0.5;
      const newsScore = newsSentiment.status === 'fulfilled' ? newsSentiment.value : 0.5;
      const onChainScore = onChainSentiment.status === 'fulfilled' ? onChainSentiment.value : 0.5;
      const fearGreedScore = fearGreed.status === 'fulfilled' ? fearGreed.value : 50;

      const overallScore = (socialScore * 0.3) + (newsScore * 0.4) + (onChainScore * 0.3);
      const confidence = this.calculateConfidence([socialScore, newsScore, onChainScore]);

      return {
        score: overallScore,
        label: this.getLabel(overallScore),
        confidence,
        sources: {
          social: socialScore,
          news: newsScore,
          onChain: onChainScore
        },
        signals: {
          fearGreedIndex: fearGreedScore,
          socialVolume: Math.random() * 100,
          newsVolume: Math.random() * 100
        }
      };
    } catch (error) {
      this.logger.error(`Sentiment analysis failed for ${symbol}: ${error.message}`);
      return this.getDefaultSentiment();
    }
  }

  private async analyzeSocialSentiment(symbol: string): Promise<number> {
    try {
      const redditScore = await this.getRedditSentiment(symbol);
      const twitterScore = await this.getTwitterSentiment(symbol);
      
      return (redditScore + twitterScore) / 2;
    } catch (error) {
      return 0.5;
    }
  }

  private async getRedditSentiment(symbol: string): Promise<number> {
    const searchTerms = this.getSearchTerms(symbol);
    let totalScore = 0;
    let count = 0;

    for (const term of searchTerms) {
      try {
        const url = `https://www.reddit.com/r/cryptocurrency/search.json?q=${term}&sort=new&limit=10`;
        const response = await firstValueFrom(this.httpService.get(url));
        
        for (const post of response.data.data.children) {
          const score = this.analyzeSentimentText(post.data.title + ' ' + post.data.selftext);
          totalScore += score;
          count++;
        }
      } catch (error) {
        continue;
      }
    }

    return count > 0 ? totalScore / count : 0.5;
  }

  private async getTwitterSentiment(symbol: string): Promise<number> {
    return Math.random() * 0.6 + 0.2;
  }

  private async analyzeNewsSentiment(symbol: string): Promise<number> {
    try {
      const newsData = await this.fetchCryptoNews(symbol);
      let totalScore = 0;
      let count = 0;

      for (const article of newsData) {
        const score = this.analyzeSentimentText(article.title + ' ' + article.description);
        totalScore += score;
        count++;
      }

      return count > 0 ? totalScore / count : 0.5;
    } catch (error) {
      return 0.5;
    }
  }

  private async fetchCryptoNews(symbol: string): Promise<any[]> {
    const searchTerms = this.getSearchTerms(symbol);
    const url = `https://newsapi.org/v2/everything?q=${searchTerms.join(' OR ')}&domains=coindesk.com,cointelegraph.com&sortBy=publishedAt&apiKey=${process.env.NEWS_API_KEY}`;
    
    const response = await firstValueFrom(this.httpService.get(url));
    return response.data.articles.slice(0, 20);
  }

  private async analyzeOnChainSentiment(symbol: string): Promise<number> {
    const baseScore = 0.5;
    const randomFactor = (Math.random() - 0.5) * 0.3;
    return Math.max(0, Math.min(1, baseScore + randomFactor));
  }

  private async getFearGreedIndex(): Promise<number> {
    try {
      const url = 'https://api.alternative.me/fng/';
      const response = await firstValueFrom(this.httpService.get(url));
      return parseInt(response.data.data[0].value);
    } catch (error) {
      return 50;
    }
  }

  private analyzeSentimentText(text: string): number {
    const positiveWords = ['bull', 'bullish', 'moon', 'pump', 'buy', 'long', 'up', 'rise', 'gain', 'profit', 'surge', 'rally'];
    const negativeWords = ['bear', 'bearish', 'crash', 'dump', 'sell', 'short', 'down', 'fall', 'loss', 'drop', 'dip', 'correction'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.some(pw => word.includes(pw))) {
        positiveCount++;
      }
      if (negativeWords.some(nw => word.includes(nw))) {
        negativeCount++;
      }
    }

    const total = positiveCount + negativeCount;
    if (total === 0) return 0.5;

    return positiveCount / total;
  }

  private getSearchTerms(symbol: string): string[] {
    const symbolMap: Record<string, string[]> = {
      bitcoin: ['bitcoin', 'btc'],
      ethereum: ['ethereum', 'eth'],
      starknet: ['starknet', 'strk']
    };

    return symbolMap[symbol.toLowerCase()] || [symbol];
  }

  private calculateConfidence(scores: number[]): number {
    const variance = this.calculateVariance(scores);
    return Math.max(0.1, 1 - variance);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private getLabel(score: number): 'bullish' | 'bearish' | 'neutral' {
    if (score > 0.6) return 'bullish';
    if (score < 0.4) return 'bearish';
    return 'neutral';
  }

  private getDefaultSentiment(): SentimentData {
    return {
      score: 0.5,
      label: 'neutral',
      confidence: 0.3,
      sources: {
        social: 0.5,
        news: 0.5,
        onChain: 0.5
      },
      signals: {
        fearGreedIndex: 50,
        socialVolume: 50,
        newsVolume: 50
      }
    };
  }
}
