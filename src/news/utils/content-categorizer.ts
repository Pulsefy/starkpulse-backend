import { Injectable } from '@nestjs/common';
import { NewsCategory } from '../entities/news-category.entity';

@Injectable()
export class ContentCategorizer {
  private categories: Map<string, NewsCategory> = new Map();

  constructor() {
    this.initializeCategories();
  }

  async categorize(article: { title: string; content: string; source?: string }): Promise<string[]> {
    const text = `${article.title} ${article.content}`.toLowerCase();
    const matchedCategories: { category: string; confidence: number }[] = [];

    for (const [categoryName, category] of this.categories) {
      const confidence = this.calculateCategoryConfidence(text, category);
      if (confidence > 0.3) {
        matchedCategories.push({ category: categoryName, confidence });
      }
    }

    matchedCategories.sort((a, b) => b.confidence - a.confidence);

    const sourceBasedCategory = this.getCategoryFromSource(article.source || '');
    if (sourceBasedCategory && !matchedCategories.find(m => m.category === sourceBasedCategory)) {
      matchedCategories.push({ category: sourceBasedCategory, confidence: 0.4 });
    }

    const finalCategories = matchedCategories
      .slice(0, 3)
      .map(m => m.category);

    return finalCategories.length > 0 ? finalCategories : ['general'];
  }

  private calculateCategoryConfidence(text: string, category: NewsCategory): number {
    let score = 0;
    let matches = 0;

    for (const keyword of category.keywords) {
      const keywordRegex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
      const keywordMatches = (text.match(keywordRegex) || []).length;
      
      if (keywordMatches > 0) {
        matches++;
        score += keywordMatches * this.getKeywordWeight(keyword);
      }
    }

    if (matches === 0) return 0;

    const baseConfidence = Math.min(score / category.keywords.length, 1);
    const matchRatio = matches / category.keywords.length;
    
    return baseConfidence * 0.7 + matchRatio * 0.3;
  }

  private getKeywordWeight(keyword: string): number {
    const highWeightKeywords = [
      'election', 'president', 'congress', 'senate',
      'stock', 'market', 'economy', 'gdp', 'inflation',
      'covid', 'vaccine', 'pandemic', 'health',
      'climate', 'global warming', 'environment',
      'ai', 'artificial intelligence', 'technology'
    ];

    if (highWeightKeywords.includes(keyword.toLowerCase())) {
      return 2.0;
    }

    if (keyword.length > 8) {
      return 1.5;
    }

    return 1.0;
  }

  private getCategoryFromSource(source: string): string | null {
    const domain = source.toLowerCase();

    if (domain.includes('bloomberg') || domain.includes('marketwatch') || 
        domain.includes('reuters') && domain.includes('business')) {
      return 'finance';
    }

    if (domain.includes('techcrunch') || domain.includes('wired') || 
        domain.includes('ars-technica') || domain.includes('verge')) {
      return 'technology';
    }

    if (domain.includes('espn') || domain.includes('sports')) {
      return 'sports';
    }

    if (domain.includes('variety') || domain.includes('hollywood') || 
        domain.includes('entertainment')) {
      return 'entertainment';
    }

    if (domain.includes('politico') || domain.includes('washingtonpost') || 
        domain.includes('cnn') && domain.includes('politics')) {
      return 'politics';
    }

    return null;
  }

