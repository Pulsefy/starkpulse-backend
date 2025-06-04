import { MarketDataDto } from './market-data.dto';

export class MarketAnalysisRequestDto {
  data: MarketDataDto[]; // primary market data for a symbol (e.g., BTC)
  compareWith?: MarketDataDto[]; // optional: data for another symbol to compute correlation
}
