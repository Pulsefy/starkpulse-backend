import { Test, TestingModule } from '@nestjs/testing';
import { AdvancedMLProcessor } from './advanced-ml-processor.service';
import { SentimentAnalyzer } from '../utils/sentiment-analyzer';

describe('AdvancedMLProcessor', () => {
  let service: AdvancedMLProcessor;

  const mockSentimentAnalyzer = {
    analyze: jest.fn().mockResolvedValue({
      score: 0.7,
      label: 'positive',
      confidence: 0.85,
    }),
    analyzeMarketSentiment: jest.fn().mockResolvedValue({
      sentiment: { score: 0.6, label: 'positive', confidence: 0.8 },
      marketSignals: {
        bullish: 0.7,
        bearish: 0.2,
        volatility: 0.3,
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancedMLProcessor,
        {
          provide: SentimentAnalyzer,
          useValue: mockSentimentAnalyzer,
        },
      ],
    }).compile();

    service = module.get<AdvancedMLProcessor>(AdvancedMLProcessor);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processContent', () => {
    it('should process content successfully', async () => {
      const title = 'Bitcoin Reaches New All-Time High';
      const content = `
        Bitcoin has reached a new all-time high, driven by institutional adoption
        and positive market sentiment. The cryptocurrency shows strong performance
        with increased trading volume and growing investor confidence.
      `;

      const result = await service.processContent(title, content);

      expect(result).toBeDefined();
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(result.duplicateScore).toBeGreaterThanOrEqual(0);
      expect(result.categories).toBeInstanceOf(Array);
      expect(result.keywords).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle crypto-related content', async () => {
      const title = 'Ethereum DeFi Protocol Launches';
      const content = `
        A new decentralized finance protocol on Ethereum offers yield farming
        with high APY rates. The smart contract has been audited and provides
        liquidity mining opportunities for DeFi enthusiasts.
      `;

      const result = await service.processContent(title, content);

      expect(result.categories.length).toBeGreaterThan(0);
      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.relevanceScore).toBeGreaterThan(0);
    });

    it('should extract relevant keywords', async () => {
      const title = 'Blockchain Technology Innovation';
      const content = `
        Blockchain technology continues to innovate with new consensus mechanisms
        and scalability solutions. Smart contracts enable decentralized applications
        while maintaining security and transparency.
      `;

      const result = await service.processContent(title, content);

      expect(result.keywords).toContain('blockchain');
      expect(result.keywords.length).toBeGreaterThanOrEqual(3);
    });

    it('should categorize content appropriately', async () => {
      const title = 'NFT Marketplace Sees Volume Surge';
      const content = `
        Non-fungible token trading volume increased significantly on major
        marketplaces. Digital art and collectibles drive the growth with
        new projects launching daily.
      `;

      const result = await service.processContent(title, content);

      expect(result.categories.length).toBeGreaterThan(0);
      expect(
        result.categories.some((cat) =>
          ['NFT', 'Art', 'Technology'].includes(cat),
        ),
      ).toBe(true);
    });

    it('should generate content summary', async () => {
      const title = 'Cryptocurrency Regulation Update';
      const content = `
        Government agencies released new guidelines for cryptocurrency regulation.
        The framework provides clarity for institutions and promotes innovation
        while ensuring consumer protection and market stability.
      `;

      const result = await service.processContent(title, content);

      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.summary.length).toBeLessThan(600);
    });

    it('should handle empty content gracefully', async () => {
      const result = await service.processContent('', '');

      expect(result).toBeDefined();
      expect(result.categories).toBeInstanceOf(Array);
      expect(result.keywords).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
      // For empty content, scores might be NaN or 0, which is acceptable
      expect(typeof result.qualityScore).toBe('number');
      expect(typeof result.relevanceScore).toBe('number');
    });

    it('should process content with advanced options', async () => {
      const title = 'DeFi Yield Farming Analysis';
      const content = `
        Comprehensive analysis of yield farming strategies in DeFi protocols.
        Risk assessment and reward calculations for liquidity providers.
      `;

      const result = await service.processContent(title, content, {
        includeSummary: true,
        includeEntities: true,
        includeCategories: true,
        includeKeywords: true,
        qualityThreshold: 0.5,
      });

      expect(result.summary).toBeDefined();
      expect(result.categories.length).toBeGreaterThan(0);
      expect(result.keywords.length).toBeGreaterThan(0);
    });
  });

  describe('batchProcessContent', () => {
    it('should process multiple articles efficiently', async () => {
      const articles = [
        {
          id: '1',
          title: 'Bitcoin Market Update',
          content:
            'Bitcoin shows strong momentum in current market conditions.',
        },
        {
          id: '2',
          title: 'Ethereum Network Upgrade',
          content: 'Ethereum implements new features for better scalability.',
        },
        {
          id: '3',
          title: 'DeFi Protocol Launch',
          content:
            'New DeFi protocol offers innovative yield farming solutions.',
        },
      ];

      const results = await service.batchProcessContent(articles);

      expect(results.size).toBe(articles.length);
      expect(results.has('1')).toBe(true);
      expect(results.has('2')).toBe(true);
      expect(results.has('3')).toBe(true);

      // Verify each result has required properties
      for (const [, result] of results.entries()) {
        expect(result.qualityScore).toBeGreaterThanOrEqual(0);
        expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(result.categories).toBeInstanceOf(Array);
        expect(result.keywords).toBeInstanceOf(Array);
      }
    });

    it('should handle batch processing with mixed content quality', async () => {
      const articles = [
        {
          id: '1',
          title: 'High Quality Analysis',
          content: `
            Comprehensive market analysis with detailed technical indicators,
            fundamental analysis, and expert insights on cryptocurrency trends.
            Well-structured content with proper citations and data sources.
          `,
        },
        {
          id: '2',
          title: 'basic news',
          content: 'crypto up today',
        },
      ];

      const results = await service.batchProcessContent(articles);

      expect(results.size).toBe(2);

      const highQualityResult = results.get('1');
      const lowQualityResult = results.get('2');

      expect(highQualityResult?.qualityScore).toBeGreaterThan(
        lowQualityResult?.qualityScore || 0,
      );
    });
  });

  describe('performance tests', () => {
    it('should process content within acceptable time limits', async () => {
      const title = 'Performance Test Article';
      const content = `
        This is a performance test for the ML processor service.
        The content includes various cryptocurrency and blockchain terms
        to test keyword extraction and categorization performance.
        Bitcoin, Ethereum, DeFi, NFT, smart contracts, yield farming.
      `;

      const startTime = Date.now();
      const result = await service.processContent(title, content);
      const endTime = Date.now();

      const processingTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle multiple concurrent requests', async () => {
      const title = 'Concurrent Processing Test';
      const content =
        'Testing concurrent processing capabilities of the ML service.';

      const promises = Array(5)
        .fill(0)
        .map(async (_, index) => {
          return service.processContent(
            `${title} ${index}`,
            `${content} Article ${index}`,
          );
        });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('quality assessment', () => {
    it('should assess content quality accurately', async () => {
      const highQualityContent = {
        title: 'Comprehensive Bitcoin Market Analysis',
        content: `
          This detailed analysis examines Bitcoin's market performance across
          multiple timeframes, incorporating technical analysis, on-chain metrics,
          and macroeconomic factors. The report includes data from reputable
          sources and provides actionable insights for investors.
        `,
      };

      const lowQualityContent = {
        title: 'btc news',
        content: 'bitcoin price go up maybe down who knows',
      };

      const highQualityResult = await service.processContent(
        highQualityContent.title,
        highQualityContent.content,
      );

      const lowQualityResult = await service.processContent(
        lowQualityContent.title,
        lowQualityContent.content,
      );

      expect(highQualityResult.qualityScore).toBeGreaterThan(
        lowQualityResult.qualityScore,
      );
    });
  });

  describe('error handling', () => {
    it('should handle processing errors gracefully', async () => {
      // Test with very long content that might cause issues
      const longContent = 'Bitcoin analysis. '.repeat(5000);

      const result = await service.processContent(
        'Long Content Test',
        longContent,
      );

      expect(result).toBeDefined();
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle special characters and unicode', async () => {
      const title = 'Special Characters Test';
      const content = `
        Bitcoin (₿) price reaches €50,000 milestone. 
        Cryptocurrency exchanges report volume of ¥1000億.
        Growing adoption in regions like 中国, ประเทศไทย, and العربية.
      `;

      const result = await service.processContent(title, content);

      expect(result).toBeDefined();
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.keywords.length).toBeGreaterThan(0);
    });

    it('should provide consistent results for identical content', async () => {
      const title = 'Consistency Test';
      const content =
        'Ethereum smart contracts enable DeFi innovation and growth.';

      const result1 = await service.processContent(title, content);
      const result2 = await service.processContent(title, content);

      expect(result1.qualityScore).toBe(result2.qualityScore);
      expect(result1.relevanceScore).toBe(result2.relevanceScore);
      expect(result1.keywords).toEqual(result2.keywords);
      expect(result1.categories).toEqual(result2.categories);
    });
  });

  describe('sentiment analysis integration', () => {
    it('should integrate with sentiment analyzer', async () => {
      const bullishContent = `
        Bitcoin shows exceptional strength with institutional backing driving
        prices to new highs. Market sentiment remains overwhelmingly positive
        with analysts projecting continued growth.
      `;

      await service.processContent('Bullish Analysis', bullishContent);

      expect(mockSentimentAnalyzer.analyze).toHaveBeenCalled();
    });

    it('should handle sentiment analysis failures', async () => {
      // Mock sentiment analyzer to fail
      mockSentimentAnalyzer.analyze.mockRejectedValueOnce(
        new Error('Sentiment analysis failed'),
      );

      const result = await service.processContent(
        'Test Article',
        'Test content for sentiment analysis failure handling.',
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });
});
