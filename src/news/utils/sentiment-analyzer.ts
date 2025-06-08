import { Injectable } from '@nestjs/common';
export interface SentimentResult {
  score: number;
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

@Injectable()
export class SentimentAnalyzer {
  private positiveWords: Set<string> = new Set();
  private negativeWords: Set<string> = new Set();
  private intensifiers: Set<string> = new Set();
  private negators: Set<string> = new Set();

  constructor() {
    this.initializeLexicons();
  }

  async analyze(text: string, includeEmotions?: boolean): Promise<SentimentResult> {
    const preprocessedText = this.preprocessText(text);
    const words = preprocessedText.split(/\s+/);
    
    let sentimentScore = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let totalWords = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase();
      const prevWord = i > 0 ? words[i - 1].toLowerCase() : '';
      const nextWord = i < words.length - 1 ? words[i + 1].toLowerCase() : '';

      if (this.isStopWord(word)) continue;

      totalWords++;
      let wordScore = 0;

      if (this.positiveWords.has(word)) {
        wordScore = this.getWordScore(word, 'positive');
        positiveCount++;
      } else if (this.negativeWords.has(word)) {
        wordScore = this.getWordScore(word, 'negative');
        negativeCount++;
      }

      if (this.negators.has(prevWord)) {
        wordScore *= -1;
      }

      if (this.intensifiers.has(prevWord) || this.intensifiers.has(nextWord)) {
        wordScore *= 1.3;
      }

      if (word.includes('!') || text.includes('!!')) {
        wordScore *= 1.2;
      }

      if (word.toUpperCase() === word && word.length > 2) {
        wordScore *= 1.1;
      }

      sentimentScore += wordScore;
    }

    const normalizedScore = totalWords > 0 ? sentimentScore / totalWords : 0;
    const finalScore = Math.max(-1, Math.min(1, normalizedScore));
    
    const label = this.categorizeScore(finalScore);
    const confidence = this.calculateConfidence(finalScore, positiveCount, negativeCount, totalWords);

    const result: SentimentResult = {
      score: finalScore,
      label,
      confidence
    };

    return result;
  }

