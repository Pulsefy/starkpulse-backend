import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DecentralizedSource } from '../entities/decentralized-source.entity';
import { NewsArticle } from '../entities/news-article.entity';
import { ContentVerification } from '../entities/content-verification.entity';
import {
  DecentralizedSourceDto,
  SourceVerificationDto,
} from '../dto/decentralized-source.dto';

export interface AggregationMetrics {
  totalSources: number;
  activeSources: number;
  articlesProcessed: number;
  verificationsPending: number;
  averageReliabilityScore: number;
  processingRate: number;
}

export interface NewsSourceConfig {
  name: string;
  url: string;
  type: 'RSS' | 'API' | 'BLOCKCHAIN' | 'IPFS' | 'SOCIAL';
  apiKey?: string;
  headers?: Record<string, string>;
  rateLimit?: number;
  priority: number;
  categories: string[];
}

@Injectable()
export class DecentralizedNewsAggregatorService {
  private readonly logger = new Logger(DecentralizedNewsAggregatorService.name);
  private readonly sourceConfigs: Map<string, NewsSourceConfig> = new Map();
  private readonly processedArticleHashes = new Set<string>();

  constructor(
    @InjectRepository(DecentralizedSource)
    private readonly sourceRepo: Repository<DecentralizedSource>,
    @InjectRepository(NewsArticle)
    private readonly articleRepo: Repository<NewsArticle>,
    @InjectRepository(ContentVerification)
    private readonly verificationRepo: Repository<ContentVerification>,
    private readonly httpService: HttpService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultSources();
  }

  private initializeDefaultSources(): void {
    const defaultSources: NewsSourceConfig[] = [
      {
        name: 'CoinDesk',
        url: 'https://feeds.coindesk.com/coindesk/rss',
        type: 'RSS',
        priority: 9,
        categories: ['crypto', 'finance', 'technology'],
        rateLimit: 100,
      },
      {
        name: 'Cointelegraph',
        url: 'https://cointelegraph.com/rss',
        type: 'RSS',
        priority: 9,
        categories: ['crypto', 'blockchain', 'technology'],
        rateLimit: 100,
      },
    ];

    defaultSources.forEach((source) => {
      this.sourceConfigs.set(source.name, source);
    });
  }

  async aggregateFromAllSources(): Promise<NewsArticle[]> {
    const startTime = Date.now();
    this.logger.log('Starting decentralized news aggregation from all sources');

    try {
      const sources = await this.getActiveSources();
      const aggregationPromises = sources.map((source) =>
        this.aggregateFromSource(source).catch((error: Error) => {
          this.logger.error(
            `Failed to aggregate from ${source.name}: ${error.message}`,
          );
          return [];
        }),
      );

      const results = await Promise.all(aggregationPromises);
      const allArticles = results.flat();

      const uniqueArticles = await this.deduplicateArticles(allArticles);
      const processedArticles = await this.processArticles(uniqueArticles);
      const processingTime = Date.now() - startTime;

      this.logger.log(
        `Aggregation completed: ${processedArticles.length} articles from ${sources.length} sources in ${processingTime}ms`,
      );

      return processedArticles;
    } catch (error) {
      this.logger.error(`News aggregation failed: ${(error as Error).message}`);
      throw error;
    }
  }

  async aggregateFromSource(
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    try {
      let articles: NewsArticle[] = [];

      switch (source.type) {
        case 'RSS':
          articles = await this.aggregateFromRSS(source);
          break;
        case 'API':
          articles = await this.aggregateFromAPI(source);
          break;
        case 'BLOCKCHAIN':
          articles = await this.aggregateFromBlockchain(source);
          break;
        case 'IPFS':
          articles = await this.aggregateFromIPFS(source);
          break;
        case 'SOCIAL':
          articles = await this.aggregateFromSocial(source);
          break;
        default:
          this.logger.warn(`Unknown source type for ${source.name}`);
      }

      await this.updateSourceMetrics(source, articles.length);
      return articles;
    } catch (error) {
      this.logger.error(
        `Failed to aggregate from source ${source.name}: ${(error as Error).message}`,
      );
      await this.markSourceError(source, (error as Error).message);
      return [];
    }
  }

