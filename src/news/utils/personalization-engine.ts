import { Injectable } from '@nestjs/common';
import { NewsArticle } from '../entities/news-article.entity';
import { UserPreferences } from '../entities/user-preferences.entity';
import { PersonalizedFeedDto } from '../dto/personalized-feed.dto';
import { PersonalizationPreferencesDto } from '../dto/personalization-preferences.dto';

export interface PersonalizationScore {
  articleId: string;
  score: number;
  reasons: string[];
}

export interface UserInteraction {
  userId: string;
  articleId: string;
  interactionType: 'view' | 'like' | 'share' | 'comment' | 'skip';
  timestamp: Date;
  timeSpent?: number;
}

@Injectable()
export class PersonalizationEngine {
  private userInteractionHistory: Map<string, UserInteraction[]> = new Map();
  private categoryWeights: Map<string, Record<string, number>> = new Map();
  private sourceWeights: Map<string, Record<string, number>> = new Map();
  private keywordWeights: Map<string, Record<string, number>> = new Map();

  async personalizeArticles(
    articles: NewsArticle[],
    userPreferences: UserPreferences,
    feedRequest: PersonalizedFeedDto,
  ): Promise<NewsArticle[]> {
    const scoredArticles = await Promise.all(
      articles.map(async (article) => {
        const score = await this.calculatePersonalizationScore(
          article,
          userPreferences,
        );
        return { article, score };
      }),
    );

    const sortedArticles = scoredArticles
      .sort((a, b) => b.score.score - a.score.score)
      .slice(0, feedRequest.limit || 50)
      .map((item) => {
        item.article.relevanceScore = item.score.score;
        return item.article;
      });

    return this.diversifyResults(sortedArticles, userPreferences);
  }

  async calculatePersonalizationScore(
    article: NewsArticle,
    userPreferences: UserPreferences,
  ): Promise<PersonalizationScore> {
    const reasons: string[] = [];
    let totalScore = 0;

    const categoryScore = this.calculateCategoryScore(article, userPreferences);
    if (categoryScore > 0) {
      totalScore += categoryScore * 0.3;
      reasons.push(`Category match: ${article.category}`);
    }

    const sourceScore = this.calculateSourceScore(article, userPreferences);
    if (sourceScore > 0) {
      totalScore += sourceScore * 0.25;
      reasons.push(`Preferred source: ${article.source}`);
    }

    const keywordScore = this.calculateKeywordScore(article, userPreferences);
    if (keywordScore > 0) {
      totalScore += keywordScore * 0.2;
      reasons.push('Keyword interests match');
    }

    const recencyScore = this.calculateRecencyScore(article);
    totalScore += recencyScore * 0.15;

    const engagementScore = this.calculateEngagementBoost(article);
    totalScore += engagementScore * 0.1;

    const userHistoryScore = await this.calculateUserHistoryScore(
      article,
      userPreferences.userId,
    );
    totalScore += userHistoryScore * 0.1;

    const sentimentScore = this.calculateSentimentScore(
      article,
      userPreferences,
    );
    if (sentimentScore !== 0) {
      totalScore += sentimentScore * 0.05;
      reasons.push(
        `Sentiment preference: ${userPreferences.sentimentPreference}`,
      );
    }

    const diversityPenalty = this.calculateDiversityPenalty(
      article,
      userPreferences.userId,
    );
    totalScore -= diversityPenalty;

    return {
      articleId: article.id,
      score: Math.max(0, Math.min(1, totalScore)),
      reasons,
    };
  }

  private calculateCategoryScore(
    article: NewsArticle,
    userPreferences: UserPreferences,
  ): number {
    if (!userPreferences.preferredCategories?.length) return 0;

    const userCategoryWeights =
      this.categoryWeights.get(userPreferences.userId) || {};
    const baseScore = userPreferences.preferredCategories.includes(
      article.category,
    )
      ? 0.8
      : 0;
    const weightBonus = userCategoryWeights[article.category] || 0;

    return Math.min(1, baseScore + weightBonus);
  }

  private calculateSourceScore(
    article: NewsArticle,
    userPreferences: UserPreferences,
  ): number {
    if (userPreferences.blockedSources?.includes(article.source)) {
      return -0.5;
    }

    if (!userPreferences.preferredSources?.length) return 0;

    const userSourceWeights =
      this.sourceWeights.get(userPreferences.userId) || {};
    const baseScore = userPreferences.preferredSources.includes(article.source)
      ? 0.7
      : 0;
    const weightBonus = userSourceWeights[article.source] || 0;

    return Math.min(1, baseScore + weightBonus);
  }

