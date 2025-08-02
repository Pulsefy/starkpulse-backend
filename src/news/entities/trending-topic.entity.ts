import { NewsArticle } from "./news-article.entity";

export interface SentimentResult {
  score: number;
  label: string;
}

export interface TrendingTopic {
  topic: string;
  score: number;
  articles: NewsArticle[];
  relatedKeywords: string[];
  sentiment: SentimentResult;
  growthRate: number;
  timeframe: string;
  category: string;
}