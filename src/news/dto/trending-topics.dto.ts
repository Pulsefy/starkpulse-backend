export class TrendingTopicsDto {
  topics: TrendingTopicItem[];
  timeframe: string;
  generatedAt: Date;
  totalArticlesAnalyzed: number;
}

export class TrendingTopicItem {
  topic: string;
  score: number;
  articleCount: number;
  relatedKeywords: string[];
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  growthRate: number;
  category: string;
}