  async analyzeMarketSentiment(text: string): Promise<{
    sentiment: SentimentResult;
    marketSignals: {
      bullish: number;
      bearish: number;
      volatility: number;
    };
  }> {
    const baseSentiment = await this.analyze(text);
    
    const marketKeywords = {
      bullish: ['up', 'rise', 'gain', 'growth', 'profit', 'surge', 'rally', 'boom', 'buy', 'bull'],
      bearish: ['down', 'fall', 'loss', 'decline', 'crash', 'bear', 'sell', 'drop', 'plunge', 'recession'],
      volatility: ['volatile', 'swing', 'fluctuate', 'uncertain', 'turbulent', 'unstable']
    };

    const lowerText = text.toLowerCase();
    let bullishScore = 0;
    let bearishScore = 0;
    let volatilityScore = 0;

    Object.entries(marketKeywords).forEach(([type, keywords]) => {
      keywords.forEach(keyword => {
        const matches = (lowerText.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
        if (type === 'bullish') bullishScore += matches;
        if (type === 'bearish') bearishScore += matches;
        if (type === 'volatility') volatilityScore += matches;
      });
    });

    const totalMarketWords = bullishScore + bearishScore + volatilityScore;
    
    return {
      sentiment: baseSentiment,
      marketSignals: {
        bullish: totalMarketWords > 0 ? bullishScore / totalMarketWords : 0,
        bearish: totalMarketWords > 0 ? bearishScore / totalMarketWords : 0,
        volatility: totalMarketWords > 0 ? volatilityScore / totalMarketWords : 0
      }
    };
  }

  async batchAnalyze(texts: string[]): Promise<SentimentResult[]> {
    return Promise.all(texts.map(text => this.analyze(text)));
  }

  private preprocessText(text: string): string {
    return text
      .replace(/[^\w\s!?.,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getWordScore(word: string, type: 'positive' | 'negative'): number {
    const strongPositive = ['excellent', 'amazing', 'fantastic', 'outstanding', 'brilliant'];
    const strongNegative = ['terrible', 'awful', 'horrible', 'devastating', 'catastrophic'];
    
    if (type === 'positive') {
      return strongPositive.includes(word) ? 2 : 1;
    } else {
      return strongNegative.includes(word) ? -2 : -1;
    }
  }

  private categorizeScore(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.1) return 'positive';
    if (score < -0.1) return 'negative';
    return 'neutral';
  }

  private calculateConfidence(
    score: number,
    positiveCount: number,
    negativeCount: number,
    totalWords: number
  ): number {
    if (totalWords === 0) return 0;
    
    const sentimentWordRatio = (positiveCount + negativeCount) / totalWords;
    const scoreAbsolute = Math.abs(score);
    const wordBalance = Math.abs(positiveCount - negativeCount) / Math.max(positiveCount + negativeCount, 1);
    
    return Math.min(1, (scoreAbsolute * 0.4 + sentimentWordRatio * 0.4 + wordBalance * 0.2));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ]);
    return stopWords.has(word);
  }

  private initializeLexicons(): void {
    const positiveWordsList = [
      'good', 'great', 'excellent', 'amazing', 'fantastic', 'wonderful', 'awesome',
      'brilliant', 'outstanding', 'superb', 'perfect', 'best', 'love', 'like',
      'enjoy', 'happy', 'pleased', 'satisfied', 'delighted', 'thrilled', 'excited',
      'positive', 'optimistic', 'confident', 'successful', 'win', 'victory',
      'achievement', 'progress', 'improve', 'better', 'gain', 'profit', 'benefit',
      'advantage', 'opportunity', 'hope', 'promising', 'bright', 'strong',
      'powerful', 'effective', 'efficient', 'valuable', 'useful', 'helpful',
      'support', 'approve', 'recommend', 'praise', 'congratulate', 'celebrate',
      'breakthrough', 'innovation', 'success', 'triumph', 'accomplish', 'achieve'
    ];

    const negativeWordsList = [
      'bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate', 'dislike',
      'disappointing', 'frustrating', 'annoying', 'irritating', 'upsetting',
      'depressing', 'sad', 'unhappy', 'miserable', 'devastated', 'heartbroken',
      'angry', 'furious', 'outraged', 'disgusted', 'shocked', 'appalled',
      'worried', 'concerned', 'anxious', 'fearful', 'scared', 'terrified',
      'negative', 'pessimistic', 'doubtful', 'skeptical', 'uncertain', 'confused',
      'lost', 'fail', 'failure', 'defeat', 'loss', 'problem', 'issue', 'trouble',
      'difficulty', 'challenge', 'obstacle', 'setback', 'decline', 'decrease',
      'drop', 'fall', 'crash', 'collapse', 'damage', 'harm', 'hurt', 'pain',
      'crisis', 'disaster', 'catastrophe', 'emergency', 'danger', 'risk', 'threat'
    ];

    const intensifiersList = [
      'very', 'extremely', 'really', 'quite', 'pretty', 'rather', 'fairly',
      'highly', 'incredibly', 'exceptionally', 'remarkably', 'unusually',
      'particularly', 'especially', 'absolutely', 'completely', 'totally',
      'entirely', 'perfectly', 'fully', 'deeply', 'strongly', 'seriously'
    ];

    const negatorsList = [
      'not', 'no', 'never', 'none', 'nobody', 'nothing', 'neither', 'nor',
      'hardly', 'scarcely', 'barely', 'seldom', 'rarely', 'without', 'lack',
      'absent', 'missing', 'void', 'empty', 'cannot', 'cant', 'wont', 'dont',
      'doesnt', 'didnt', 'wasnt', 'werent', 'isnt', 'arent', 'hasnt', 'havent'
    ];

    this.positiveWords = new Set(positiveWordsList);
    this.negativeWords = new Set(negativeWordsList);
    this.intensifiers = new Set(intensifiersList);
    this.negators = new Set(negatorsList);
  }

  async addCustomWords(type: 'positive' | 'negative', words: string[]): Promise<void> {
    words.forEach(word => {
      if (type === 'positive') {
        this.positiveWords.add(word.toLowerCase());
      } else {
        this.negativeWords.add(word.toLowerCase());
      }
    });
  }

  async getWordSentiment(word: string): Promise<{ type: string; score: number } | null> {
    const lowerWord = word.toLowerCase();
    
    if (this.positiveWords.has(lowerWord)) {
      return { type: 'positive', score: this.getWordScore(lowerWord, 'positive') };
    }
    
    if (this.negativeWords.has(lowerWord)) {
      return { type: 'negative', score: this.getWordScore(lowerWord, 'negative') };
    }
    
    return null;
  }
}