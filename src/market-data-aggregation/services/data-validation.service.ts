import { Injectable, Logger } from '@nestjs/common';
import { MarketDataPoint } from './market-data.service';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  qualityScore: number;
}

export interface DataQualityMetrics {
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  validity: number;
}

@Injectable()
export class DataValidationService {
  private readonly logger = new Logger(DataValidationService.name);

  async validateData(dataPoints: MarketDataPoint[]): Promise<MarketDataPoint[]> {
    const validatedPoints: MarketDataPoint[] = [];

    for (const point of dataPoints) {
      const validation = await this.validateDataPoint(point);
      
      if (validation.isValid) {
        validatedPoints.push({
          ...point,
          qualityScore: validation.qualityScore
        } as any);
      } else {
        this.logger.warn(`Invalid data point from ${point.source}: ${validation.errors.join(', ')}`);
      }
    }

    return this.removeDuplicates(validatedPoints);
  }

  private async validateDataPoint(point: MarketDataPoint): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!point.symbol || typeof point.symbol !== 'string') {
      errors.push('Invalid symbol');
    }

    if (!point.price || point.price <= 0 || !isFinite(point.price)) {
      errors.push('Invalid price');
    }

    if (point.volume < 0 || !isFinite(point.volume)) {
      errors.push('Invalid volume');
    }

    if (point.marketCap < 0 || !isFinite(point.marketCap)) {
      errors.push('Invalid market cap');
    }

    if (!point.timestamp || isNaN(point.timestamp.getTime())) {
      errors.push('Invalid timestamp');
    }

    if (!point.source || typeof point.source !== 'string') {
      errors.push('Invalid source');
    }

    if (Math.abs(point.priceChange24h) > 100) {
      warnings.push('Extreme price change detected');
    }

    if (point.timestamp && point.timestamp.getTime() > Date.now() + 60000) {
      errors.push('Future timestamp detected');
    }

    if (point.timestamp && Date.now() - point.timestamp.getTime() > 300000) {
      warnings.push('Stale data detected');
    }

    const qualityMetrics = this.calculateQualityMetrics(point, errors, warnings);
    const qualityScore = this.calculateOverallQuality(qualityMetrics);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      qualityScore
    };
  }

  private calculateQualityMetrics(point: MarketDataPoint, errors: string[], warnings: string[]): DataQualityMetrics {
    const completeness = this.calculateCompleteness(point);
    const accuracy = this.calculateAccuracy(point, errors);
    const consistency = this.calculateConsistency(point);
    const timeliness = this.calculateTimeliness(point);
    const validity = errors.length === 0 ? 1 : 0;

    return {
      completeness,
      accuracy,
      consistency,
      timeliness,
      validity
    };
  }

  private calculateCompleteness(point: MarketDataPoint): number {
    const requiredFields = ['symbol', 'price', 'volume', 'timestamp', 'source'];
    const optionalFields = ['marketCap', 'priceChange24h'];
    
    let score = 0;
    let totalFields = requiredFields.length + optionalFields.length;

    for (const field of requiredFields) {
      if (point[field] !== undefined && point[field] !== null) {
        score += 1;
      }
    }

    for (const field of optionalFields) {
      if (point[field] !== undefined && point[field] !== null && point[field] !== 0) {
        score += 0.5;
      }
    }

    return Math.min(1, score / (requiredFields.length + optionalFields.length * 0.5));
  }

  private calculateAccuracy(point: MarketDataPoint, errors: string[]): number {
    if (errors.length > 0) return 0;

    let accuracy = 1;

    if (point.price > 1000000 || point.price < 0.000001) {
      accuracy -= 0.1;
    }

    if (point.volume > point.marketCap * 10) {
      accuracy -= 0.1;
    }

    if (Math.abs(point.priceChange24h) > 50) {
      accuracy -= 0.2;
    }

    return Math.max(0, accuracy);
  }

  private calculateConsistency(point: MarketDataPoint): number {
    let consistency = 1;

    if (point.marketCap > 0 && point.price > 0) {
      const impliedCirculatingSupply = point.marketCap / point.price;
      if (impliedCirculatingSupply < 1000 || impliedCirculatingSupply > 1e12) {
        consistency -= 0.2;
      }
    }

    return Math.max(0, consistency);
  }

  private calculateTimeliness(point: MarketDataPoint): number {
    if (!point.timestamp) return 0;

    const age = Date.now() - point.timestamp.getTime();
    const maxAge = 300000;

    return Math.max(0, 1 - age / maxAge);
  }

  private calculateOverallQuality(metrics: DataQualityMetrics): number {
    const weights = {
      completeness: 0.2,
      accuracy: 0.3,
      consistency: 0.2,
      timeliness: 0.15,
      validity: 0.15
    };

    return (
      metrics.completeness * weights.completeness +
      metrics.accuracy * weights.accuracy +
      metrics.consistency * weights.consistency +
      metrics.timeliness * weights.timeliness +
      metrics.validity * weights.validity
    );
  }

  private removeDuplicates(dataPoints: MarketDataPoint[]): MarketDataPoint[] {
    const seen = new Set<string>();
    return dataPoints.filter(point => {
      const key = `${point.symbol}-${point.source}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async validateHistoricalData(symbol: string, dataPoints: MarketDataPoint[]): Promise<MarketDataPoint[]> {
    const sortedData = dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const validatedData: MarketDataPoint[] = [];

    for (let i = 0; i < sortedData.length; i++) {
      const point = sortedData[i];
      const validation = await this.validateDataPoint(point);

      if (validation.isValid) {
        if (i > 0) {
          const previousPoint = validatedData[validatedData.length - 1];
          const priceChange = Math.abs((point.price - previousPoint.price) / previousPoint.price);
          
          if (priceChange > 0.5) {
            this.logger.warn(`Suspicious price change detected for ${symbol}: ${priceChange * 100}%`);
            continue;
          }
        }

        validatedData.push(point);
      }
    }

    return validatedData;
  }
}
