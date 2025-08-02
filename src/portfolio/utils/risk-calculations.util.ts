export class RiskCalculationsUtil {
  /**
   * Calculate Value at Risk (VaR) using historical simulation
   */
  static calculateVaR(returns: number[], confidenceLevel: number = 0.95): number {
    if (returns.length === 0) return 0;
    
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    return Math.abs(sortedReturns[index] || 0);
  }

  /**
   * Calculate Sharpe Ratio
   */
  static calculateSharpeRatio(
    returns: number[], 
    riskFreeRate: number = 0.02
  ): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const excessReturn = avgReturn - riskFreeRate / 252; // Daily risk-free rate
    
    const variance = returns.reduce((acc, r) => acc + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? excessReturn / stdDev : 0;
  }

  /**
   * Calculate Sortino Ratio (using downside deviation)
   */
  static calculateSortinoRatio(
    returns: number[], 
    riskFreeRate: number = 0.02
  ): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const excessReturn = avgReturn - riskFreeRate / 252;
    
    const downsideReturns = returns.filter(r => r < avgReturn);
    const downsideVariance = downsideReturns.reduce((acc, r) => acc + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const downsideDeviation = Math.sqrt(downsideVariance);
    
    return downsideDeviation > 0 ? excessReturn / downsideDeviation : 0;
  }

  /**
   * Calculate annualized volatility
   */
  static calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((acc, r) => acc + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const dailyVolatility = Math.sqrt(variance);
    
    // Annualize by multiplying by square root of trading days (252)
    return dailyVolatility * Math.sqrt(252);
  }

  /**
   * Calculate maximum drawdown
   */
  static calculateMaxDrawdown(values: number[]): number {
    if (values.length === 0) return 0;
    
    let maxDrawdown = 0;
    let peak = values[0];
    
    for (const value of values) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown;
  }

  /**
   * Calculate Beta relative to market
   */
  static calculateBeta(portfolioReturns: number[], marketReturns: number[]): number {
    if (portfolioReturns.length !== marketReturns.length || portfolioReturns.length === 0) return 1;
    
    const portfolioAvg = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
    const marketAvg = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < portfolioReturns.length; i++) {
      const portfolioDiff = portfolioReturns[i] - portfolioAvg;
      const marketDiff = marketReturns[i] - marketAvg;
      numerator += portfolioDiff * marketDiff;
      denominator += marketDiff * marketDiff;
    }
    
    return denominator > 0 ? numerator / denominator : 1;
  }

  /**
   * Calculate correlation between two arrays
   */
  static calculateCorrelation(array1: number[], array2: number[]): number {
    if (array1.length !== array2.length || array1.length === 0) return 0;
    
    const avg1 = array1.reduce((sum, val) => sum + val, 0) / array1.length;
    const avg2 = array2.reduce((sum, val) => sum + val, 0) / array2.length;
    
    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;
    
    for (let i = 0; i < array1.length; i++) {
      const diff1 = array1[i] - avg1;
      const diff2 = array2[i] - avg2;
      numerator += diff1 * diff2;
      sumSq1 += diff1 * diff1;
      sumSq2 += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(sumSq1 * sumSq2);
    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate daily returns from portfolio values
   */
  static calculateDailyReturns(values: number[]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < values.length; i++) {
      const prevValue = values[i - 1];
      const currValue = values[i];
      
      if (prevValue > 0) {
        returns.push((currValue - prevValue) / prevValue);
      } else {
        returns.push(0);
      }
    }
    
    return returns;
  }

  /**
   * Calculate total return from start to end value
   */
  static calculateTotalReturn(startValue: number, endValue: number): number {
    if (startValue <= 0) return 0;
    return (endValue - startValue) / startValue;
  }

  /**
   * Calculate annualized return
   */
  static calculateAnnualizedReturn(
    totalReturn: number, 
    days: number
  ): number {
    if (days <= 0) return 0;
    return Math.pow(1 + totalReturn, 365 / days) - 1;
  }
} 