export class PersonalizationPreferencesDto {
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