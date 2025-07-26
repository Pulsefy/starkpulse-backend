import { Test, TestingModule } from '@nestjs/testing';
import { DecentralizedNewsAggregatorService } from './decentralized-news-aggregator.service';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { of, throwError } from 'rxjs';

describe('DecentralizedNewsAggregatorService', () => {
  let service: DecentralizedNewsAggregatorService;
  let httpService: HttpService;
  let eventEmitter: EventEmitter2;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecentralizedNewsAggregatorService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<DecentralizedNewsAggregatorService>(
      DecentralizedNewsAggregatorService,
    );
    httpService = module.get<HttpService>(HttpService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('aggregateFromAllSources', () => {
    it('should aggregate news from all decentralized sources', async () => {
      // Mock responses for different source types
      const mockRssResponse = {
        data: `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Test RSS Article</title>
              <description>Test description</description>
              <link>https://example.com/rss-article</link>
              <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>`,
      };

      const mockApiResponse = {
        data: {
          articles: [
            {
              title: 'Test API Article',
              content: 'Test API content',
              url: 'https://example.com/api-article',
              publishedAt: '2024-01-01T12:00:00Z',
              source: { name: 'Test Source' },
            },
          ],
        },
      };

      mockHttpService.get.mockImplementation((url: string) => {
        if (url.includes('rss') || url.includes('xml')) {
          return of(mockRssResponse);
        } else {
          return of(mockApiResponse);
        }
      });

      const result = await service.aggregateFromAllSources({
        maxArticles: 100,
        timeRange: { hours: 24 },
        categories: ['crypto', 'blockchain'],
        qualityThreshold: 0.5,
        enableVerification: true,
        enableDeduplication: true,
      });

      expect(result).toBeDefined();
      expect(result.articles).toBeInstanceOf(Array);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.totalSources).toBeGreaterThan(0);
      expect(result.metrics.successfulSources).toBeGreaterThan(0);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'news.aggregation.completed',
        expect.any(Object),
      );
    });

    it('should handle API failures gracefully', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      const result = await service.aggregateFromAllSources({
        maxArticles: 100,
        timeRange: { hours: 24 },
        categories: ['crypto'],
        qualityThreshold: 0.5,
        enableVerification: false,
        enableDeduplication: false,
      });

      expect(result).toBeDefined();
      expect(result.articles).toBeInstanceOf(Array);
      expect(result.metrics.failedSources).toBeGreaterThan(0);
    });

    it('should respect maximum article limits', async () => {
      const mockLargeResponse = {
        data: {
          articles: Array(200).fill({
            title: 'Test Article',
            content: 'Test content',
            url: 'https://example.com/article',
            publishedAt: '2024-01-01T12:00:00Z',
            source: { name: 'Test Source' },
          }),
        },
      };

      mockHttpService.get.mockReturnValue(of(mockLargeResponse));

      const result = await service.aggregateFromAllSources({
        maxArticles: 50,
        timeRange: { hours: 24 },
        categories: ['crypto'],
        qualityThreshold: 0.5,
        enableVerification: false,
        enableDeduplication: false,
      });

      expect(result.articles.length).toBeLessThanOrEqual(50);
    });
  });

  describe('aggregateFromSource', () => {
    it('should aggregate from a specific RSS source', async () => {
      const mockRssSource = {
        id: 'test-rss',
        name: 'Test RSS Source',
        type: 'rss' as const,
        url: 'https://example.com/feed.xml',
        isActive: true,
        reliability: 0.9,
        lastUpdated: new Date(),
      };

      const mockRssResponse = {
        data: `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Bitcoin Reaches New High</title>
              <description>Bitcoin price analysis</description>
              <link>https://example.com/bitcoin-high</link>
              <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>`,
      };

      mockHttpService.get.mockReturnValue(of(mockRssResponse));

      const result = await service.aggregateFromSource(mockRssSource, {
        maxArticles: 10,
        timeRange: { hours: 24 },
        categories: ['crypto'],
        qualityThreshold: 0.5,
      });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].title).toBe('Bitcoin Reaches New High');
      expect(mockHttpService.get).toHaveBeenCalledWith(mockRssSource.url, {
        timeout: 10000,
        headers: expect.any(Object),
      });
    });

    it('should aggregate from a specific API source', async () => {
      const mockApiSource = {
        id: 'test-api',
        name: 'Test API Source',
        type: 'api' as const,
        url: 'https://api.example.com/news',
        isActive: true,
        reliability: 0.8,
        lastUpdated: new Date(),
        authToken: 'test-token',
      };

      const mockApiResponse = {
        data: {
          status: 'ok',
          articles: [
            {
              title: 'Ethereum 2.0 Update',
              content: 'Ethereum staking rewards increased',
              url: 'https://example.com/eth-update',
              publishedAt: '2024-01-01T12:00:00Z',
              source: { name: 'Crypto News' },
            },
          ],
        },
      };

      mockHttpService.get.mockReturnValue(of(mockApiResponse));

      const result = await service.aggregateFromSource(mockApiSource, {
        maxArticles: 10,
        timeRange: { hours: 24 },
        categories: ['ethereum'],
        qualityThreshold: 0.6,
      });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].title).toBe('Ethereum 2.0 Update');
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining(mockApiSource.url),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiSource.authToken}`,
          }),
        }),
      );
    });

    it('should handle blockchain source aggregation', async () => {
      const mockBlockchainSource = {
        id: 'test-blockchain',
        name: 'Test Blockchain Source',
        type: 'blockchain' as const,
        url: 'https://starknet.example.com',
        isActive: true,
        reliability: 0.95,
        lastUpdated: new Date(),
        contractAddress: '0x123abc...',
      };

      // Mock blockchain interaction
      const result = await service.aggregateFromSource(mockBlockchainSource, {
        maxArticles: 5,
        timeRange: { hours: 24 },
        categories: ['blockchain'],
        qualityThreshold: 0.7,
      });

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
    });

    it('should handle IPFS source aggregation', async () => {
      const mockIpfsSource = {
        id: 'test-ipfs',
        name: 'Test IPFS Source',
        type: 'ipfs' as const,
        url: 'https://ipfs.example.com',
        isActive: true,
        reliability: 0.85,
        lastUpdated: new Date(),
        ipfsHash: 'QmTest123...',
      };

      const mockIpfsResponse = {
        data: {
          articles: [
            {
              title: 'Decentralized News Article',
              content: 'Content stored on IPFS',
              hash: 'QmArticle123...',
              timestamp: 1640995200,
            },
          ],
        },
      };

      mockHttpService.get.mockReturnValue(of(mockIpfsResponse));

      const result = await service.aggregateFromSource(mockIpfsSource, {
        maxArticles: 5,
        timeRange: { hours: 24 },
        categories: ['decentralization'],
        qualityThreshold: 0.6,
      });

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
    });

    it('should handle social source aggregation with rate limiting', async () => {
      const mockSocialSource = {
        id: 'test-social',
        name: 'Test Social Source',
        type: 'social' as const,
        url: 'https://social.example.com',
        isActive: true,
        reliability: 0.7,
        lastUpdated: new Date(),
        platform: 'twitter',
      };

      // Mock rate-limited response
      mockHttpService.get.mockReturnValue(
        throwError(() => ({ status: 429, message: 'Rate limited' })),
      );

      const result = await service.aggregateFromSource(mockSocialSource, {
        maxArticles: 5,
        timeRange: { hours: 24 },
        categories: ['social'],
        qualityThreshold: 0.5,
      });

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      // Should handle rate limiting gracefully
    });
  });

  describe('deduplication', () => {
    it('should remove duplicate articles based on content similarity', () => {
      const articles = [
        {
          id: '1',
          title: 'Bitcoin Price Analysis',
          content: 'Bitcoin has reached a new high of $50,000',
          url: 'https://example1.com',
          publishedAt: new Date(),
          source: 'Source 1',
          sourceType: 'rss' as const,
          category: 'crypto',
          reliability: 0.8,
          qualityScore: 0.9,
          contentHash: 'hash1',
        },
        {
          id: '2',
          title: 'BTC Reaches New Peak',
          content: 'Bitcoin has reached a new high of $50,000 today',
          url: 'https://example2.com',
          publishedAt: new Date(),
          source: 'Source 2',
          sourceType: 'api' as const,
          category: 'crypto',
          reliability: 0.7,
          qualityScore: 0.8,
          contentHash: 'hash2',
        },
        {
          id: '3',
          title: 'Ethereum Updates',
          content: 'Ethereum 2.0 staking rewards increased',
          url: 'https://example3.com',
          publishedAt: new Date(),
          source: 'Source 3',
          sourceType: 'rss' as const,
          category: 'ethereum',
          reliability: 0.9,
          qualityScore: 0.85,
          contentHash: 'hash3',
        },
      ];

      const deduplicated = service['deduplicateArticles'](articles);

      expect(deduplicated.length).toBeLessThan(articles.length);
      // Should keep the article with higher quality score from similar articles
      const bitcoinArticles = deduplicated.filter((a) =>
        a.title.toLowerCase().includes('bitcoin'),
      );
      expect(bitcoinArticles.length).toBe(1);
      expect(bitcoinArticles[0].qualityScore).toBe(0.9);
    });
  });

  describe('source verification', () => {
    it('should verify source authenticity and update reliability scores', async () => {
      const sources = [
        {
          id: 'reliable-source',
          name: 'Reliable News',
          type: 'rss' as const,
          url: 'https://reliable.com/feed',
          isActive: true,
          reliability: 0.9,
          lastUpdated: new Date(),
        },
        {
          id: 'questionable-source',
          name: 'Questionable News',
          type: 'api' as const,
          url: 'https://questionable.com/api',
          isActive: true,
          reliability: 0.4,
          lastUpdated: new Date(),
        },
      ];

      const verificationResults = await service['verifySources'](sources);

      expect(verificationResults).toHaveLength(sources.length);
      expect(verificationResults[0].isVerified).toBe(true);
      expect(verificationResults[0].updatedReliability).toBeGreaterThanOrEqual(
        0.8,
      );
      expect(verificationResults[1].isVerified).toBe(false);
    });
  });

  describe('performance metrics', () => {
    it('should track aggregation performance metrics', async () => {
      const startTime = Date.now();

      mockHttpService.get.mockReturnValue(
        of({
          data: {
            articles: [
              {
                title: 'Test Article',
                content: 'Test content',
                url: 'https://example.com',
                publishedAt: '2024-01-01T12:00:00Z',
                source: { name: 'Test' },
              },
            ],
          },
        }),
      );

      const result = await service.aggregateFromAllSources({
        maxArticles: 10,
        timeRange: { hours: 1 },
        categories: ['test'],
        qualityThreshold: 0.5,
        enableVerification: false,
        enableDeduplication: false,
      });

      const endTime = Date.now();

      expect(result.metrics).toBeDefined();
      expect(result.metrics.processingTime).toBeGreaterThan(0);
      expect(result.metrics.processingTime).toBeLessThan(endTime - startTime);
      expect(result.metrics.articlesPerSecond).toBeGreaterThan(0);
    });

    it('should meet performance requirement of 10,000+ articles per hour', async () => {
      // Mock high-volume response
      const mockHighVolumeResponse = {
        data: {
          articles: Array(1000).fill({
            title: 'Performance Test Article',
            content: 'Performance test content',
            url: 'https://example.com/perf-test',
            publishedAt: '2024-01-01T12:00:00Z',
            source: { name: 'Performance Test' },
          }),
        },
      };

      mockHttpService.get.mockReturnValue(of(mockHighVolumeResponse));

      const startTime = Date.now();
      const result = await service.aggregateFromAllSources({
        maxArticles: 1000,
        timeRange: { hours: 1 },
        categories: ['performance'],
        qualityThreshold: 0.1, // Lower threshold for performance test
        enableVerification: false,
        enableDeduplication: false,
      });
      const endTime = Date.now();

      const processingTimeSeconds = (endTime - startTime) / 1000;
      const articlesPerSecond = result.articles.length / processingTimeSeconds;
      const projectedArticlesPerHour = articlesPerSecond * 3600;

      expect(projectedArticlesPerHour).toBeGreaterThan(10000);
      expect(result.metrics.articlesPerSecond).toBeGreaterThan(2.78); // 10000/3600
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts gracefully', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => ({ code: 'TIMEOUT', message: 'Request timeout' })),
      );

      const result = await service.aggregateFromAllSources({
        maxArticles: 10,
        timeRange: { hours: 1 },
        categories: ['test'],
        qualityThreshold: 0.5,
        enableVerification: false,
        enableDeduplication: false,
      });

      expect(result).toBeDefined();
      expect(result.articles).toBeInstanceOf(Array);
      expect(result.metrics.failedSources).toBeGreaterThan(0);
    });

    it('should handle malformed RSS feeds', async () => {
      const invalidRssResponse = {
        data: '<invalid>malformed xml content</malformed>',
      };

      mockHttpService.get.mockReturnValue(of(invalidRssResponse));

      const mockRssSource = {
        id: 'invalid-rss',
        name: 'Invalid RSS',
        type: 'rss' as const,
        url: 'https://invalid.com/feed.xml',
        isActive: true,
        reliability: 0.8,
        lastUpdated: new Date(),
      };

      const result = await service.aggregateFromSource(mockRssSource, {
        maxArticles: 10,
        timeRange: { hours: 1 },
        categories: ['test'],
        qualityThreshold: 0.5,
      });

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      // Should return empty array for malformed feeds
    });

    it('should handle API authentication failures', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => ({ status: 401, message: 'Unauthorized' })),
      );

      const mockApiSource = {
        id: 'auth-fail-api',
        name: 'Auth Fail API',
        type: 'api' as const,
        url: 'https://authfail.com/api',
        isActive: true,
        reliability: 0.8,
        lastUpdated: new Date(),
        authToken: 'invalid-token',
      };

      const result = await service.aggregateFromSource(mockApiSource, {
        maxArticles: 10,
        timeRange: { hours: 1 },
        categories: ['test'],
        qualityThreshold: 0.5,
      });

      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });
  });

  describe('real-time processing', () => {
    it('should emit events for real-time feed updates', async () => {
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            articles: [
              {
                title: 'Breaking News',
                content: 'Important crypto update',
                url: 'https://example.com/breaking',
                publishedAt: new Date().toISOString(),
                source: { name: 'Breaking Source' },
              },
            ],
          },
        }),
      );

      await service.aggregateFromAllSources({
        maxArticles: 1,
        timeRange: { hours: 1 },
        categories: ['breaking'],
        qualityThreshold: 0.8,
        enableVerification: true,
        enableDeduplication: true,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'news.aggregation.completed',
        expect.objectContaining({
          articles: expect.any(Array),
          metrics: expect.any(Object),
        }),
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'news.article.processed',
        expect.objectContaining({
          title: 'Breaking News',
          category: expect.any(String),
        }),
      );
    });
  });
});
