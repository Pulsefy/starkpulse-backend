export { Indicator } from './indicator.interface';
export { IndicatorRegistry } from './indicator-registry';
// Import all indicators to ensure registration
import './sma.indicator';
import './ema.indicator';
import './wma.indicator';
import './rsi.indicator';
import './macd.indicator';
import './bollinger-bands.indicator';
// TODO: Import more indicators here 