  private calculateKeywordScore(
    article: NewsArticle,
    userPreferences: UserPreferences,
  ): number {
    if (!userPreferences.keywords?.length || !article.keywords?.length)
      return 0;

    const userKeywordWeights =
      this.keywordWeights.get(userPreferences.userId) || {};
    let score = 0;
    let matchCount = 0;

    for (const keyword of userPreferences.keywords) {
      const keywordLower = keyword.toLowerCase();
      const titleMatch = article.title.toLowerCase().includes(keywordLower);
      const contentMatch = article.content.toLowerCase().includes(keywordLower);
      const tagMatch = article.keywords.some((tag) =>
        tag.toLowerCase().includes(keywordLower),
      );

      if (titleMatch || contentMatch || tagMatch) {
        matchCount++;
        const weight = userKeywordWeights[keyword] || 1;

        if (titleMatch) score += 0.3 * weight;
        if (contentMatch) score += 0.1 * weight;
        if (tagMatch) score += 0.2 * weight;
      }
    }

    return Math.min(1, score * (matchCount / userPreferences.keywords.length));
  }

  private calculateRecencyScore(article: NewsArticle): number {
    const now = new Date().getTime();
    const articleTime = article.publishedAt.getTime();
    const hoursSincePublished = (now - articleTime) / (1000 * 60 * 60);

    if (hoursSincePublished < 1) return 1;
    if (hoursSincePublished < 6) return 0.8;
    if (hoursSincePublished < 24) return 0.6;
    if (hoursSincePublished < 72) return 0.4;
    return 0.2;
  }

  private calculateEngagementBoost(article: NewsArticle): number {
    if (!article.engagementScore) return 0;
    return Math.min(0.3, article.engagementScore / 100);
  }

  private async calculateUserHistoryScore(
    article: NewsArticle,
    userId: string,
  ): Promise<number> {
    const interactions = this.userInteractionHistory.get(userId) || [];

    const similarArticles = interactions.filter((interaction) => {
      return (
        interaction.interactionType === 'like' ||
        interaction.interactionType === 'share'
      );
    });

    if (similarArticles.length === 0) return 0;

    let similarityScore = 0;
    for (const interaction of similarArticles) {
      if (article.category === interaction.articleId) {
        similarityScore += 0.1;
      }
      if (article.source === interaction.articleId) {
        similarityScore += 0.05;
      }
    }

    return Math.min(0.3, similarityScore);
  }

  private calculateSentimentScore(
    article: NewsArticle,
    userPreferences: UserPreferences,
  ): number {
    if (
      !userPreferences.sentimentPreference ||
      userPreferences.sentimentPreference === 'all'
    ) {
      return 0;
    }

    if (!article.sentimentLabel) return 0;

    return article.sentimentLabel === userPreferences.sentimentPreference
      ? 0.2
      : -0.1;
  }

  private calculateDiversityPenalty(
    article: NewsArticle,
    userId: string,
  ): number {
    const recentInteractions = this.getRecentInteractions(userId, 24);

    const sameSourceCount = recentInteractions.filter(
      (i) => i.interactionType === 'view' && article.source === i.articleId,
    ).length;

    const sameCategoryCount = recentInteractions.filter(
      (i) => i.interactionType === 'view' && article.category === i.articleId,
    ).length;

    let penalty = 0;
    if (sameSourceCount > 3) penalty += 0.1 * (sameSourceCount - 3);
    if (sameCategoryCount > 5) penalty += 0.05 * (sameCategoryCount - 5);

    return Math.min(0.3, penalty);
  }

  private diversifyResults(
    articles: NewsArticle[],
    userPreferences: UserPreferences,
  ): NewsArticle[] {
    const diversified: NewsArticle[] = [];
    const sourceCount: Record<string, number> = {};
    const categoryCount: Record<string, number> = {};

    for (const article of articles) {
      const sourceLimit = 3;
      const categoryLimit = 5;

      if ((sourceCount[article.source] || 0) >= sourceLimit) continue;
      if ((categoryCount[article.category] || 0) >= categoryLimit) continue;

      diversified.push(article);
      sourceCount[article.source] = (sourceCount[article.source] || 0) + 1;
      categoryCount[article.category] =
        (categoryCount[article.category] || 0) + 1;

      if (
        diversified.length >=
        (userPreferences.preferredCategories?.length || 1) * 10
      )
        break;
    }

    return diversified;
  }

