import { Injectable } from '@nestjs/common';
import { NewsArticle } from '../entities/news-article.entity';
import { TrendingTopic } from '../entities/trending-topic.entity';
import { TrendingTopicsDto, TrendingTopicItem } from '../dto/trending-topics.dto';
import { SentimentResultDto } from '../dto/sentiment-analysis.dto';



@Injectable()
export class TrendingAnalyzer {
  private readonly stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
    'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we',
    'they', 'them', 'their', 'there', 'then', 'than', 'so', 'if', 'can',
    'said', 'says', 'say', 'one', 'two', 'three', 'also', 'may', 'new'
  ]);

  private topicHistory: Map<string, Array<{ timestamp: Date; count: number }>> = new Map();

  async identifyTrends(
    articles: NewsArticle[],
    timeframe: '1h' | '6h' | '24h'
  ): Promise<TrendingTopicsDto> {
    const keywords = this.extractKeywords(articles);
    const keywordFrequency = this.calculateFrequency(keywords);
    const topicGroups = this.groupRelatedKeywords(keywordFrequency);
    const trendingTopics = await this.calculateTrendScores(topicGroups, articles, timeframe);

    const sortedTopics = trendingTopics
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return {
      topics: sortedTopics.map(topic => ({
        topic: topic.topic,
        score: topic.score,
        articleCount: topic.articles.length,
        relatedKeywords: topic.relatedKeywords,
        sentiment: {
          score: topic.sentiment.score,
          label: topic.sentiment.label as 'positive' | 'negative' | 'neutral'
        },
        growthRate: topic.growthRate,
        category: topic.category
      })),
      timeframe,
      generatedAt: new Date(),
      totalArticlesAnalyzed: articles.length
    };
  }

  private extractKeywords(articles: NewsArticle[]): string[] {
    const allText = articles
      .map(article => `${article.title} ${article.content}`)
      .join(' ')
      .toLowerCase();

    const words = allText
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 3 && 
        !this.stopWords.has(word) &&
        !this.isNumber(word)
      );

    const phrases = this.extractPhrases(allText);
    return [...words, ...phrases];
  }

  private extractPhrases(text: string): string[] {
    const phrases: string[] = [];
    const sentences = text.split(/[.!?]+/);

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i + 1]}`.toLowerCase();
        if (this.isValidPhrase(bigram)) {
          phrases.push(bigram);
        }

        if (i < words.length - 2) {
          const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`.toLowerCase();
          if (this.isValidPhrase(trigram)) {
            phrases.push(trigram);
          }
        }
      }
    }

    return phrases;
  }

  private isValidPhrase(phrase: string): boolean {
    const words = phrase.split(' ');
    return words.length >= 2 && 
           words.every(word => word.length > 2 && !this.stopWords.has(word)) &&
           !this.isNumber(phrase);
  }

  private isNumber(str: string): boolean {
    return /^\d+$/.test(str);
  }

  private calculateFrequency(keywords: string[]): Map<string, number> {
    const frequency = new Map<string, number>();
    
    for (const keyword of keywords) {
      frequency.set(keyword, (frequency.get(keyword) || 0) + 1);
    }

    return frequency;
  }

  private groupRelatedKeywords(frequency: Map<string, number>): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    const processed = new Set<string>();

    const sortedKeywords = Array.from(frequency.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([keyword]) => keyword);

    for (const keyword of sortedKeywords) {
      if (processed.has(keyword)) continue;

      const relatedKeywords = this.findRelatedKeywords(keyword, sortedKeywords, processed);
      groups.set(keyword, relatedKeywords);
      
      relatedKeywords.forEach(related => processed.add(related));
      processed.add(keyword);
    }

    return groups;
  }

  private findRelatedKeywords(mainKeyword: string, allKeywords: string[], processed: Set<string>): string[] {
    const related: string[] = [];
    const mainWords = mainKeyword.split(' ');

    for (const keyword of allKeywords) {
      if (processed.has(keyword) || keyword === mainKeyword) continue;

      const keywordWords = keyword.split(' ');
      const similarity = this.calculateSimilarity(mainWords, keywordWords);
      
      if (similarity > 0.5) {
        related.push(keyword);
      }
    }

    return related.slice(0, 5);
  }

  private calculateSimilarity(words1: string[], words2: string[]): number {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private async calculateTrendScores(
    topicGroups: Map<string, string[]>,
    articles: NewsArticle[],
    timeframe: string
  ): Promise<TrendingTopic[]> {
    const trends: TrendingTopic[] = [];

    for (const [mainTopic, relatedKeywords] of topicGroups) {
      const topicArticles = this.getArticlesForTopic(articles, [mainTopic, ...relatedKeywords]);
      
      if (topicArticles.length < 2) continue;

      const baseScore = topicArticles.length;
      const recencyScore = this.calculateRecencyScore(topicArticles);
      const engagementScore = this.calculateEngagementScore(topicArticles);
      const diversityScore = this.calculateSourceDiversity(topicArticles);
      const growthRate = await this.calculateGrowthRate(mainTopic, timeframe);

      const totalScore = (
        baseScore * 0.3 +
        recencyScore * 0.25 +
        engagementScore * 0.2 +
        diversityScore * 0.15 +
        Math.abs(growthRate) * 0.1
      );

      const sentiment = this.calculateTopicSentiment(topicArticles);
      const category = this.inferTopicCategory(mainTopic, topicArticles);

      trends.push({
        topic: mainTopic,
        score: totalScore,
        articles: topicArticles,
        relatedKeywords,
        sentiment,
        growthRate,
        timeframe,
        category
      });
    }

    return trends;
  }

  private getArticlesForTopic(articles: NewsArticle[], keywords: string[]): NewsArticle[] {
    return articles.filter(article => {
      const text = `${article.title} ${article.content}`.toLowerCase();
      return keywords.some(keyword => text.includes(keyword.toLowerCase()));
    });
  }

  private calculateRecencyScore(articles: NewsArticle[]): number {
    const now = new Date().getTime();
    const scores = articles.map(article => {
      const hoursSincePublished = (now - article.publishedAt.getTime()) / (1000 * 60 * 60);
      return Math.max(0, 24 - hoursSincePublished) / 24;
    });

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private calculateEngagementScore(articles: NewsArticle[]): number {
    const engagementScores = articles
      .map(article => article.engagementScore || 0)
      .filter(score => score > 0);

    if (engagementScores.length === 0) return 0;
    return engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length;
  }

  private calculateSourceDiversity(articles: NewsArticle[]): number {
    const sources = new Set(articles.map(article => article.source));
    return Math.min(1, sources.size / Math.max(1, articles.length * 0.5));
  }

  private async calculateGrowthRate(topic: string, timeframe: string): Promise<number> {
    const history = this.topicHistory.get(topic) || [];
    const now = new Date();
    const timeframePeriods = this.getTimeframePeriods(timeframe);
    
    const currentPeriod = {
      timestamp: now,
      count: 1
    };

    history.push(currentPeriod);
    this.topicHistory.set(topic, history.slice(-timeframePeriods * 2));

    if (history.length < 2) return 0;

    const recentData = history.slice(-timeframePeriods);
    const previousData = history.slice(-timeframePeriods * 2, -timeframePeriods);

    const recentSum = recentData.reduce((sum, item) => sum + item.count, 0);
    const previousSum = previousData.reduce((sum, item) => sum + item.count, 0);

    if (previousSum === 0) return recentSum > 0 ? 100 : 0;
    return ((recentSum - previousSum) / previousSum) * 100;
  }

  private getTimeframePeriods(timeframe: string): number {
    switch (timeframe) {
      case '1h': return 6;
      case '6h': return 4;
      case '24h': return 24;
      default: return 6;
    }
  }

  private calculateTopicSentiment(articles: NewsArticle[]): SentimentResultDto {
    if (articles.length === 0) {
      return { score: 0, label: 'neutral', confidence: 1 };
    }

    const sentimentScores = articles
      .map(article => article.sentimentScore || 0)
      .filter(score => score !== null && score !== undefined);

    if (sentimentScores.length === 0) {
      return { score: 0, label: 'neutral', confidence: 1 };
    }

    const averageScore = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
    
    let label: 'positive' | 'negative' | 'neutral';
    if (averageScore > 0.1) {
      label = 'positive';
    } else if (averageScore < -0.1) {
      label = 'negative';
    } else {
      label = 'neutral';
    }

    return {
      score: Math.round(averageScore * 100) / 100,
      label,
      confidence: 1
    };
  }

  private inferTopicCategory(topic: string, articles: NewsArticle[]): string {
    const categoryKeywords = {
      'politics': ['government', 'election', 'policy', 'president', 'minister', 'parliament', 'congress', 'senate', 'political', 'vote', 'campaign'],
      'business': ['market', 'stock', 'economy', 'financial', 'business', 'company', 'corporate', 'trade', 'investment', 'revenue', 'profit'],
      'technology': ['tech', 'software', 'digital', 'ai', 'artificial intelligence', 'computer', 'internet', 'data', 'cyber', 'innovation'],
      'health': ['health', 'medical', 'hospital', 'doctor', 'patient', 'disease', 'treatment', 'medicine', 'healthcare', 'virus'],
      'sports': ['sport', 'game', 'team', 'player', 'match', 'championship', 'football', 'basketball', 'soccer', 'tennis'],
      'entertainment': ['movie', 'music', 'celebrity', 'film', 'actor', 'artist', 'entertainment', 'show', 'concert', 'album'],
      'science': ['research', 'study', 'scientist', 'discovery', 'experiment', 'science', 'climate', 'space', 'environmental'],
      'international': ['international', 'global', 'world', 'foreign', 'country', 'nation', 'diplomatic', 'treaty', 'alliance']
    };

    const topicLower = topic.toLowerCase();
    const articlesText = articles
      .map(article => `${article.title} ${article.content}`)
      .join(' ')
      .toLowerCase();

    let bestCategory = 'general';
    let maxScore = 0;

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      let score = 0;
      
      for (const keyword of keywords) {
        if (topicLower.includes(keyword)) {
          score += 3;
        }
        
        const keywordMatches = (articlesText.match(new RegExp(keyword, 'g')) || []).length;
        score += keywordMatches;
      }

      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }

    return bestCategory;
  }

  async getTopicHistory(topic: string): Promise<Array<{ timestamp: Date; count: number }>> {
    return this.topicHistory.get(topic) || [];
  }

  async clearTopicHistory(): Promise<void> {
    this.topicHistory.clear();
  }

  async getTopicsByCategory(
    articles: NewsArticle[],
    category: string,
    limit: number = 10
  ): Promise<TrendingTopicItem[]> {
    const allTrends = await this.identifyTrends(articles, '24h');
    return allTrends.topics
      .filter(topic => topic.category === category)
      .slice(0, limit);
  }

  async getEmergingTopics(
    articles: NewsArticle[],
    minGrowthRate: number = 50
  ): Promise<TrendingTopicItem[]> {
    const allTrends = await this.identifyTrends(articles, '6h');
    return allTrends.topics
      .filter(topic => topic.growthRate >= minGrowthRate)
      .sort((a, b) => b.growthRate - a.growthRate);
  }

  async analyzeSentimentTrend(
    articles: NewsArticle[],
    topic: string,
  ): Promise<{
    overall: SentimentResultDto;
    timeline: Array<{ timestamp: Date; sentiment: SentimentResultDto }>;
  }> {
    const topicArticles = this.getArticlesForTopic(articles, [topic]);
    const overall = this.calculateTopicSentiment(topicArticles);

    const timeline = topicArticles
      .sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime())
      .map(article => ({
        timestamp: article.publishedAt,
        sentiment: {
          score: article.sentimentScore || 0,
          label: (article.sentimentScore || 0) > 0.1
            ? 'positive'
            : (article.sentimentScore || 0) < -0.1
              ? 'negative'
              : 'neutral'
        } as SentimentResultDto
      }));

    return { overall, timeline };
  }
  }
