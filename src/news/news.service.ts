import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsUpdate } from './entities/news-update.entity';
import { NewsInterest } from './entities/news-interest.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ReliabilityScorer } from './utils/reliability-scorer';
import { ContentCategorizer } from './utils/content-categorizer';
import { SentimentAnalyzer } from './utils/sentiment-analyzer';
import { TrendingAnalyzer } from './utils/trending-analyzer';
import { PersonalizationEngine } from './utils/personalization-engine';
import { NewsArticle } from './entities/news-article.entity';
import { PersonalizedFeed } from './entities/personalized-feed.entity';
import { CreateNewsArticleDto } from './dto/create-news-article.dto';
import { UpdateNewsArticleDto } from './dto/update-news-article.dto';
import { PersonalizationPreferencesDto } from './dto/personalization-preferences.dto';
import { NewsFilterDto } from './dto/news-filter.dto';
import { TrendingTopicsDto } from './dto/trending-topics.dto';

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(NewsUpdate)
    private readonly newsRepo: Repository<NewsUpdate>,
    private readonly reliabilityScorer: ReliabilityScorer,
    private readonly contentCategorizer: ContentCategorizer,
    private readonly sentimentAnalyzer: SentimentAnalyzer,
    private readonly trendingAnalyzer: TrendingAnalyzer,
    private readonly personalizationEngine: PersonalizationEngine,

    @InjectRepository(NewsInterest)
    private readonly interestRepo: Repository<NewsInterest>,

    private readonly notificationsService: NotificationsService,
  ) {}

  async publishNewsUpdate(
    title: string,
    content: string,
    category: string,
  ): Promise<NewsUpdate> {
    const news = this.newsRepo.create({ title, content, category });
    await this.newsRepo.save(news);

    // Get all users interested in this category
    const interestedUsers = await this.interestRepo.find({
      where: { category },
    });

    // Send a notification to each user
    for (const user of interestedUsers) {
      await this.notificationsService.send({
        userId: user.userId,
        title: `News: ${title}`,
        content: content,
        channel: 'in_app',
        metadata: { category },
        type: 'news_update', // Add the required type field
      });
    }

    return news;
  }

    async aggregateNews(sources?: string[]): Promise<NewsArticle[]> {
    const rawArticles = await this.fetchFromSources(sources);
    const processedArticles = await Promise.all(
      rawArticles.map(async (article) => {
        const reliabilityScore = await this.reliabilityScorer.scoreSource(article.source ?? '');
        const categories = await this.contentCategorizer.categorize({
          title: article.title ?? '',
          content: article.content ?? '',
          source: article.source,
        });
        const sentiment = await this.sentimentAnalyzer.analyze(article.content ?? '');
        
        return {
          ...article,
          id: article.id ?? this.generateId(),
          reliabilityScore,
          category: Array.isArray(categories) ? categories[0] : categories,
          sentiment,
          processedAt: new Date(),
        };
      })
    );

    return processedArticles
      .filter(article => article.reliabilityScore >= 0.6)
      .map(article => ({
        ...article,
        id: article.id!, 
      })) as NewsArticle[];
  }

  async createPersonalizedFeed(
    userId: string,
    preferences: PersonalizationPreferencesDto
  ): Promise<PersonalizedFeed> {
    const allArticles = await this.aggregateNews();
    const personalizedArticles = this.personalizationEngine.personalize(
      allArticles,
      preferences
    ) as unknown as NewsArticle[]; 

    return {
      userId,
      articles: personalizedArticles ?? [],
      generatedAt: new Date(),
      preferences,
    };
  }

  async getTrendingTopics(timeframe: '1h' | '6h' | '24h' = '24h'): Promise<TrendingTopicsDto> {
    const articles = await this.getRecentArticles(timeframe);
    return await this.trendingAnalyzer.identifyTrends(articles, timeframe);
  }

  async analyzeMarketSentiment(symbol?: string): Promise<{
    overall: number;
    positive: number;
    negative: number;
    neutral: number;
    articles: NewsArticle[];
  }> {
    const articles = symbol 
      ? await this.getArticlesBySymbol(symbol)
      : await this.getRecentMarketArticles();

    const sentiments = articles.map(article => article.sentiment);
    const overall = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;
    
    const counts = sentiments.reduce(
      (acc, s) => {
        acc[s.label]++;
        return acc;
      },
      { positive: 0, negative: 0, neutral: 0 }
    );

    const total = articles.length;
    return {
      overall,
      positive: counts.positive / total,
      negative: counts.negative / total,
      neutral: counts.neutral / total,
      articles,
    };
  }

  async filterNews(filters: NewsFilterDto): Promise<NewsArticle[]> {
    let articles = await this.aggregateNews();

    if (filters.categories?.length) {
      articles = articles.filter(article =>
        (filters.categories ?? []).includes(article.category)
      );
    }

    if (filters.minReliabilityScore) {
      articles = articles.filter(article =>
        article.reliabilityScore >= filters.minReliabilityScore!
      );
    }

    if (filters.sentiment) {
      articles = articles.filter(article =>
        article.sentiment.label === filters.sentiment
      );
    }

    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      articles = articles.filter(article =>
        article.publishedAt >= start && article.publishedAt <= end
      );
    }

    if (filters.sources?.length) {
      articles = articles.filter(article =>
        (filters.sources ?? []).includes(article.source)
      );
    }

    return this.sortArticles(articles, filters.sortBy || 'relevance');
  }

  async createArticle(createNewsArticleDto: CreateNewsArticleDto): Promise<NewsArticle> {
    const reliabilityScore = await this.reliabilityScorer.scoreSource(createNewsArticleDto.source);
    const categories = await this.contentCategorizer.categorize(createNewsArticleDto);
    const sentiment = await this.sentimentAnalyzer.analyze(createNewsArticleDto.content);

    const article: NewsArticle = {
      ...createNewsArticleDto,
      id: this.generateId(),
      reliabilityScore,
      category: Array.isArray(categories) ? categories[0] : categories,
      sentiment,
      createdAt: new Date(),
      updatedAt: new Date(),
      relevanceScore: 0,
      language: '',
      isBreaking: false,
      isTrending: false,
      author: createNewsArticleDto.author ?? '', 
    };

    return article;
  }

  async updateArticle(id: string, updateNewsArticleDto: UpdateNewsArticleDto): Promise<NewsArticle> {
    const existingArticle = await this.findById(id);
    const updatedData = { ...existingArticle, ...updateNewsArticleDto };
    
    if (updateNewsArticleDto.content) {
      updatedData.sentiment = await this.sentimentAnalyzer.analyze(updateNewsArticleDto.content);
      const categories = await this.contentCategorizer.categorize(updatedData);
      updatedData.category = Array.isArray(categories) ? categories[0] : categories;
    }

    updatedData.updatedAt = new Date();
    return updatedData;
  }

  private async fetchFromSources(sources?: string[]): Promise<Partial<NewsArticle>[]> {
    return [];
  }

  private async getRecentArticles(timeframe: string): Promise<NewsArticle[]> {
    const now = new Date();
    const hours = timeframe === '1h' ? 1 : timeframe === '6h' ? 6 : 24;
    const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
    
    const articles = await this.aggregateNews();
    return articles.filter(article => article.publishedAt >= cutoff);
  }

  private async getArticlesBySymbol(symbol: string): Promise<NewsArticle[]> {
    const articles = await this.aggregateNews();
    return articles.filter(article =>
      article.content.toLowerCase().includes(symbol.toLowerCase()) ||
      article.title.toLowerCase().includes(symbol.toLowerCase())
    );
  }

  private async getRecentMarketArticles(): Promise<NewsArticle[]> {
    const articles = await this.aggregateNews();
    return articles.filter(article =>
      article.category.includes('finance') ||
      article.category.includes('markets') ||
      article.category.includes('economy')
    );
  }

  private async findById(id: string): Promise<NewsArticle> {
    const articles = await this.aggregateNews();
    const article = articles.find(a => a.id === id);
    if (!article) {
      throw new Error(`Article with id ${id} not found`);
    }
    return article;
  }

  private sortArticles(articles: NewsArticle[], sortBy: string): NewsArticle[] {
    switch (sortBy) {
      case 'date':
        return articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
      case 'reliability':
        return articles.sort((a, b) => b.reliabilityScore - a.reliabilityScore);
      case 'sentiment':
        return articles.sort((a, b) => b.sentiment.score - a.sentiment.score);
      default:
        return articles.sort((a, b) => 
          (b.reliabilityScore * 0.4 + b.sentiment.score * 0.3 + (b.engagementScore || 0) * 0.3) -
          (a.reliabilityScore * 0.4 + a.sentiment.score * 0.3 + (a.engagementScore || 0) * 0.3)
        );
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

}