  private initializeCategories(): void {
    const categoryDefinitions = [
      {
        id: 'politics',
        name: 'Politics',
        description: 'Political news and government affairs',
        keywords: [
          'politics', 'government', 'election', 'vote', 'candidate', 'president',
          'congress', 'senate', 'house', 'democrat', 'republican', 'policy',
          'legislation', 'bill', 'law', 'campaign', 'political', 'governor',
          'mayor', 'parliament', 'minister', 'administration', 'diplomatic'
        ],
        parentCategory: undefined,
        subCategories: ['domestic-politics', 'international-politics'],
        confidence: 0.8
      },
      {
        id: 'finance',
        name: 'Finance & Markets',
        description: 'Financial markets, economy, and business news',
        keywords: [
          'stock', 'market', 'economy', 'financial', 'investment', 'trading',
          'nasdaq', 'dow', 'sp500', 'gdp', 'inflation', 'interest rate',
          'federal reserve', 'earnings', 'revenue', 'profit', 'loss',
          'cryptocurrency', 'bitcoin', 'ethereum', 'blockchain', 'forex',
          'commodities', 'oil', 'gold', 'bonds', 'mortgage', 'banking'
        ],
        parentCategory: undefined,
        subCategories: ['stocks', 'crypto', 'commodities', 'economics'],
        confidence: 0.8
      },
      {
        id: 'technology',
        name: 'Technology',
        description: 'Technology news, innovations, and digital trends',
        keywords: [
          'technology', 'tech', 'ai', 'artificial intelligence', 'machine learning',
          'software', 'hardware', 'computer', 'internet', 'digital',
          'smartphone', 'apple', 'google', 'microsoft', 'amazon', 'meta',
          'tesla', 'startup', 'innovation', 'cybersecurity', 'data',
          'cloud computing', 'robotics', 'automation', 'programming',
          'app', 'platform', 'algorithm', 'virtual reality', 'augmented reality'
        ],
        parentCategory: undefined,
        subCategories: ['ai-ml', 'cybersecurity', 'mobile', 'software'],
        confidence: 0.8
      },
      {
        id: 'health',
        name: 'Health & Medicine',
        description: 'Health, medical research, and healthcare news',
        keywords: [
          'health', 'medical', 'medicine', 'healthcare', 'hospital',
          'doctor', 'patient', 'disease', 'treatment', 'vaccine',
          'covid', 'pandemic', 'virus', 'bacteria', 'drug', 'pharmaceutical',
          'clinical trial', 'fda', 'research', 'study', 'diagnosis',
          'therapy', 'surgery', 'mental health', 'fitness', 'nutrition'
        ],
        parentCategory: undefined,
        subCategories: ['medical-research', 'public-health', 'mental-health'],
        confidence: 0.8
      },
      {
        id: 'sports',
        name: 'Sports',
        description: 'Sports news, games, and athletic events',
        keywords: [
          'sports', 'football', 'basketball', 'baseball', 'soccer',
          'tennis', 'golf', 'hockey', 'olympics', 'nfl', 'nba',
          'mlb', 'nhl', 'fifa', 'championship', 'tournament',
          'athlete', 'coach', 'team', 'game', 'match', 'score',
          'playoff', 'season', 'league', 'stadium', 'training'
        ],
        parentCategory: undefined,
        subCategories: ['professional-sports', 'college-sports', 'international-sports'],
        confidence: 0.8
      },
      {
        id: 'entertainment',
        name: 'Entertainment',
        description: 'Entertainment industry, celebrities, and media',
        keywords: [
          'entertainment', 'movie', 'film', 'television', 'tv', 'show',
          'celebrity', 'actor', 'actress', 'director', 'music',
          'album', 'song', 'concert', 'hollywood', 'netflix',
          'disney', 'streaming', 'theater', 'broadway', 'award',
          'oscar', 'emmy', 'grammy', 'festival', 'premiere'
        ],
        parentCategory: undefined,
        subCategories: ['movies', 'music', 'television', 'celebrity'],
        confidence: 0.8
      },
      {
        id: 'science',
        name: 'Science',
        description: 'Scientific research, discoveries, and innovations',
        keywords: [
          'science', 'research', 'study', 'discovery', 'experiment',
          'scientist', 'physics', 'chemistry', 'biology', 'astronomy',
          'space', 'nasa', 'climate', 'environment', 'conservation',
          'energy', 'renewable', 'solar', 'nuclear', 'genetic',
          'dna', 'evolution', 'ecology', 'geology', 'mathematics'
        ],
        parentCategory: undefined,
        subCategories: ['space', 'climate', 'biology', 'physics'],
        confidence: 0.8
      },
      {
        id: 'world',
        name: 'World News',
        description: 'International news and global events',
        keywords: [
          'international', 'world', 'global', 'country', 'nation',
          'foreign', 'embassy', 'diplomat', 'war', 'conflict',
          'peace', 'treaty', 'united nations', 'eu', 'nato',
          'trade', 'import', 'export', 'sanctions', 'refugee',
          'immigration', 'border', 'terrorism', 'security'
        ],
        parentCategory: undefined,
        subCategories: ['middle-east', 'europe', 'asia', 'africa'],
        confidence: 0.8
      },
      {
        id: 'business',
        name: 'Business',
        description: 'Business news, corporate affairs, and industry updates',
        keywords: [
          'business', 'company', 'corporation', 'ceo', 'executive',
          'startup', 'entrepreneur', 'merger', 'acquisition',
          'ipo', 'funding', 'venture capital', 'industry',
          'manufacturing', 'retail', 'sales', 'marketing',
          'advertising', 'brand', 'consumer', 'supply chain'
        ],
        parentCategory: undefined,
        subCategories: ['startups', 'corporate', 'retail', 'manufacturing'],
        confidence: 0.8
      },
      {
        id: 'general',
        name: 'General News',
        description: 'General news and miscellaneous topics',
        keywords: [
          'news', 'breaking', 'update', 'report', 'story',
          'event', 'happening', 'current', 'today', 'recent'
        ],
        parentCategory: undefined,
        subCategories: [],
        confidence: 0.5
      }
    ];

    categoryDefinitions.forEach(category => {
      this.categories.set(category.id, category as NewsCategory);
    });
  }

  async addCustomCategory(category: NewsCategory): Promise<void> {
    this.categories.set(category.id, category);
  }

  async updateCategoryKeywords(categoryId: string, keywords: string[]): Promise<void> {
    const category = this.categories.get(categoryId);
    if (category) {
      category.keywords = keywords;
      this.categories.set(categoryId, category);
    }
  }

  async getCategoryByName(name: string): Promise<NewsCategory | null> {
    return this.categories.get(name) || null;
  }

  async getAllCategories(): Promise<NewsCategory[]> {
    return Array.from(this.categories.values());
  }

  async getSubcategories(parentCategoryId: string): Promise<NewsCategory[]> {
    const parentCategory = this.categories.get(parentCategoryId);
    if (!parentCategory) return [];

    return Array.from(this.categories.values()).filter(
      category => category.parentCategory === parentCategoryId
    );
  }

  async suggestCategories(text: string, limit: number = 5): Promise<{ category: string; confidence: number }[]> {
    const suggestions: { category: string; confidence: number }[] = [];

    for (const [categoryName, category] of this.categories) {
      const confidence = this.calculateCategoryConfidence(text.toLowerCase(), category);
      if (confidence > 0.1) {
        suggestions.push({ category: categoryName, confidence });
      }
    }

    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }
}