  async recordUserInteraction(interaction: UserInteraction): Promise<void> {
    const userInteractions =
      this.userInteractionHistory.get(interaction.userId) || [];
    userInteractions.push(interaction);

    this.userInteractionHistory.set(
      interaction.userId,
      userInteractions.slice(-100),
    );

    await this.updateUserWeights(interaction);
  }

  private async updateUserWeights(interaction: UserInteraction): Promise<void> {
    const weightAdjustment = this.getWeightAdjustment(
      interaction.interactionType,
    );

    if (
      interaction.interactionType === 'like' ||
      interaction.interactionType === 'share'
    ) {
      this.adjustCategoryWeight(
        interaction.userId,
        'category',
        weightAdjustment,
      );
      this.adjustSourceWeight(interaction.userId, 'source', weightAdjustment);
    } else if (interaction.interactionType === 'skip') {
      this.adjustCategoryWeight(
        interaction.userId,
        'category',
        -weightAdjustment,
      );
      this.adjustSourceWeight(interaction.userId, 'source', -weightAdjustment);
    }
  }

  private getWeightAdjustment(interactionType: string): number {
    const adjustments = {
      like: 0.1,
      share: 0.15,
      comment: 0.08,
      view: 0.02,
      skip: -0.05,
    };
    return adjustments[interactionType] || 0;
  }

  private adjustCategoryWeight(
    userId: string,
    category: string,
    adjustment: number,
  ): void {
    const weights = this.categoryWeights.get(userId) || {};
    weights[category] = Math.max(
      -0.5,
      Math.min(0.5, (weights[category] || 0) + adjustment),
    );
    this.categoryWeights.set(userId, weights);
  }

  private adjustSourceWeight(
    userId: string,
    source: string,
    adjustment: number,
  ): void {
    const weights = this.sourceWeights.get(userId) || {};
    weights[source] = Math.max(
      -0.5,
      Math.min(0.5, (weights[source] || 0) + adjustment),
    );
    this.sourceWeights.set(userId, weights);
  }

  private adjustKeywordWeight(
    userId: string,
    keyword: string,
    adjustment: number,
  ): void {
    const weights = this.keywordWeights.get(userId) || {};
    weights[keyword] = Math.max(
      -0.5,
      Math.min(0.5, (weights[keyword] || 0) + adjustment),
    );
    this.keywordWeights.set(userId, weights);
  }

  private getRecentInteractions(
    userId: string,
    hours: number = 24,
  ): UserInteraction[] {
    const interactions = this.userInteractionHistory.get(userId) || [];
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    return interactions.filter(
      (interaction) => interaction.timestamp >= cutoff,
    );
  }

  async getUserInsights(userId: string): Promise<{
    topCategories: Array<{ category: string; weight: number }>;
    topSources: Array<{ source: string; weight: number }>;
    topKeywords: Array<{ keyword: string; weight: number }>;
    interactionSummary: Record<string, number>;
  }> {
    const categoryWeights = this.categoryWeights.get(userId) || {};
    const sourceWeights = this.sourceWeights.get(userId) || {};
    const keywordWeights = this.keywordWeights.get(userId) || {};
    const interactions = this.userInteractionHistory.get(userId) || [];

    const interactionSummary = interactions.reduce(
      (summary, interaction) => {
        summary[interaction.interactionType] =
          (summary[interaction.interactionType] || 0) + 1;
        return summary;
      },
      {} as Record<string, number>,
    );

    return {
      topCategories: Object.entries(categoryWeights)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([category, weight]) => ({ category, weight })),
      topSources: Object.entries(sourceWeights)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([source, weight]) => ({ source, weight })),
      topKeywords: Object.entries(keywordWeights)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([keyword, weight]) => ({ keyword, weight })),
      interactionSummary,
    };
  }

  async clearUserData(userId: string): Promise<void> {
    this.userInteractionHistory.delete(userId);
    this.categoryWeights.delete(userId);
    this.sourceWeights.delete(userId);
    this.keywordWeights.delete(userId);
  }

  async getRecommendedCategories(
    userId: string,
    limit: number = 5,
  ): Promise<string[]> {
    const categoryWeights = this.categoryWeights.get(userId) || {};

    return Object.entries(categoryWeights)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([category]) => category);
  }

  async getRecommendedSources(
    userId: string,
    limit: number = 5,
  ): Promise<string[]> {
    const sourceWeights = this.sourceWeights.get(userId) || {};

    return Object.entries(sourceWeights)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([source]) => source);
  }
}
