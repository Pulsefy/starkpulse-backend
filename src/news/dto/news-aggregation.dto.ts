export class NewsAggregationDto {
  sources?: string[];
  categories?: string[];
  timeframe?: '1h' | '6h' | '24h' | '7d';
  includeReliabilityScore?: boolean;
  includeSentiment?: boolean;
  includeTrending?: boolean;
  limit?: number;
}