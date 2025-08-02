# Real-time Portfolio Analytics Engine

## Overview

The Real-time Portfolio Analytics Engine provides sophisticated portfolio analysis capabilities including risk metrics, performance analysis, correlation analysis, and optimization suggestions.

## Features

### 1. Real-time Portfolio Analytics Service (`PortfolioAnalyticsService`)

Located in `src/portfolio/services/portfolio-analytics.service.ts`

**Key Methods:**
- `calculateRiskMetrics()` - Calculates VaR, Sharpe ratio, volatility, max drawdown, beta, and Sortino ratio
- `calculatePerformanceMetrics()` - Calculates total return, annualized return, and period returns
- `calculateAssetCorrelations()` - Analyzes correlations between portfolio assets
- `generateOptimizationSuggestions()` - Provides portfolio optimization recommendations
- `calculateBenchmarkComparison()` - Compares portfolio against market indices
- `calculatePerformanceAttribution()` - Analyzes performance sources

### 2. Risk Calculation Utilities (`RiskCalculationsUtil`)

Located in `src/portfolio/utils/risk-calculations.util.ts`

**Risk Metrics:**
- **Value at Risk (VaR)** - Historical simulation method
- **Sharpe Ratio** - Risk-adjusted return measure
- **Sortino Ratio** - Downside deviation-based ratio
- **Volatility** - Annualized standard deviation
- **Maximum Drawdown** - Largest peak-to-trough decline
- **Beta** - Market sensitivity measure
- **Correlation Analysis** - Asset correlation calculations

### 3. Real-time WebSocket Updates

Enhanced `PortfolioGateway` with new analytics events:
- `analyticsUpdate` - Real-time analytics data updates
- `riskAlert` - Risk threshold alerts
- `performanceUpdate` - Performance metric updates

**WebSocket Events:**
```javascript
// Subscribe to analytics updates
socket.emit('subscribeToAnalytics');

// Listen for updates
socket.on('analyticsUpdate', (data) => {
  console.log('Analytics updated:', data);
});

socket.on('riskAlert', (alert) => {
  console.log('Risk alert:', alert);
});
```

### 4. API Endpoints

All endpoints are prefixed with `/api/portfolio/analytics`

#### GET `/summary`
Returns comprehensive portfolio analytics summary including risk metrics, performance metrics, and correlations.

#### GET `/risk`
Returns detailed risk metrics:
```json
{
  "var": 0.025,
  "sharpeRatio": 1.2,
  "volatility": 0.18,
  "maxDrawdown": 0.15,
  "beta": 0.95,
  "sortinoRatio": 1.8
}
```

#### GET `/performance`
Returns performance metrics:
```json
{
  "totalReturn": 0.25,
  "annualizedReturn": 0.12,
  "dailyReturn": 0.001,
  "weeklyReturn": 0.008,
  "monthlyReturn": 0.035,
  "ytdReturn": 0.18
}
```

#### GET `/correlation`
Returns asset correlation analysis:
```json
[
  {
    "assetAddress": "0x123...",
    "symbol": "ETH",
    "correlation": 0.85,
    "weight": 0.45
  }
]
```

#### GET `/optimization`
Returns portfolio optimization suggestions:
```json
{
  "suggestedAllocation": {
    "0x123...": 0.4,
    "0x456...": 0.3,
    "0x789...": 0.3
  },
  "expectedReturnImprovement": 0.05,
  "riskReduction": 0.02,
  "rebalancingRecommendations": [
    "Increase ETH allocation by 5%",
    "Reduce BTC allocation by 3%"
  ]
}
```

#### GET `/benchmark`
Returns benchmark comparison data.

#### GET `/attribution`
Returns performance attribution analysis.

## Query Parameters

All endpoints support the following query parameters:

- `period` (string): Time period for analysis (`7d`, `30d`, `90d`, `1y`)
- `riskFreeRate` (number): Risk-free rate for Sharpe ratio calculation (default: 0.02)
- `confidenceLevel` (number): Confidence level for VaR calculation (default: 0.95)

## Usage Examples

### JavaScript/TypeScript Client

```typescript
// Get risk metrics
const riskMetrics = await fetch('/api/portfolio/analytics/risk?period=30d', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Get optimization suggestions
const optimization = await fetch('/api/portfolio/analytics/optimization', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Subscribe to real-time updates
const socket = io('/portfolio', {
  auth: { token: userToken }
});

socket.emit('subscribeToAnalytics');
socket.on('analyticsUpdate', (data) => {
  updateDashboard(data);
});
```

### cURL Examples

```bash
# Get portfolio analytics summary
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/portfolio/analytics/summary?period=30d"

# Get risk metrics with custom parameters
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/portfolio/analytics/risk?riskFreeRate=0.03&confidenceLevel=0.99"
```

## Configuration

The analytics engine uses the following default parameters:
- Risk-free rate: 2% annually
- VaR confidence level: 95%
- Trading days per year: 252
- Default analysis period: 30 days

## Dependencies

- `@nestjs/websockets` - WebSocket functionality
- `socket.io` - Real-time communication
- `@nestjs/typeorm` - Database operations
- `class-validator` - DTO validation
- `@nestjs/swagger` - API documentation

## Testing

Run the analytics service tests:
```bash
npm test -- portfolio-analytics.service.spec.ts
```

## Performance Considerations

- Analytics calculations are cached for 5 minutes
- Real-time updates are throttled to prevent excessive WebSocket traffic
- Historical data is limited to the last 2 years for performance
- Risk calculations use optimized algorithms for large datasets

## Security

- All endpoints require JWT authentication
- User data is isolated by user ID
- Input validation prevents injection attacks
- Rate limiting prevents abuse

## Future Enhancements

- Machine learning-based portfolio optimization
- Advanced risk models (Monte Carlo simulation)
- Multi-asset correlation matrices
- Custom benchmark creation
- Performance attribution by sector/asset class
- Real-time market data integration
- Automated rebalancing suggestions 