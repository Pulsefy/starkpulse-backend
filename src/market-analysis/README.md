# Market Analysis Module

## Overview
This module provides institutional-grade market analysis tools, including technical indicators, pattern recognition, sentiment and trend analysis, custom workflows, reporting, and notifications.

## Architecture
- **Indicators:** Pluggable registry for 50+ technical indicators (SMA, EMA, RSI, MACD, etc.).
- **Patterns:** Registry for chart and candlestick pattern recognition algorithms.
- **Sentiment:** Registry for sentiment analysis sources (e.g., Twitter, news).
- **Trend:** Registry for trend metrics.
- **Workflows:** JSON/DSL-based custom analysis pipelines.
- **Reporting:** Pluggable PDF/HTML report generators.
- **Notifications:** Integration with notifications module for alerts.

## Extension Points
- Add new indicators, patterns, sentiment sources, or trend metrics by implementing the respective interface and registering in the registry.
- Add new report generators for custom formats.
- Define custom workflows using the workflow interface.

## Usage Example

### Running a Workflow
```typescript
import { exampleWorkflow } from './workflows/example.workflow';
const result = await marketAnalysisService.runWorkflowWithMarketData(exampleWorkflow, 'BTC');
```

### Sending a Notification
```typescript
await marketAnalysisService.sendAnalysisNotification(userId, 'Alert', 'Pattern detected!');
```

### Generating a Report
```typescript
import { ReportingRegistry } from './reporting';
const generator = ReportingRegistry.get('PDF');
const report = await generator.generate(result);
```

## Testing
Run `npm test` to execute unit and integration tests for all analysis components.

## Contributing
- Follow the interface and registry pattern for new features.
- Add tests for all new logic.
- Document new features in this README. 