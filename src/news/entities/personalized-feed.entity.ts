import { NewsArticle } from "./news-article.entity";

export interface PersonalizedFeed {
  userId: string;
  articles: NewsArticle[];
  generatedAt: Date;
  preferences: PersonalizationPreferences;
  feedScore?: number;
}

export interface PersonalizationPreferences {
  categories: string[];
  sources: string[];
  keywords: string[];
  sentimentPreference?: 'positive' | 'negative' | 'neutral' | 'all';
  minReliabilityScore: number;
  maxArticlesPerDay: number;
  preferredLanguages: string[];
  excludedSources?: string[];
  excludedKeywords?: string[];
}