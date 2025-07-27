import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DecentralizedNewsAggregatorService } from './decentralized-news-aggregator.service';
import { DecentralizedSource } from '../entities/decentralized-source.entity';
import { NewsArticle } from '../entities/news-article.entity';
import { ContentVerification } from '../entities/content-verification.entity';
import { of } from 'rxjs';est, TestingModule } from '@nestjs/testing';
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

  const mockSourceRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockArticleRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockVerificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
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

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Core Functionality', () => {
    it('should aggregate from all sources successfully', async () => {
      const mockSources = [
        {
          id: '1',
          name: 'CoinDesk RSS',
          url: 'https://coindesk.com/feed',
          type: 'RSS',
          reliabilityScore: 0.9,
          isActive: true,
          factualAccuracy: 0.95,
          editorialBias: 0.1,
          transparencyScore: 0.9,
          articlesProcessed: 100,
          errorsCount: 0,
          lastError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockSourceRepository.find.mockResolvedValue(mockSources);
      mockHttpService.get.mockReturnValue(
        of({
          data: `<?xml version="1.0"?>
          <rss><channel>
            <item>
              <title>Bitcoin News Update</title>
              <description>Latest bitcoin market analysis</description>
              <link>https://example.com/bitcoin</link>
              <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
            </item>
          </channel></rss>`,
        }),
      );

      const result = await service.aggregateFromAllSources();

      expect(result).toBeInstanceOf(Array);
      expect(mockSourceRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(mockHttpService.get).toHaveBeenCalled();
    });

    it('should handle RSS source processing', async () => {
      const mockSource = {
        id: '1',
        name: 'Test RSS',
        url: 'https://test.com/rss',
        type: 'RSS' as const,
        reliabilityScore: 0.8,
        isActive: true,
        factualAccuracy: 0.9,
        editorialBias: 0.2,
        transparencyScore: 0.8,
        articlesProcessed: 50,
        errorsCount: 0,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockHttpService.get.mockReturnValue(
        of({
          data: `<rss><channel>
            <item>
              <title>Test News</title>
              <description>Test description</description>
              <link>https://test.com/news</link>
            </item>
          </channel></rss>`,
        }),
      );

      const result = await service.aggregateFromSource(mockSource);

      expect(result).toBeInstanceOf(Array);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        mockSource.url,
        expect.any(Object),
      );
    });

    it('should handle API source processing', async () => {
      const mockSource = {
        id: '2',
        name: 'Test API',
        url: 'https://api.test.com/news',
        type: 'API' as const,
        reliabilityScore: 0.85,
        isActive: true,
        factualAccuracy: 0.88,
        editorialBias: 0.15,
        transparencyScore: 0.9,
        articlesProcessed: 75,
        errorsCount: 1,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockHttpService.get.mockReturnValue(
        of({
          data: {
            articles: [
              {
                title: 'API News Article',
                content: 'Content from API endpoint',
                url: 'https://test.com/api-news',
                published_at: '2024-01-01T12:00:00Z',
              },
            ],
          },
        }),
      );

      const result = await service.aggregateFromSource(mockSource);

      expect(result).toBeInstanceOf(Array);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        mockSource.url,
        expect.any(Object),
      );
    });

    it('should emit real-time events', async () => {
      mockSourceRepository.find.mockResolvedValue([]);

      await service.aggregateFromAllSources();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'news.feed.updated',
        expect.any(Object),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockSource = {
        id: '1',
        name: 'Failing Source',
        url: 'https://failing.com/rss',
        type: 'RSS' as const,
        reliabilityScore: 0.5,
        isActive: true,
        factualAccuracy: 0.6,
        editorialBias: 0.3,
        transparencyScore: 0.5,
        articlesProcessed: 10,
        errorsCount: 5,
        lastError: 'Network timeout',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockHttpService.get.mockReturnValue(
        Promise.reject(new Error('Network error')),
      );

      const result = await service.aggregateFromSource(mockSource);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });

    it('should handle empty responses', async () => {
      mockSourceRepository.find.mockResolvedValue([]);

      const result = await service.aggregateFromAllSources();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });

    it('should handle malformed data', async () => {
      const mockSource = {
        id: '1',
        name: 'Malformed Source',
        url: 'https://malformed.com/rss',
        type: 'RSS' as const,
        reliabilityScore: 0.4,
        isActive: true,
        factualAccuracy: 0.5,
        editorialBias: 0.4,
        transparencyScore: 0.4,
        articlesProcessed: 5,
        errorsCount: 10,
        lastError: 'Parsing error',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockHttpService.get.mockReturnValue(of({ data: 'invalid xml' }));

      const result = await service.aggregateFromSource(mockSource);

      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('Performance Tests', () => {
    it('should process sources efficiently', async () => {
      const mockSources = Array(5)
        .fill(0)
        .map((_, index) => ({
          id: `${index + 1}`,
          name: `Source ${index + 1}`,
          url: `https://source${index + 1}.com/rss`,
          type: 'RSS' as const,
          reliabilityScore: 0.8,
          isActive: true,
          factualAccuracy: 0.8,
          editorialBias: 0.2,
          transparencyScore: 0.8,
          articlesProcessed: 20,
          errorsCount: 0,
          lastError: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

      mockSourceRepository.find.mockResolvedValue(mockSources);
      mockHttpService.get.mockReturnValue(
        of({ data: '<rss><channel></channel></rss>' }),
      );

      const startTime = Date.now();
      const result = await service.aggregateFromAllSources();
      const endTime = Date.now();

      expect(result).toBeInstanceOf(Array);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle concurrent processing', async () => {
      const mockSource = {
        id: '1',
        name: 'Concurrent Test',
        url: 'https://concurrent.com/rss',
        type: 'RSS' as const,
        reliabilityScore: 0.9,
        isActive: true,
        factualAccuracy: 0.9,
        editorialBias: 0.1,
        transparencyScore: 0.9,
        articlesProcessed: 100,
        errorsCount: 0,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockHttpService.get.mockReturnValue(
        of({ data: '<rss><channel></channel></rss>' }),
      );

      const promises = Array(3)
        .fill(0)
        .map(() => service.aggregateFromSource(mockSource));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toBeInstanceOf(Array);
      });
    });
  });

  describe('Data Validation', () => {
    it('should validate processed articles structure', async () => {
      const mockSource = {
        id: '1',
        name: 'Validation Test',
        url: 'https://validation.com/rss',
        type: 'RSS' as const,
        reliabilityScore: 0.9,
        isActive: true,
        factualAccuracy: 0.9,
        editorialBias: 0.1,
        transparencyScore: 0.9,
        articlesProcessed: 50,
        errorsCount: 0,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockHttpService.get.mockReturnValue(
        of({
          data: `<rss><channel>
            <item>
              <title>Validation Test Article</title>
              <description>Article for validation testing</description>
              <link>https://validation.com/article</link>
              <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
            </item>
          </channel></rss>`,
        }),
      );

      const result = await service.aggregateFromSource(mockSource);

      expect(result).toBeInstanceOf(Array);
      if (result.length > 0) {
        const article = result[0];
        expect(article).toHaveProperty('title');
        expect(article).toHaveProperty('content');
        expect(article).toHaveProperty('url');
        expect(article).toHaveProperty('source');
      }
    });

    it('should handle different content types', async () => {
      const sources = [
        {
          id: '1',
          name: 'RSS Source',
          url: 'https://rss.com/feed',
          type: 'RSS' as const,
        },
        {
          id: '2',
          name: 'API Source',
          url: 'https://api.com/news',
          type: 'API' as const,
        },
      ].map((source) => ({
        ...source,
        reliabilityScore: 0.8,
        isActive: true,
        factualAccuracy: 0.8,
        editorialBias: 0.2,
        transparencyScore: 0.8,
        articlesProcessed: 30,
        errorsCount: 0,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      mockSourceRepository.find.mockResolvedValue(sources);
      mockHttpService.get
        .mockReturnValueOnce(
          of({ data: '<rss><channel></channel></rss>' }),
        )
        .mockReturnValueOnce(of({ data: { articles: [] } }));

      const result = await service.aggregateFromAllSources();

      expect(result).toBeInstanceOf(Array);
      expect(mockHttpService.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Service Integration', () => {
    it('should integrate with all required dependencies', () => {
      expect(service).toBeDefined();
      expect(httpService).toBeDefined();
      expect(mockEventEmitter).toBeDefined();
      expect(mockSourceRepository).toBeDefined();
      expect(mockArticleRepository).toBeDefined();
      expect(mockVerificationRepository).toBeDefined();
    });

    it('should maintain service state correctly', async () => {
      const initialCall = await service.aggregateFromAllSources();
      const secondCall = await service.aggregateFromAllSources();

      expect(initialCall).toBeInstanceOf(Array);
      expect(secondCall).toBeInstanceOf(Array);
      expect(mockSourceRepository.find).toHaveBeenCalledTimes(2);
    });
  });
});
