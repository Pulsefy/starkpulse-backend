export class NewsFilterDto {
  categories?: string[];
  sources?: string[];
  keywords?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  minReliabilityScore?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sortBy?: 'date' | 'relevance' | 'reliability' | 'sentiment';
  limit?: number;
  offset?: number;
}
