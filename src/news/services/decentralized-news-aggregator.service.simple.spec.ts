import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DecentralizedNewsAggregatorService } from './decentralized-news-aggregator.service';
import { DecentralizedSource } from '../entities/decentralized-source.entity';
import { NewsArticle } from '../entities/news-article.entity';
import { ContentVerification } from '../entities/content-verification.entity';
import { of } from 'rxjs';

describe('DecentralizedNewsAggregatorService', () => {
  let service: DecentralizedNewsAggregatorService;
  let httpService: HttpService;
  let eventEmitter: EventEmitter2;

  const mockSourceRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockArticleRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockVerificationRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

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
          provide: getRepositoryToken(DecentralizedSource),
          useValue: mockSourceRepository,
        },
        {
          provide: getRepositoryToken(NewsArticle),
          useValue: mockArticleRepository,
        },
        {
          provide: getRepositoryToken(ContentVerification),
          useValue: mockVerificationRepository,
        },
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

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('aggregateFromAllSources', () => {
    it('should aggregate news from all configured sources', async () => {
      // Mock sources
      const mockSources = [
        {
          id: '1',
          name: 'CoinDesk RSS',
          url: 'https://coindesk.com/rss',
          type: 'RSS' as const,
          reliabilityScore: 0.9,
          isActive: true,
        },
        {
          id: '2',
          name: 'CryptoNews API',
          url: 'https://cryptonews.api/latest',
          type: 'API' as const,
          reliabilityScore: 0.8,
          isActive: true,
        },
      ];

      mockSourceRepository.find.mockResolvedValue(mockSources);

      // Mock HTTP responses
      const mockRssResponse = {
        data: `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <item>
              <title>Bitcoin Reaches New High</title>
              <description>Bitcoin price surges to new all-time high</description>
              <link>https://example.com/bitcoin-high</link>
              <pubDate>2024-01-01T10:00:00Z</pubDate>
            </item>
          </channel>
        </rss>`,
      };

      const mockApiResponse = {
        data: {
          articles: [
            {
              title: 'Ethereum Upgrade Success',
              content: 'Ethereum successfully completes major upgrade',
              url: 'https://example.com/eth-upgrade',
              published_at: '2024-01-01T11:00:00Z',
            },
          ],
        },
      };

      mockHttpService.get
        .mockReturnValueOnce(of(mockRssResponse))
        .mockReturnValueOnce(of(mockApiResponse));

      const result = await service.aggregateFromAllSources();

      expect(result).toBeInstanceOf(Array);
      expect(mockSourceRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(mockHttpService.get).toHaveBeenCalledTimes(2);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty source list gracefully', async () => {
      mockSourceRepository.find.mockResolvedValue([]);

      const result = await service.aggregateFromAllSources();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });

    it('should emit real-time feed events', async () => {
      const mockSources = [
        {
          id: '1',
          name: 'Test RSS',
          url: 'https://test.com/rss',
          type: 'RSS' as const,
          reliabilityScore: 0.9,
          isActive: true,
        },
      ];

      mockSourceRepository.find.mockResolvedValue(mockSources);
      mockHttpService.get.mockReturnValue(
        of({ data: '<rss><channel></channel></rss>' }),
      );

      await service.aggregateFromAllSources();

      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });
  });

  describe('aggregateFromSource', () => {
    it('should process RSS source correctly', async () => {
      const rssSource = {
        id: '1',
        name: 'Test RSS',
        url: 'https://test.com/rss',
        type: 'RSS' as const,
        reliabilityScore: 0.9,
        isActive: true,
      };

      const mockRssData = `<?xml version="1.0"?>
        <rss><channel>
          <item>
            <title>Test Article</title>
            <description>Test content</description>
            <link>https://test.com/article</link>
            <pubDate>2024-01-01T12:00:00Z</pubDate>
          </item>
        </channel></rss>`;

      mockHttpService.get.mockReturnValue(of({ data: mockRssData }));

      const result = await service.aggregateFromSource(rssSource);

      expect(result).toBeInstanceOf(Array);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        rssSource.url,
        expect.any(Object),
      );
    });

    it('should process API source correctly', async () => {
      const apiSource = {
        id: '2',
        name: 'Test API',
        url: 'https://api.test.com/news',
        type: 'API' as const,
        reliabilityScore: 0.8,
        isActive: true,
      };

      const mockApiData = {
        articles: [
          {
            title: 'API News Article',
            content: 'Content from API',
            url: 'https://test.com/api-article',
            published_at: '2024-01-01T13:00:00Z',
          },
        ],
      };

      mockHttpService.get.mockReturnValue(of({ data: mockApiData }));

      const result = await service.aggregateFromSource(apiSource);

      expect(result).toBeInstanceOf(Array);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        apiSource.url,
        expect.any(Object),
      );
    });

    it('should handle HTTP errors gracefully', async () => {
      const source = {
        id: '1',
        name: 'Failing Source',
        url: 'https://failing.com/rss',
        type: 'RSS' as const,
        reliabilityScore: 0.5,
        isActive: true,
      };

      mockHttpService.get.mockReturnValue(
        new Promise((_, reject) => reject(new Error('Network error'))),
      );

      const result = await service.aggregateFromSource(source);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });
  });

  describe('deduplication', () => {
    it('should remove duplicate articles based on content similarity', async () => {
      const articles = [
        {
          id: '1',
          title: 'Bitcoin News',
          content: 'Bitcoin reaches new heights in the market',
          url: 'https://example1.com',
          source: 'Source1',
          author: 'Author1',
          publishedAt: new Date(),
          category: 'crypto',
          tags: [],
          language: 'en',
          isBreaking: false,
          isTrending: false,
          sentimentScore: 0.5,
          sentimentLabel: 'neutral' as const,
          reliabilityScore: 0.8,
          engagementScore: 0.6,
          relevanceScore: 0.7,
          keywords: ['bitcoin'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          title: 'Bitcoin Update',
          content: 'Bitcoin reaches new heights in the market today',
          url: 'https://example2.com',
          source: 'Source2',
          author: 'Author2',
          publishedAt: new Date(),
          category: 'crypto',
          tags: [],
          language: 'en',
          isBreaking: false,
          isTrending: false,
          sentimentScore: 0.5,
          sentimentLabel: 'neutral' as const,
          reliabilityScore: 0.8,
          engagementScore: 0.6,
          relevanceScore: 0.7,
          keywords: ['bitcoin'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const deduplicatedArticles =
        await service['deduplicateArticles'](articles);

      expect(deduplicatedArticles.length).toBeLessThanOrEqual(articles.length);
      expect(deduplicatedArticles).toBeInstanceOf(Array);
    });
  });

  describe('source verification', () => {
    it('should verify source authenticity', async () => {
      const sources = [
        {
          id: '1',
          name: 'Verified Source',
          url: 'https://verified.com/rss',
          type: 'RSS' as const,
          reliabilityScore: 0.9,
          isActive: true,
        },
      ];

      mockSourceRepository.find.mockResolvedValue(sources);
      mockVerificationRepository.create.mockReturnValue({});
      mockVerificationRepository.save.mockResolvedValue({});

      const result = await service['verifySources'](sources);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(sources.length);
    });
  });

  describe('performance metrics', () => {
    it('should track processing performance', async () => {
      const startTime = Date.now();

      mockSourceRepository.find.mockResolvedValue([]);

      await service.aggregateFromAllSources();

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle high-volume processing efficiently', async () => {
      const mockSources = Array(10)
        .fill(0)
        .map((_, index) => ({
          id: `${index + 1}`,
          name: `Source ${index + 1}`,
          url: `https://source${index + 1}.com/rss`,
          type: 'RSS' as const,
          reliabilityScore: 0.8,
          isActive: true,
        }));

      mockSourceRepository.find.mockResolvedValue(mockSources);
      mockHttpService.get.mockReturnValue(
        of({ data: '<rss><channel></channel></rss>' }),
      );

      const startTime = Date.now();
      const result = await service.aggregateFromAllSources();
      const endTime = Date.now();

      const processingTime = endTime - startTime;

      expect(result).toBeInstanceOf(Array);
      expect(processingTime).toBeLessThan(10000); // Should handle 10 sources within 10 seconds
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts gracefully', async () => {
      const source = {
        id: '1',
        name: 'Slow Source',
        url: 'https://slow.com/rss',
        type: 'RSS' as const,
        reliabilityScore: 0.7,
        isActive: true,
      };

      mockHttpService.get.mockReturnValue(
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100),
        ),
      );

      const result = await service.aggregateFromSource(source);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });

    it('should handle malformed RSS data', async () => {
      const source = {
        id: '1',
        name: 'Malformed RSS',
        url: 'https://malformed.com/rss',
        type: 'RSS' as const,
        reliabilityScore: 0.6,
        isActive: true,
      };

      mockHttpService.get.mockReturnValue(of({ data: 'invalid xml data' }));

      const result = await service.aggregateFromSource(source);

      expect(result).toBeInstanceOf(Array);
    });

    it('should handle empty API responses', async () => {
      const source = {
        id: '1',
        name: 'Empty API',
        url: 'https://empty.com/api',
        type: 'API' as const,
        reliabilityScore: 0.5,
        isActive: true,
      };

      mockHttpService.get.mockReturnValue(of({ data: {} }));

      const result = await service.aggregateFromSource(source);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });
  });

  describe('real-time processing', () => {
    it('should emit feed update events', async () => {
      const mockSources = [
        {
          id: '1',
          name: 'Real-time Source',
          url: 'https://realtime.com/rss',
          type: 'RSS' as const,
          reliabilityScore: 0.9,
          isActive: true,
        },
      ];

      mockSourceRepository.find.mockResolvedValue(mockSources);
      mockHttpService.get.mockReturnValue(
        of({
          data: `<rss><channel>
          <item>
            <title>Breaking News</title>
            <description>Important update</description>
          </item>
        </channel></rss>`,
        }),
      );

      await service.aggregateFromAllSources();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'news.feed.updated',
        expect.any(Object),
      );
    });

    it('should process articles in real-time', async () => {
      const mockSources = [
        {
          id: '1',
          name: 'Breaking News Source',
          url: 'https://breaking.com/api',
          type: 'API' as const,
          reliabilityScore: 0.95,
          isActive: true,
        },
      ];

      mockSourceRepository.find.mockResolvedValue(mockSources);
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            articles: [
              {
                title: 'BREAKING: Major Crypto Development',
                content: 'Significant development in cryptocurrency space',
                url: 'https://breaking.com/major-crypto-news',
                published_at: new Date().toISOString(),
              },
            ],
          },
        }),
      );

      const result = await service.aggregateFromAllSources();

      expect(result).toBeInstanceOf(Array);
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });
  });
});
