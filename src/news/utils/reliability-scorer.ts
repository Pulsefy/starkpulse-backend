import { Injectable } from '@nestjs/common';
import { SourceReliability } from '../entities/source-reliability.entity';

@Injectable()
export class ReliabilityScorer {
  private sourceDatabase: Map<string, SourceReliability> = new Map();
  
  private readonly trustedSources = new Set([
    'reuters.com',
    'apnews.com',
    'bbc.com',
    'npr.org',
    'wsj.com',
    'ft.com',
    'bloomberg.com',
    'economist.com',
    'cnn.com',
    'washingtonpost.com',
    'nytimes.com',
    'theguardian.com',
    'politico.com',
    'axios.com',
    'time.com',
    'newsweek.com'
  ]);

  private readonly questionableSources = new Set([
    'rt.com',
    'infowars.com',
    'breitbart.com',
    'dailymail.co.uk',
    'nypost.com'
  ]);

  async scoreSource(source: string): Promise<number> {
    const cachedScore = this.sourceDatabase.get(source);
    if (cachedScore && this.isRecentScore(cachedScore.lastUpdated)) {
      return cachedScore.reliabilityScore;
    }

    const reliability = await this.calculateReliabilityScore(source);
    this.sourceDatabase.set(source, reliability);
    return reliability.reliabilityScore;
  }

  private async calculateReliabilityScore(source: string): Promise<SourceReliability> {
    const domain = this.extractDomain(source);
    
    let baseScore = 0.5;
    let factualAccuracy = 0.5;
    let editorialBias = 0.5;
    let transparencyScore = 0.5;
    let historicalPerformance = 0.5;
    let verificationStatus: 'verified' | 'pending' | 'flagged' = 'pending';

    if (this.trustedSources.has(domain)) {
      baseScore = 0.85;
      factualAccuracy = 0.9;
      editorialBias = 0.8;
      transparencyScore = 0.9;
      historicalPerformance = 0.85;
      verificationStatus = 'verified';
    } else if (this.questionableSources.has(domain)) {
      baseScore = 0.3;
      factualAccuracy = 0.4;
      editorialBias = 0.3;
      transparencyScore = 0.3;
      historicalPerformance = 0.35;
      verificationStatus = 'flagged';
    } else {
      const scores = await this.analyzeUnknownSource(domain);
      baseScore = scores.baseScore;
      factualAccuracy = scores.factualAccuracy;
      editorialBias = scores.editorialBias;
      transparencyScore = scores.transparencyScore;
      historicalPerformance = scores.historicalPerformance;
    }

    const domainAge = await this.getDomainAge(domain);
    const ageBonus = this.calculateAgeBonus(domainAge);
    
    const httpsBonus = source.startsWith('https://') ? 0.05 : 0;
    const socialMediaPenalty = this.isSocialMedia(domain) ? -0.2 : 0;
    
    const finalScore = Math.max(0, Math.min(1, 
      baseScore + ageBonus + httpsBonus + socialMediaPenalty
    ));

    return {
      source: domain,
      reliabilityScore: finalScore,
      factualAccuracy,
      editorialBias,
      transparencyScore,
      historicalPerformance,
      lastUpdated: new Date(),
      articleCount: 0,
      verificationStatus
    };
  }

  private async analyzeUnknownSource(domain: string): Promise<{
    baseScore: number;
    factualAccuracy: number;
    editorialBias: number;
    transparencyScore: number;
    historicalPerformance: number;
  }> {
    let baseScore = 0.5;
    let factualAccuracy = 0.5;
    let editorialBias = 0.5;
    let transparencyScore = 0.5;
    let historicalPerformance = 0.5;

    if (domain.includes('news') || domain.includes('times') || domain.includes('post')) {
      baseScore += 0.1;
      factualAccuracy += 0.1;
    }

    if (domain.includes('blog') || domain.includes('personal')) {
      baseScore -= 0.1;
      transparencyScore -= 0.1;
    }

    if (domain.endsWith('.gov') || domain.endsWith('.edu')) {
      baseScore += 0.2;
      factualAccuracy += 0.2;
      transparencyScore += 0.2;
    }

    if (domain.includes('conspiracy') || domain.includes('alternative')) {
      baseScore -= 0.3;
      factualAccuracy -= 0.4;
      const verificationStatus = 'flagged';
    }

    const tld = this.extractTLD(domain);
    if (['com', 'org', 'net', 'gov', 'edu'].includes(tld)) {
      baseScore += 0.05;
    }

    return {
      baseScore: Math.max(0, Math.min(1, baseScore)),
      factualAccuracy: Math.max(0, Math.min(1, factualAccuracy)),
      editorialBias: Math.max(0, Math.min(1, editorialBias)),
      transparencyScore: Math.max(0, Math.min(1, transparencyScore)),
      historicalPerformance: Math.max(0, Math.min(1, historicalPerformance))
    };
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return url.replace(/^www\./, '');
    }
  }

  private extractTLD(domain: string): string {
    const parts = domain.split('.');
    return parts[parts.length - 1];
  }

  private async getDomainAge(domain: string): Promise<number> {
    return Math.random() * 10 + 1;
  }

  private calculateAgeBonus(ageInYears: number): number {
    if (ageInYears < 1) return -0.1;
    if (ageInYears < 2) return 0;
    if (ageInYears < 5) return 0.05;
    if (ageInYears < 10) return 0.1;
    return 0.15;
  }

  private isSocialMedia(domain: string): boolean {
    const socialMediaDomains = [
      'twitter.com', 'facebook.com', 'instagram.com', 'tiktok.com',
      'reddit.com', 'youtube.com', 'linkedin.com', 'telegram.org'
    ];
    return socialMediaDomains.some(social => domain.includes(social));
  }

  private isRecentScore(lastUpdated: Date): boolean {
    const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate < 24;
  }

  async updateSourceReliability(source: string, feedback: {
    accurate?: boolean;
    biased?: boolean;
    trustworthy?: boolean;
  }): Promise<void> {
    const current = this.sourceDatabase.get(source);
    if (!current) return;

    if (feedback.accurate !== undefined) {
      current.factualAccuracy = this.adjustScore(current.factualAccuracy, feedback.accurate);
    }
    if (feedback.biased !== undefined) {
      current.editorialBias = this.adjustScore(current.editorialBias, !feedback.biased);
    }
    if (feedback.trustworthy !== undefined) {
      current.historicalPerformance = this.adjustScore(current.historicalPerformance, feedback.trustworthy);
    }

    current.reliabilityScore = (
      current.factualAccuracy * 0.4 +
      current.editorialBias * 0.3 +
      current.transparencyScore * 0.2 +
      current.historicalPerformance * 0.1
    );

    current.lastUpdated = new Date();
    this.sourceDatabase.set(source, current);
  }

  private adjustScore(currentScore: number, isPositive: boolean): number {
    const adjustment = isPositive ? 0.02 : -0.02;
    return Math.max(0, Math.min(1, currentScore + adjustment));
  }

  async getSourceReliability(source: string): Promise<SourceReliability | null> {
    return this.sourceDatabase.get(source) || null;
  }

  async getAllSourceReliabilities(): Promise<SourceReliability[]> {
    return Array.from(this.sourceDatabase.values());
  }
}