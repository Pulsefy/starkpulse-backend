/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Sentiment from 'sentiment';

const sentiment = new Sentiment();

// Moving Average
export function calculateSMA(data: number[], period: number): number[] {
  return data.map((_, idx) => {
    if (idx < period - 1) return NaN;
    const slice = data.slice(idx - period + 1, idx + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

export function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  let ema = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

// RSI (Relative Strength Index)
export function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  let gains = 0, losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = 100 - (100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsi[i] = 100 - (100 / (1 + avgGain / avgLoss));
  }

  return rsi;
}

// Pearson Correlation
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  const numerator = x.reduce((acc, xi, i) => acc + (xi - meanX) * (y[i] - meanY), 0);
  const denominatorX = Math.sqrt(x.reduce((acc, xi) => acc + Math.pow(xi - meanX, 2), 0));
  const denominatorY = Math.sqrt(y.reduce((acc, yi) => acc + Math.pow(yi - meanY, 2), 0));

  return numerator / (denominatorX * denominatorY);
}

// Volatility: standard deviation
export function calculateVolatility(data: number[]): number {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  return Math.sqrt(variance);
}

// Sentiment Analysis
interface SentimentResult {
  score: number;
  comparative: number;
}

export function analyzeSentiment(texts: string[]): SentimentResult {
  if (!texts || texts.length === 0) {
    return { score: 0, comparative: 0 };
  }

  const results = texts.map((text) => sentiment.analyze(text) as Sentiment.AnalysisResult);
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const totalComparative = results.reduce((sum, r) => sum + r.comparative, 0);

  return {
    score: totalScore,
    comparative: totalComparative / results.length,
  };
}
