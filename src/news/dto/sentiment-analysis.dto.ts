export class SentimentAnalysisDto {
  text: string;
  language?: string;
  includeEmotions?: boolean;
}

export class SentimentResultDto {
  score: number;
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions?: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    surprise: number;
    disgust: number;
  };
}