  private async aggregateFromRSS(
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    const response = await firstValueFrom(
      this.httpService.get(source.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'StarkPulse-NewsAggregator/1.0',
        },
      }),
    );

    return this.parseRSSContent(response.data, source);
  }

  private async aggregateFromAPI(
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    const config = this.sourceConfigs.get(source.name);
    const headers = {
      'User-Agent': 'StarkPulse-NewsAggregator/1.0',
      ...config?.headers,
    };

    if (config?.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await firstValueFrom(
      this.httpService.get(source.url, {
        timeout: 15000,
        headers,
      }),
    );

    return this.parseAPIResponse(response.data, source);
  }

  private async aggregateFromBlockchain(
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];

    const mockBlockchainData = {
      title: 'Blockchain News Event',
      content: 'Decentralized news content from blockchain',
      url: `https://starkscan.co/source/${source.id}`,
      author: 'Blockchain',
      publishedAt: new Date(),
    };

    const article = this.createNewsArticle({
      ...mockBlockchainData,
      source: source.name,
      categories: source.categories || ['blockchain'],
    });

    articles.push(article);
    return articles;
  }

  private async aggregateFromIPFS(
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    const ipfsHash = source.url.replace('ipfs://', '');
    const ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`;

    const response = await firstValueFrom(
      this.httpService.get(ipfsUrl, {
        timeout: 20000,
      }),
    );

    return this.parseIPFSContent(response.data, source);
  }

  private async aggregateFromSocial(
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    const config = this.sourceConfigs.get(source.name);
    if (!config?.apiKey) {
      throw new Error('API key required for social media sources');
    }

    const query = this.buildSocialMediaQuery(source.categories || []);
    const response = await firstValueFrom(
      this.httpService.get(source.url, {
        timeout: 10000,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
        params: {
          query,
          max_results: 100,
        },
      }),
    );

    return this.parseSocialMediaResponse(response.data, source);
  }

  private async parseRSSContent(
    rssData: string,
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    const itemMatches = rssData.match(/<item>(.*?)<\/item>/gs) || [];

    for (const itemMatch of itemMatches.slice(0, 20)) {
      try {
        const title = this.extractTagContent(itemMatch, 'title');
        const description = this.extractTagContent(itemMatch, 'description');
        const link = this.extractTagContent(itemMatch, 'link');
        const pubDate = this.extractTagContent(itemMatch, 'pubDate');

        if (title && description && link) {
          const article = this.createNewsArticle({
            title: this.cleanHtml(title),
            content: this.cleanHtml(description),
            url: link,
            source: source.name,
            publishedAt: pubDate ? new Date(pubDate) : new Date(),
            categories: source.categories || ['general'],
          });

          articles.push(article);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse RSS item: ${(error as Error).message}`,
        );
      }
    }

    return articles;
  }

  private async parseAPIResponse(
    data: any,
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    let items = data.articles || data.posts || data.data || data.items || [];
    if (!Array.isArray(items)) {
      items = [data];
    }

    for (const item of items.slice(0, 50)) {
      try {
        const article = this.createNewsArticle({
          title: item.title || item.name || item.subject || 'Untitled',
          content:
            item.description || item.content || item.body || item.text || '',
          url:
            item.url ||
            item.link ||
            item.permalink ||
            `${source.url}/${item.id}`,
          source: source.name,
          author: item.author?.name || item.author || item.creator || 'Unknown',
          publishedAt:
            item.published_at || item.created_at || item.date || new Date(),
          imageUrl: item.image || item.featured_image || item.thumbnail,
          categories: source.categories || ['general'],
        });

        articles.push(article);
      } catch (error) {
        this.logger.warn(
          `Failed to parse API item: ${(error as Error).message}`,
        );
      }
    }

    return articles;
  }

  private async parseIPFSContent(
    data: any,
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];

    try {
      const content = typeof data === 'string' ? JSON.parse(data) : data;
      const items = Array.isArray(content) ? content : [content];

      for (const item of items.slice(0, 30)) {
        const article = this.createNewsArticle({
          title: item.title || 'IPFS News Item',
          content: item.content || item.description || '',
          url: item.url || `${source.url}#${item.id}`,
          source: source.name,
          author: item.author || 'IPFS',
          publishedAt: item.timestamp ? new Date(item.timestamp) : new Date(),
          categories: source.categories || ['decentralized'],
          metadata: {
            ipfsHash: source.url.replace('ipfs://', ''),
            decentralized: true,
          },
        });

        articles.push(article);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to parse IPFS content: ${(error as Error).message}`,
      );
    }

    return articles;
  }

  private async parseSocialMediaResponse(
    data: any,
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    const tweets = data.data || [];

    for (const tweet of tweets.slice(0, 50)) {
      try {
        const article = this.createNewsArticle({
          title: `Social Media Post: ${tweet.text.substring(0, 100)}...`,
          content: tweet.text,
          url: `https://twitter.com/user/status/${tweet.id}`,
          source: source.name,
          author: tweet.author_id || 'Social Media User',
          publishedAt: new Date(tweet.created_at),
          categories: source.categories || ['social'],
          metadata: {
            engagement: tweet.public_metrics,
            social: true,
            platform: 'twitter',
          },
        });

        articles.push(article);
      } catch (error) {
        this.logger.warn(
          `Failed to parse social media item: ${(error as Error).message}`,
        );
      }
    }

    return articles;
  }

  private createNewsArticle(data: Partial<NewsArticle>): NewsArticle {
    const article = new NewsArticle();

    article.id = this.generateArticleId(data.url!, data.title!);
    article.title = data.title!;
    article.content = data.content!;
    article.url = data.url!;
    article.source = data.source!;
    article.author = data.author || 'Unknown';
    article.publishedAt = data.publishedAt || new Date();
    article.imageUrl = data.imageUrl;
    article.category = Array.isArray(data.categories)
      ? data.categories[0]
      : 'general';
    article.tags = data.categories || [];
    article.metadata = data.metadata || {};
    article.language = 'en';

    return article;
  }

  private async deduplicateArticles(
    articles: NewsArticle[],
  ): Promise<NewsArticle[]> {
    const seen = new Set<string>();
    const unique: NewsArticle[] = [];

    for (const article of articles) {
      const hash = this.generateContentHash(article);

      if (!seen.has(hash) && !this.processedArticleHashes.has(hash)) {
        seen.add(hash);
        this.processedArticleHashes.add(hash);
        unique.push(article);
      }
    }

    return unique;
  }

  private async processArticles(
    articles: NewsArticle[],
  ): Promise<NewsArticle[]> {
    return articles;
  }

  private async getActiveSources(): Promise<DecentralizedSource[]> {
    return this.sourceRepo.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });
  }

  private generateArticleId(url: string, title: string): string {
    const hash = require('crypto').createHash('md5');
    hash.update(url + title);
    return hash.digest('hex');
  }

  private generateContentHash(article: NewsArticle): string {
    const hash = require('crypto').createHash('md5');
    hash.update(article.title + article.content.substring(0, 500));
    return hash.digest('hex');
  }

  private extractTagContent(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'is');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  private cleanHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  private buildSocialMediaQuery(categories: string[]): string {
    const keywords = [
      'crypto',
      'blockchain',
      'DeFi',
      'Web3',
      'StarkNet',
      'Ethereum',
      ...categories,
    ];
    return keywords.map((k) => `"${k}"`).join(' OR ');
  }

  private async updateSourceMetrics(
    source: DecentralizedSource,
    articleCount: number,
  ): Promise<void> {
    source.lastFetched = new Date();
    source.articleCount = (source.articleCount || 0) + articleCount;
    await this.sourceRepo.save(source);
  }

  private async markSourceError(
    source: DecentralizedSource,
    error: string,
  ): Promise<void> {
    source.lastError = error;
    source.errorCount = (source.errorCount || 0) + 1;
    source.lastFetched = new Date();
    await this.sourceRepo.save(source);
  }

  private async getPendingVerifications(): Promise<number> {
    return this.verificationRepo.count({
      where: { status: 'PENDING' },
    });
  }

  private calculateAverageReliability(sources: DecentralizedSource[]): number {
    if (sources.length === 0) return 0;
    const total = sources.reduce(
      (sum, source) => sum + (source.reliabilityScore || 0),
      0,
    );
    return total / sources.length;
  }

  async getAggregationMetrics(): Promise<AggregationMetrics> {
    const sources = await this.getActiveSources();
    return {
      totalSources: sources.length,
      activeSources: sources.filter(
        (s) =>
          s.lastVerified &&
          s.lastVerified > new Date(Date.now() - 24 * 60 * 60 * 1000),
      ).length,
      articlesProcessed: 0,
      verificationsPending: await this.getPendingVerifications(),
      averageReliabilityScore: this.calculateAverageReliability(sources),
      processingRate: 0,
    };
  }

  async addDecentralizedSource(
    sourceDto: DecentralizedSourceDto,
  ): Promise<DecentralizedSource> {
    const source = this.sourceRepo.create({
      ...sourceDto,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedSource = await this.sourceRepo.save(source);

    this.sourceConfigs.set(savedSource.name, {
      name: savedSource.name,
      url: savedSource.url,
      type: savedSource.type,
      priority: 5,
      categories: savedSource.categories || ['general'],
    });

    this.eventEmitter.emit('news.source.added', savedSource);

    return savedSource;
  }

  async verifySource(sourceId: string): Promise<SourceVerificationDto> {
    const source = await this.sourceRepo.findOne({ where: { id: sourceId } });
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    let verificationScore = 0;
    let status: 'VERIFIED' | 'PENDING' | 'FAILED' | 'FLAGGED' = 'PENDING';

    switch (source.type) {
      case 'RSS':
      case 'API':
        verificationScore = await this.verifyHttpSource(source);
        break;
      case 'BLOCKCHAIN':
        verificationScore = 0.9;
        break;
      case 'IPFS':
        verificationScore = await this.verifyIPFSSource(source);
        break;
      case 'SOCIAL':
        verificationScore = 0.6;
        break;
    }

    if (verificationScore >= 0.8) status = 'VERIFIED';
    else if (verificationScore >= 0.5) status = 'PENDING';
    else if (verificationScore < 0.3) status = 'FLAGGED';
    else status = 'FAILED';

    source.reliabilityScore = verificationScore;
    source.lastVerified = new Date();
    await this.sourceRepo.save(source);

    const verification: SourceVerificationDto = {
      sourceId,
      status,
      verificationScore,
      timestamp: new Date(),
      details: `Verification completed with score: ${verificationScore}`,
    };

    const verificationEntity = this.verificationRepo.create({
      sourceId,
      status,
      score: verificationScore,
      timestamp: new Date(),
      method: 'automated',
    });
    await this.verificationRepo.save(verificationEntity);

    return verification;
  }

  private async verifyHttpSource(source: DecentralizedSource): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.head(source.url, { timeout: 5000 }),
      );

      let score = 0.5;

      if (response.status === 200) score += 0.2;

      const contentType = response.headers['content-type'];
      if (contentType?.includes('xml') || contentType?.includes('json'))
        score += 0.1;

      if (response.headers['strict-transport-security']) score += 0.1;
      if (response.headers['x-content-type-options']) score += 0.05;

      if (source.url.startsWith('https://')) score += 0.05;

      return Math.min(1, score);
    } catch (error) {
      return 0.1;
    }
  }

  private async verifyIPFSSource(source: DecentralizedSource): Promise<number> {
    try {
      const ipfsHash = source.url.replace('ipfs://', '');
      const ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`;

      const response = await firstValueFrom(
        this.httpService.head(ipfsUrl, { timeout: 10000 }),
      );

      return response.status === 200 ? 0.8 : 0.3;
    } catch (error) {
      return 0.2;
    }
  }
}

export interface AggregationMetrics {
  totalSources: number;
  activeSources: number;
  articlesProcessed: number;
  verificationsPending: number;
  averageReliabilityScore: number;
  processingRate: number;
}

export interface NewsSourceConfig {
  name: string;
  url: string;
  type: 'RSS' | 'API' | 'BLOCKCHAIN' | 'IPFS' | 'SOCIAL';
  apiKey?: string;
  headers?: Record<string, string>;
  rateLimit?: number;
  priority: number;
  categories: string[];
}

@Injectable()
export class DecentralizedNewsAggregatorService {
  private readonly logger = new Logger(DecentralizedNewsAggregatorService.name);
  private readonly processingQueue = new Map<string, Promise<any>>();
  private readonly sourceConfigs: Map<string, NewsSourceConfig> = new Map();
  private readonly processedArticleHashes = new Set<string>();

  constructor(
    @InjectRepository(DecentralizedSource)
    private readonly sourceRepo: Repository<DecentralizedSource>,
    @InjectRepository(NewsArticle)
    private readonly articleRepo: Repository<NewsArticle>,
    @InjectRepository(ContentVerification)
    private readonly verificationRepo: Repository<ContentVerification>,
    private readonly httpService: HttpService,
    private readonly blockchainService: BlockchainService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultSources();
  }

  private initializeDefaultSources(): void {
    const defaultSources: NewsSourceConfig[] = [
      // Traditional Crypto News
      {
        name: 'CoinDesk',
        url: 'https://feeds.coindesk.com/coindesk/rss',
        type: 'RSS',
        priority: 9,
        categories: ['crypto', 'finance', 'technology'],
        rateLimit: 100,
      },
      {
        name: 'Cointelegraph',
        url: 'https://cointelegraph.com/rss',
        type: 'RSS',
        priority: 9,
        categories: ['crypto', 'blockchain', 'technology'],
        rateLimit: 100,
      },
      {
        name: 'The Block',
        url: 'https://www.theblockcrypto.com/rss.xml',
        type: 'RSS',
        priority: 8,
        categories: ['crypto', 'defi', 'analysis'],
        rateLimit: 80,
      },
      // Decentralized Sources
      {
        name: 'Mirror Protocol',
        url: 'https://mirror.xyz/api/feed',
        type: 'API',
        priority: 7,
        categories: ['crypto', 'defi', 'web3'],
        rateLimit: 60,
      },
      {
        name: 'Lens Protocol',
        url: 'https://api.lens.dev/posts',
        type: 'API',
        priority: 6,
        categories: ['social', 'web3', 'community'],
        rateLimit: 120,
      },
      // Blockchain-based Sources
      {
        name: 'StarkNet Events',
        url: 'starknet://events/news',
        type: 'BLOCKCHAIN',
        priority: 8,
        categories: ['starknet', 'ethereum', 'l2'],
        rateLimit: 50,
      },
      // IPFS Sources
      {
        name: 'IPFS News Archive',
        url: 'ipfs://QmNewsHash',
        type: 'IPFS',
        priority: 5,
        categories: ['decentralized', 'archive'],
        rateLimit: 30,
      },
      // Social Media
      {
        name: 'Crypto Twitter',
        url: 'https://api.twitter.com/2/tweets/search/recent',
        type: 'SOCIAL',
        priority: 6,
        categories: ['social', 'sentiment', 'trending'],
        rateLimit: 300,
      },
    ];

    defaultSources.forEach((source) => {
      this.sourceConfigs.set(source.name, source);
    });
  }

  async aggregateFromAllSources(): Promise<NewsArticle[]> {
    const startTime = Date.now();
    this.logger.log('Starting decentralized news aggregation from all sources');

    try {
      const sources = await this.getActiveSources();
      const aggregationPromises = sources.map((source) =>
        this.aggregateFromSource(source).catch((error) => {
          this.logger.error(
            `Failed to aggregate from ${source.name}: ${error.message}`,
          );
          return [];
        }),
      );

      const results = await Promise.all(aggregationPromises);
      const allArticles = results.flat();

      // Remove duplicates and process articles
      const uniqueArticles = await this.deduplicateArticles(allArticles);
      const processedArticles = await this.processArticles(uniqueArticles);

      const processingTime = Date.now() - startTime;

      await this.updateAggregationMetrics({
        totalSources: sources.length,
        activeSources: sources.filter(
          (s) =>
            s.lastVerified &&
            s.lastVerified > new Date(Date.now() - 24 * 60 * 60 * 1000),
        ).length,
        articlesProcessed: processedArticles.length,
        verificationsPending: await this.getPendingVerifications(),
        averageReliabilityScore: this.calculateAverageReliability(sources),
        processingRate: processedArticles.length / (processingTime / 1000),
      });

      this.eventEmitter.emit('news.aggregation.completed', {
        articlesCount: processedArticles.length,
        sourcesCount: sources.length,
        processingTime,
      });

      this.logger.log(
        `Aggregation completed: ${processedArticles.length} articles from ${sources.length} sources in ${processingTime}ms`,
      );

      return processedArticles;
    } catch (error) {
      this.logger.error(`News aggregation failed: ${error.message}`);
      throw error;
    }
  }

  async aggregateFromSource(
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    const cacheKey = `news:source:${source.id}:${Math.floor(Date.now() / (5 * 60 * 1000))}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    try {
      let articles: NewsArticle[] = [];

      switch (source.type) {
        case 'RSS':
          articles = await this.aggregateFromRSS(source);
          break;
        case 'API':
          articles = await this.aggregateFromAPI(source);
          break;
        case 'BLOCKCHAIN':
          articles = await this.aggregateFromBlockchain(source);
          break;
        case 'IPFS':
          articles = await this.aggregateFromIPFS(source);
          break;
        case 'SOCIAL':
          articles = await this.aggregateFromSocial(source);
          break;
        default:
          this.logger.warn(`Unknown source type: ${source.type}`);
      }

      // Cache results for 5 minutes
      await this.redisService.set(cacheKey, JSON.stringify(articles), 300);

      // Update source metrics
      await this.updateSourceMetrics(source, articles.length);

      return articles;
    } catch (error) {
      this.logger.error(
        `Failed to aggregate from source ${source.name}: ${error.message}`,
      );
      await this.markSourceError(source, error.message);
      return [];
    }
  }

  private async aggregateFromRSS(
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(source.url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'StarkPulse-NewsAggregator/1.0',
          },
        }),
      );

      const articles = await this.parseRSSContent(response.data, source);
      return articles;
    } catch (error) {
      throw new Error(`RSS aggregation failed: ${error.message}`);
    }
  }

  private async aggregateFromAPI(
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    try {
      const config = this.sourceConfigs.get(source.name);
      const headers = {
        'User-Agent': 'StarkPulse-NewsAggregator/1.0',
        ...config?.headers,
      };

      if (config?.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const response = await firstValueFrom(
        this.httpService.get(source.url, {
          timeout: 15000,
          headers,
        }),
      );

      return this.parseAPIResponse(response.data, source);
    } catch (error) {
      throw new Error(`API aggregation failed: ${error.message}`);
    }
  }

  private async aggregateFromBlockchain(
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    try {
      // Extract contract address and event type from blockchain URL
      const urlParts = source.url.replace('starknet://', '').split('/');
      const contractAddress = urlParts[0];
      const eventType = urlParts[1] || 'NewsPublished';

      const events = await this.blockchainService.getEvents(0); // Get recent events
      const newsEvents = events.filter(
        (event) =>
          event.contractAddress === contractAddress &&
          event.eventName === eventType,
      );

      const articles: NewsArticle[] = [];
      for (const event of newsEvents) {
        const article = await this.parseBlockchainEvent(event, source);
        if (article) {
          articles.push(article);
        }
      }

      return articles;
    } catch (error) {
      throw new Error(`Blockchain aggregation failed: ${error.message}`);
    }
  }

  private async aggregateFromIPFS(
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    try {
      // Extract IPFS hash from URL
      const ipfsHash = source.url.replace('ipfs://', '');
      const ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`;

      const response = await firstValueFrom(
        this.httpService.get(ipfsUrl, {
          timeout: 20000,
        }),
      );

      return this.parseIPFSContent(response.data, source);
    } catch (error) {
      throw new Error(`IPFS aggregation failed: ${error.message}`);
    }
  }

  private async aggregateFromSocial(
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    try {
      const config = this.sourceConfigs.get(source.name);
      if (!config?.apiKey) {
        throw new Error('API key required for social media sources');
      }

      // Implement Twitter/social media specific logic
      const query = this.buildSocialMediaQuery(source.categories || []);
      const response = await firstValueFrom(
        this.httpService.get(source.url, {
          timeout: 10000,
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
          },
          params: {
            query,
            max_results: 100,
            'tweet.fields': 'created_at,public_metrics,context_annotations',
          },
        }),
      );

      return this.parseSocialMediaResponse(response.data, source);
    } catch (error) {
      throw new Error(`Social media aggregation failed: ${error.message}`);
    }
  }

  private async parseRSSContent(
    rssData: string,
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    // Simplified RSS parsing - in production, use a proper RSS parser
    const articles: NewsArticle[] = [];

    // This is a simplified implementation - would use xml2js or similar
    const itemMatches = rssData.match(/<item>(.*?)<\/item>/gs) || [];

    for (const itemMatch of itemMatches.slice(0, 20)) {
      // Limit to 20 articles
      try {
        const title = this.extractTagContent(itemMatch, 'title');
        const description = this.extractTagContent(itemMatch, 'description');
        const link = this.extractTagContent(itemMatch, 'link');
        const pubDate = this.extractTagContent(itemMatch, 'pubDate');

        if (title && description && link) {
          const article = this.createNewsArticle({
            title: this.cleanHtml(title),
            content: this.cleanHtml(description),
            url: link,
            source: source.name,
            publishedAt: pubDate ? new Date(pubDate) : new Date(),
            categories: source.categories || ['general'],
          });

          articles.push(article);
        }
      } catch (error) {
        this.logger.warn(`Failed to parse RSS item: ${error.message}`);
      }
    }

    return articles;
  }

  private async parseAPIResponse(
    data: any,
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];

    // Handle different API response formats
    let items = data.articles || data.posts || data.data || data.items || [];
    if (!Array.isArray(items)) {
      items = [data];
    }

    for (const item of items.slice(0, 50)) {
      // Limit to 50 articles
      try {
        const article = this.createNewsArticle({
          title: item.title || item.name || item.subject || 'Untitled',
          content:
            item.description || item.content || item.body || item.text || '',
          url:
            item.url ||
            item.link ||
            item.permalink ||
            `${source.url}/${item.id}`,
          source: source.name,
          author: item.author?.name || item.author || item.creator || 'Unknown',
          publishedAt:
            item.published_at || item.created_at || item.date || new Date(),
          imageUrl: item.image || item.featured_image || item.thumbnail,
          categories: source.categories || ['general'],
        });

        articles.push(article);
      } catch (error) {
        this.logger.warn(`Failed to parse API item: ${error.message}`);
      }
    }

    return articles;
  }

  private async parseBlockchainEvent(
    event: any,
    source: DecentralizedSource,
  ): Promise<NewsArticle | null> {
    try {
      // Parse blockchain event data for news content
      const eventData = event.returnValues || event.data || {};

      return this.createNewsArticle({
        title: eventData.title || `Blockchain News Event #${event.blockNumber}`,
        content:
          eventData.content ||
          eventData.description ||
          'Blockchain-verified news content',
        url: `https://starkscan.co/tx/${event.transactionHash}`,
        source: source.name,
        author: eventData.author || 'Blockchain',
        publishedAt: new Date(event.timestamp * 1000),
        categories: source.categories || ['blockchain'],
        metadata: {
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
          verified: true,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to parse blockchain event: ${error.message}`);
      return null;
    }
  }

  private async parseIPFSContent(
    data: any,
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];

    try {
      const content = typeof data === 'string' ? JSON.parse(data) : data;
      const items = Array.isArray(content) ? content : [content];

      for (const item of items.slice(0, 30)) {
        // Limit to 30 articles
        const article = this.createNewsArticle({
          title: item.title || 'IPFS News Item',
          content: item.content || item.description || '',
          url: item.url || `${source.url}#${item.id}`,
          source: source.name,
          author: item.author || 'IPFS',
          publishedAt: item.timestamp ? new Date(item.timestamp) : new Date(),
          categories: source.categories || ['decentralized'],
          metadata: {
            ipfsHash: source.url.replace('ipfs://', ''),
            decentralized: true,
          },
        });

        articles.push(article);
      }
    } catch (error) {
      this.logger.warn(`Failed to parse IPFS content: ${error.message}`);
    }

    return articles;
  }

  private async parseSocialMediaResponse(
    data: any,
    source: DecentralizedSource,
  ): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    const tweets = data.data || [];

    for (const tweet of tweets.slice(0, 50)) {
      // Limit to 50 tweets
      try {
        const article = this.createNewsArticle({
          title: `Social Media Post: ${tweet.text.substring(0, 100)}...`,
          content: tweet.text,
          url: `https://twitter.com/user/status/${tweet.id}`,
          source: source.name,
          author: tweet.author_id || 'Social Media User',
          publishedAt: new Date(tweet.created_at),
          categories: source.categories || ['social'],
          metadata: {
            engagement: tweet.public_metrics,
            social: true,
            platform: 'twitter',
          },
        });

        articles.push(article);
      } catch (error) {
        this.logger.warn(`Failed to parse social media item: ${error.message}`);
      }
    }

    return articles;
  }

  private createNewsArticle(data: Partial<NewsArticle>): NewsArticle {
    const article = new NewsArticle();

    article.id = this.generateArticleId(data.url!, data.title!);
    article.title = data.title!;
    article.content = data.content!;
    article.url = data.url!;
    article.source = data.source!;
    article.author = data.author || 'Unknown';
    article.publishedAt = data.publishedAt || new Date();
    article.imageUrl = data.imageUrl;
    article.category = Array.isArray(data.categories)
      ? data.categories[0]
      : 'general';
    article.tags = data.categories || [];
    article.metadata = data.metadata || {};
    article.language = 'en';

    return article;
  }

  private async deduplicateArticles(
    articles: NewsArticle[],
  ): Promise<NewsArticle[]> {
    const seen = new Set<string>();
    const unique: NewsArticle[] = [];

    for (const article of articles) {
      const hash = this.generateContentHash(article);

      if (!seen.has(hash) && !this.processedArticleHashes.has(hash)) {
        seen.add(hash);
        this.processedArticleHashes.add(hash);
        unique.push(article);
      }
    }

    // Clean up old hashes to prevent memory bloat
    if (this.processedArticleHashes.size > 10000) {
      const hashArray = Array.from(this.processedArticleHashes);
      this.processedArticleHashes.clear();
      hashArray
        .slice(-5000)
        .forEach((hash) => this.processedArticleHashes.add(hash));
    }

    return unique;
  }

  private async processArticles(
    articles: NewsArticle[],
  ): Promise<NewsArticle[]> {
    // This would integrate with sentiment analysis, categorization, etc.
    return articles;
  }

  private async getActiveSources(): Promise<DecentralizedSource[]> {
    return this.sourceRepo.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });
  }

  private generateArticleId(url: string, title: string): string {
    const hash = require('crypto').createHash('md5');
    hash.update(url + title);
    return hash.digest('hex');
  }

  private generateContentHash(article: NewsArticle): string {
    const hash = require('crypto').createHash('md5');
    hash.update(article.title + article.content.substring(0, 500));
    return hash.digest('hex');
  }

  private extractTagContent(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'is');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  private cleanHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  private buildSocialMediaQuery(categories: string[]): string {
    const keywords = [
      'crypto',
      'blockchain',
      'DeFi',
      'Web3',
      'StarkNet',
      'Ethereum',
      ...categories,
    ];
    return keywords.map((k) => `"${k}"`).join(' OR ');
  }

  private async updateSourceMetrics(
    source: DecentralizedSource,
    articleCount: number,
  ): Promise<void> {
    source.lastFetched = new Date();
    source.articleCount = (source.articleCount || 0) + articleCount;
    await this.sourceRepo.save(source);
  }

  private async markSourceError(
    source: DecentralizedSource,
    error: string,
  ): Promise<void> {
    source.lastError = error;
    source.errorCount = (source.errorCount || 0) + 1;
    source.lastFetched = new Date();
    await this.sourceRepo.save(source);
  }

  private async updateAggregationMetrics(
    metrics: AggregationMetrics,
  ): Promise<void> {
    await this.redisService.set(
      'news:aggregation:metrics',
      JSON.stringify(metrics),
      3600,
    );
  }

  private async getPendingVerifications(): Promise<number> {
    return this.verificationRepo.count({
      where: { status: 'PENDING' },
    });
  }

  private calculateAverageReliability(sources: DecentralizedSource[]): number {
    if (sources.length === 0) return 0;
    const total = sources.reduce(
      (sum, source) => sum + (source.reliabilityScore || 0),
      0,
    );
    return total / sources.length;
  }

  async getAggregationMetrics(): Promise<AggregationMetrics> {
    const cached = await this.redisService.get('news:aggregation:metrics');
    if (cached) {
      return JSON.parse(cached);
    }

    // Return default metrics if no cached data
    return {
      totalSources: 0,
      activeSources: 0,
      articlesProcessed: 0,
      verificationsPending: 0,
      averageReliabilityScore: 0,
      processingRate: 0,
    };
  }

  async addDecentralizedSource(
    sourceDto: DecentralizedSourceDto,
  ): Promise<DecentralizedSource> {
    const source = this.sourceRepo.create({
      ...sourceDto,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedSource = await this.sourceRepo.save(source);

    // Add to source configs for processing
    this.sourceConfigs.set(savedSource.name, {
      name: savedSource.name,
      url: savedSource.url,
      type: savedSource.type,
      priority: 5, // Default priority
      categories: savedSource.categories || ['general'],
    });

    this.eventEmitter.emit('news.source.added', savedSource);

    return savedSource;
  }

  async verifySource(sourceId: string): Promise<SourceVerificationDto> {
    const source = await this.sourceRepo.findOne({ where: { id: sourceId } });
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    try {
      // Perform verification based on source type
      let verificationScore = 0;
      let status: 'VERIFIED' | 'PENDING' | 'FAILED' | 'FLAGGED' = 'PENDING';

      switch (source.type) {
        case 'RSS':
        case 'API':
          verificationScore = await this.verifyHttpSource(source);
          break;
        case 'BLOCKCHAIN':
          verificationScore = await this.verifyBlockchainSource(source);
          break;
        case 'IPFS':
          verificationScore = await this.verifyIPFSSource(source);
          break;
        case 'SOCIAL':
          verificationScore = await this.verifySocialSource(source);
          break;
      }

      if (verificationScore >= 0.8) status = 'VERIFIED';
      else if (verificationScore >= 0.5) status = 'PENDING';
      else if (verificationScore < 0.3) status = 'FLAGGED';
      else status = 'FAILED';

      // Update source verification
      source.reliabilityScore = verificationScore;
      source.lastVerified = new Date();
      await this.sourceRepo.save(source);

      const verification: SourceVerificationDto = {
        sourceId,
        status,
        verificationScore,
        timestamp: new Date(),
        details: `Verification completed with score: ${verificationScore}`,
      };

      // Save verification record
      const verificationEntity = this.verificationRepo.create({
        sourceId,
        status,
        score: verificationScore,
        timestamp: new Date(),
        method: 'automated',
      });
      await this.verificationRepo.save(verificationEntity);

      return verification;
    } catch (error) {
      this.logger.error(
        `Source verification failed for ${sourceId}: ${error.message}`,
      );
      throw error;
    }
  }

  private async verifyHttpSource(source: DecentralizedSource): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.head(source.url, { timeout: 5000 }),
      );

      let score = 0.5; // Base score

      // Check response status
      if (response.status === 200) score += 0.2;

      // Check content type
      const contentType = response.headers['content-type'];
      if (contentType?.includes('xml') || contentType?.includes('json'))
        score += 0.1;

      // Check security headers
      if (response.headers['strict-transport-security']) score += 0.1;
      if (response.headers['x-content-type-options']) score += 0.05;

      // Check if HTTPS
      if (source.url.startsWith('https://')) score += 0.05;

      return Math.min(1, score);
    } catch (error) {
      return 0.1; // Low score for failed verification
    }
  }

  private async verifyBlockchainSource(
    source: DecentralizedSource,
  ): Promise<number> {
    try {
      // Extract contract address from blockchain URL
      const contractAddress = source.url
        .replace('starknet://', '')
        .split('/')[0];

      // Verify contract exists and is accessible
      const events = await this.blockchainService.getEvents(0);
      const hasEvents = events.some(
        (event) => event.contractAddress === contractAddress,
      );

      return hasEvents ? 0.9 : 0.3; // High score if contract is active
    } catch (error) {
      return 0.2;
    }
  }

  private async verifyIPFSSource(source: DecentralizedSource): Promise<number> {
    try {
      const ipfsHash = source.url.replace('ipfs://', '');
      const ipfsUrl = `https://ipfs.io/ipfs/${ipfsHash}`;

      const response = await firstValueFrom(
        this.httpService.head(ipfsUrl, { timeout: 10000 }),
      );

      return response.status === 200 ? 0.8 : 0.3;
    } catch (error) {
      return 0.2;
    }
  }

  private async verifySocialSource(
    source: DecentralizedSource,
  ): Promise<number> {
    // Social sources would require API keys and specific verification
    return 0.6; // Default score for social sources
  }
}
