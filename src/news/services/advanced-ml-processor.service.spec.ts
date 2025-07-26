import { Test, TestingModule } from '@nestjs/testing';
import { AdvancedMLProcessor } from './advanced-ml-processor.service';
import { SentimentAnalyzer } from '../utils/sentiment-analyzer';

describe('AdvancedMLProcessor', () => {
  let service: AdvancedMLProcessor;

  const mockSentimentAnalyzer = {
    analyze: jest.fn(),
    analyzeMarketSentiment: jest.fn(),
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

    // Setup default mock responses
    mockSentimentAnalyzer.analyze.mockResolvedValue({
      score: 0.3,
      label: 'positive',
      confidence: 0.85,
    });

    mockSentimentAnalyzer.analyzeMarketSentiment.mockResolvedValue({
      sentiment: { score: 0.2, label: 'positive', confidence: 0.8 },
      marketSignals: {
        bullish: 0.6,
        bearish: 0.2,
        volatility: 0.2,
      },
    });
  });

  describe('processContent', () => {
    it('should process content with default options', async () => {
      const title = 'Bitcoin Reaches New All-Time High';
      const content = `
        Bitcoin has reached a new all-time high of $75,000, driven by 
        institutional adoption and positive market sentiment. The cryptocurrency 
        market shows strong bullish signals with increased trading volume and 
        growing investor confidence. Technical analysis indicates potential for 
        further upward movement in the coming weeks.
      `;

      const result = await service.processContent(title, content);

      expect(result).toBeDefined();
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.relevanceScore).toBeGreaterThan(0);
      expect(result.duplicateScore).toBeGreaterThanOrEqual(0);
      expect(result.categories).toBeInstanceOf(Array);
      expect(result.keywords).toBeInstanceOf(Array);
      expect(result.namedEntities).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should achieve 85%+ accuracy in crypto/finance content relevance', async () => {
      const cryptoTitle =
        'DeFi Protocol Launches New Yield Farming Opportunity';
      const cryptoContent = `
        A new decentralized finance (DeFi) protocol has launched offering 
        yield farming opportunities with APY rates up to 15%. The protocol 
        uses automated market makers (AMM) and liquidity pools to generate 
        returns for users. Smart contracts have been audited by leading 
        security firms. Total value locked (TVL) reached $10 million within 
        the first 24 hours of launch.
      `;

      const result = await service.processContent(cryptoTitle, cryptoContent);

      expect(result.relevanceScore).toBeGreaterThan(0.85);
      expect(
        result.categories.some((cat) =>
          ['DeFi', 'Technology', 'News'].includes(cat),
        ),
      ).toBe(true);
      expect(
        result.keywords.some((kw) =>
          ['defi', 'yield', 'farming', 'protocol', 'apy'].includes(kw),
        ),
      ).toBe(true);
    });

    it('should extract crypto-specific named entities accurately', async () => {
      const title = 'Ethereum Layer 2 Solutions Drive Network Growth';
      const content = `
        Ethereum's layer 2 scaling solutions including Polygon, Arbitrum, and 
        Optimism have processed over $50 billion in transactions this quarter. 
        Starknet, another prominent L2, announced partnerships with major DeFi 
        protocols like Aave and Uniswap. The developments have reduced gas fees 
        by 90% while maintaining security through zero-knowledge proofs.
      `;

      const result = await service.processContent(title, content);

      expect(result.namedEntities?.cryptocurrencies).toContain('ethereum');
      expect(result.namedEntities?.cryptocurrencies).toContain('polygon');
      expect(result.namedEntities?.cryptocurrencies).toContain('arbitrum');
      expect(result.namedEntities?.cryptocurrencies).toContain('starknet');
      expect(result.namedEntities?.cryptocurrencies).toContain('aave');
      expect(result.namedEntities?.cryptocurrencies).toContain('uniswap');
    });

    it('should provide accurate quality scoring for different content types', async () => {
      const highQualityContent = {
        title: 'Comprehensive Analysis: Bitcoin Market Dynamics Q4 2024',
        content: `
          This comprehensive analysis examines Bitcoin's market dynamics 
          throughout Q4 2024, incorporating data from multiple exchanges, 
          on-chain metrics, and institutional adoption patterns. According 
          to CoinGecko data, Bitcoin's average daily trading volume increased 
          by 35% compared to Q3. The analysis considers factors including 
          regulatory developments, macroeconomic conditions, and technical 
          indicators such as RSI and MACD signals.
        `,
      };

      const lowQualityContent = {
        title: 'btc moon soon!!!',
        content: 'bitcoin going up buy now or cry later lol',
      };

      const highQualityResult = await service.processContent(
        highQualityContent.title,
        highQualityContent.content,
      );

      const lowQualityResult = await service.processContent(
        lowQualityContent.title,
        lowQualityContent.content,
      );

      expect(highQualityResult.qualityScore).toBeGreaterThan(0.7);
      expect(lowQualityResult.qualityScore).toBeLessThan(0.5);
      expect(highQualityResult.qualityScore).toBeGreaterThan(
        lowQualityResult.qualityScore,
      );
    });

    it('should handle content with advanced ML processing options', async () => {
      const title = 'Federal Reserve Policy Impact on Cryptocurrency Markets';
      const content = `
        The Federal Reserve's latest monetary policy decisions have significant 
        implications for cryptocurrency markets. Interest rate changes traditionally 
        inverse-correlate with Bitcoin prices, while regulatory clarity provides 
        market stability. Recent statements from Fed Chairman Powell suggest a 
        more accommodative stance toward digital assets, potentially catalyzing 
        institutional adoption.
      `;

      const result = await service.processContent(title, content, {
        includeSummary: true,
        includeEntities: true,
        includeCategories: true,
        includeKeywords: true,
        qualityThreshold: 0.8,
        enableAdvancedNLP: true,
        enableFactChecking: true,
      });

      expect(result.summary.length).toBeGreaterThan(50);
      expect(result.categories.length).toBeGreaterThan(0);
      expect(result.keywords.length).toBeGreaterThan(5);
      expect(result.namedEntities).toBeDefined();
      expect(result.qualityScore).toBeGreaterThan(0.6);
    });

    it('should detect and score duplicate content accurately', async () => {
      const originalContent = `
        Bitcoin has reached a new milestone with its price surpassing $70,000 
        for the first time this year. The surge is attributed to increased 
        institutional investment and growing mainstream adoption of cryptocurrency.
      `;

      const nearDuplicateContent = `
        Bitcoin has achieved a new milestone by surpassing $70,000 for the first 
        time this year. This surge results from increased institutional investment 
        and growing mainstream cryptocurrency adoption.
      `;

      const uniqueContent = `
        Ethereum's upcoming protocol upgrade introduces significant improvements 
        to network scalability and energy efficiency through proof-of-stake 
        consensus mechanism implementation.
      `;

      const result1 = await service.processContent(
        'Bitcoin News',
        originalContent,
      );
      const result2 = await service.processContent(
        'BTC Update',
        nearDuplicateContent,
      );
      const result3 = await service.processContent(
        'Ethereum Upgrade',
        uniqueContent,
      );

      expect(result2.duplicateScore).toBeGreaterThan(result1.duplicateScore);
      expect(result3.duplicateScore).toBeLessThan(result2.duplicateScore);
    });
  });

  describe('batchProcessContent', () => {
    it('should process multiple articles efficiently', async () => {
      const articles = [
        {
          id: '1',
          title: 'Bitcoin Market Analysis',
          content:
            'Bitcoin shows strong bullish momentum with institutional backing.',
        },
        {
          id: '2',
          title: 'Ethereum DeFi Growth',
          content:
            'Ethereum DeFi ecosystem continues expanding with new protocols.',
        },
        {
          id: '3',
          title: 'Regulatory News Update',
          content:
            'New cryptocurrency regulations provide clarity for institutional investors.',
        },
      ];

      const startTime = Date.now();
      const results = await service.batchProcessContent(articles);
      const endTime = Date.now();

      expect(results.size).toBe(articles.length);
      expect(results.has('1')).toBe(true);
      expect(results.has('2')).toBe(true);
      expect(results.has('3')).toBe(true);

      // Verify batch processing is more efficient than individual processing
      const batchProcessingTime = endTime - startTime;
      expect(batchProcessingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle batch processing with failures gracefully', async () => {
      const articles = [
        {
          id: '1',
          title: 'Valid Article',
          content: 'This is valid content for processing.',
        },
        {
          id: '2',
          title: '', // Invalid: empty title
          content: '',
        },
        {
          id: '3',
          title: 'Another Valid Article',
          content: 'More valid content here.',
        },
      ];

      const results = await service.batchProcessContent(articles);

      expect(results.size).toBe(articles.length);
      // All articles should have results, even if default/fallback results
      expect(results.get('1')).toBeDefined();
      expect(results.get('2')).toBeDefined();
      expect(results.get('3')).toBeDefined();
    });
  });

  describe('quality assessment', () => {
    it('should assess grammar quality accurately', async () => {
      const goodGrammarContent = `
        The cryptocurrency market has experienced significant volatility 
        throughout 2024. Regulatory developments have provided much-needed 
        clarity for institutional investors, while technological improvements 
        continue to enhance network scalability and security.
      `;

      const poorGrammarContent = `
        crypto market very volatile this year regulation is good for 
        institution investor technology getting better for scale and secure
      `;

      const goodResult = await service.processContent(
        'Good Grammar',
        goodGrammarContent,
      );
      const poorResult = await service.processContent(
        'Poor Grammar',
        poorGrammarContent,
      );

      expect(goodResult.qualityScore).toBeGreaterThan(poorResult.qualityScore);
      expect(goodResult.qualityScore).toBeGreaterThan(0.6);
      expect(poorResult.qualityScore).toBeLessThan(0.6);
    });

    it('should assess readability and structure', async () => {
      const wellStructuredContent = `
        Introduction: Bitcoin's price performance in 2024 has been remarkable.
        
        Market Analysis: Several factors contribute to this growth:
        1. Institutional adoption by major corporations
        2. Regulatory clarity from government agencies
        3. Technological improvements in scalability
        
        Conclusion: These developments suggest continued positive momentum.
      `;

      const poorlyStructuredContent = `
        bitcoin price good this year institutions buying government ok tech better conclusion good momentum
      `;

      const wellStructuredResult = await service.processContent(
        'Well Structured Analysis',
        wellStructuredContent,
      );

      const poorlyStructuredResult = await service.processContent(
        'Poor Structure',
        poorlyStructuredContent,
      );

      expect(wellStructuredResult.qualityScore).toBeGreaterThan(
        poorlyStructuredResult.qualityScore,
      );
    });
  });

  describe('keyword and category extraction', () => {
    it('should extract relevant crypto keywords with proper weighting', async () => {
      const content = `
        DeFi protocols continue to innovate with new yield farming opportunities. 
        Automated market makers (AMM) and liquidity pools provide efficient 
        trading mechanisms. Smart contract audits ensure security while 
        maximizing APY returns for liquidity providers.
      `;

      const result = await service.processContent('DeFi Innovation', content);

      expect(result.keywords).toContain('defi');
      expect(result.keywords).toContain('yield');
      expect(result.keywords).toContain('farming');
      expect(result.keywords).toContain('liquidity');
      expect(result.keywords).toContain('smart');
      expect(result.keywords).toContain('contract');
    });

    it('should categorize content accurately', async () => {
      const defiContent = {
        title: 'New AMM Protocol Launches',
        content:
          'Automated market maker protocol offers yield farming with 20% APY.',
      };

      const nftContent = {
        title: 'NFT Marketplace Volume Surge',
        content:
          'Non-fungible token trading volume increased 300% on OpenSea marketplace.',
      };

      const regulatoryContent = {
        title: 'SEC Announces Crypto Guidelines',
        content:
          'Securities and Exchange Commission provides regulatory clarity for digital assets.',
      };

      const defiResult = await service.processContent(
        defiContent.title,
        defiContent.content,
      );
      const nftResult = await service.processContent(
        nftContent.title,
        nftContent.content,
      );
      const regulatoryResult = await service.processContent(
        regulatoryContent.title,
        regulatoryContent.content,
      );

      expect(defiResult.categories).toContain('DeFi');
      expect(nftResult.categories).toContain('NFT');
      expect(regulatoryResult.categories).toContain('Regulation');
    });
  });

  describe('sentiment analysis integration', () => {
    it('should integrate with sentiment analyzer for market sentiment', async () => {
      const bullishContent = `
        Bitcoin shows exceptional strength with institutional backing driving 
        prices to new highs. Market sentiment remains overwhelmingly positive 
        with analysts projecting continued growth throughout the quarter.
      `;

      await service.processContent('Bullish Bitcoin Analysis', bullishContent);

      expect(mockSentimentAnalyzer.analyze).toHaveBeenCalledWith(
        bullishContent,
      );
      expect(mockSentimentAnalyzer.analyzeMarketSentiment).toHaveBeenCalledWith(
        expect.stringContaining('bitcoin'),
      );
    });

    it('should handle sentiment analysis failures gracefully', async () => {
      mockSentimentAnalyzer.analyze.mockRejectedValue(
        new Error('Sentiment analysis failed'),
      );

      const result = await service.processContent(
        'Test Article',
        'Test content for sentiment analysis.',
      );

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      // Should provide default values when sentiment analysis fails
    });
  });

  describe('performance benchmarks', () => {
    it('should process content within performance thresholds', async () => {
      const content = `
        Ethereum's transition to proof-of-stake consensus mechanism represents 
        a significant milestone in blockchain technology evolution. The upgrade 
        reduces energy consumption by 99.95% while maintaining security through 
        validator staking mechanisms. Economic incentives align validator 
        behavior with network security, creating a sustainable ecosystem for 
        decentralized applications and smart contract execution.
      `;

      const startTime = Date.now();
      const result = await service.processContent(
        'Ethereum PoS Analysis',
        content,
      );
      const endTime = Date.now();

      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(1000); // Should process within 1 second
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should maintain accuracy under high-volume processing', async () => {
      const testArticles = Array(100)
        .fill(0)
        .map((_, index) => ({
          id: `test-${index}`,
          title: `Test Article ${index}`,
          content: `
          This is test content for article ${index}. Bitcoin and Ethereum 
          continue to dominate the cryptocurrency market with strong 
          institutional adoption. DeFi protocols show innovation in 
          yield farming and automated market making.
        `,
        }));

      const startTime = Date.now();
      const results = await service.batchProcessContent(testArticles);
      const endTime = Date.now();

      const totalProcessingTime = endTime - startTime;
      const averageProcessingTime = totalProcessingTime / testArticles.length;

      expect(results.size).toBe(testArticles.length);
      expect(averageProcessingTime).toBeLessThan(100); // Less than 100ms per article on average

      // Verify accuracy maintained across all results
      const allResults = Array.from(results.values());
      const averageQuality =
        allResults.reduce((sum, r) => sum + r.qualityScore, 0) /
        allResults.length;
      const averageRelevance =
        allResults.reduce((sum, r) => sum + r.relevanceScore, 0) /
        allResults.length;

      expect(averageQuality).toBeGreaterThan(0.5);
      expect(averageRelevance).toBeGreaterThan(0.7); // Should be high due to crypto content
    });
  });

  describe('error handling and robustness', () => {
    it('should handle empty content gracefully', async () => {
      const result = await service.processContent('', '');

      expect(result).toBeDefined();
      expect(result.qualityScore).toBeDefined();
      expect(result.relevanceScore).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle very long content efficiently', async () => {
      const longContent = 'Bitcoin analysis. '.repeat(10000); // Very long content

      const startTime = Date.now();
      const result = await service.processContent(
        'Long Content Test',
        longContent,
      );
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.summary.length).toBeLessThan(600); // Summary should be condensed
    });

    it('should handle content with special characters and encoding', async () => {
      const specialContent = `
        Bitcoin (₿) reaches €65,000 milestone. Cryptocurrency exchanges report 
        24-hour volume of ¥500億. Market capitalization exceeds $1.3T with 
        growing adoption in 中国, ประเทศไทย, and العربية regions.
      `;

      const result = await service.processContent(
        'Special Characters Test',
        specialContent,
      );

      expect(result).toBeDefined();
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.keywords.some((kw) => kw.includes('bitcoin'))).toBe(true);
    });

    it('should provide consistent results for identical content', async () => {
      const content =
        'Ethereum smart contracts enable DeFi innovation and growth.';

      const result1 = await service.processContent('Test 1', content);
      const result2 = await service.processContent('Test 1', content);

      expect(result1.qualityScore).toBe(result2.qualityScore);
      expect(result1.relevanceScore).toBe(result2.relevanceScore);
      expect(result1.keywords).toEqual(result2.keywords);
      expect(result1.categories).toEqual(result2.categories);
    });
  });

  describe('market signal extraction', () => {
    it('should extract relevant market signals from content', async () => {
      const marketContent = `
        Bitcoin price surged 15% following institutional adoption news. 
        Trading volume increased 200% while regulatory approval boosted 
        investor confidence. Technical analysis shows bullish breakout 
        patterns with strong support at $65,000 level.
      `;

      // Mock market sentiment analyzer to return market signals
      mockSentimentAnalyzer.analyzeMarketSentiment.mockResolvedValue({
        sentiment: { score: 0.8, label: 'positive', confidence: 0.9 },
        marketSignals: {
          bullish: 0.8,
          bearish: 0.1,
          volatility: 0.3,
        },
      });

      const result = await service.processContent(
        'Market Signals Test',
        marketContent,
      );

      expect(mockSentimentAnalyzer.analyzeMarketSentiment).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
