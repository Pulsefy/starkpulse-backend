import { MarketDataDto } from './market-data.dto';

export class MarketAnalysisRequestDto {
  data: MarketDataDto[];                // Required: main asset data
  compareWith?: MarketDataDto[];        // Optional: secondary asset for correlation
  sentimentTexts?: string[];            // Optional: array of news headlines, tweets, etc.
}
