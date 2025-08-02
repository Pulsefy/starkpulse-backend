# Adaptive Rate Limiting & Monitoring Dashboard

This document describes the implementation of adaptive rate limiting based on system load and the admin monitoring dashboard for issue #90.

## Features Implemented

### 1. Adaptive Rate Limiting Based on System Load

The system now dynamically adjusts rate limits based on real-time CPU and memory usage:

- **CPU Monitoring**: Tracks CPU usage percentage and load average
- **Memory Monitoring**: Monitors heap and system memory usage
- **Adaptive Multiplier**: Automatically adjusts rate limits using a multiplier (0.1x to 2.0x)
- **Safe Intervals**: Adaptive checks run every 30 seconds to avoid performance impact
- **Configurable Thresholds**: CPU and memory thresholds are configurable via environment variables

#### How It Works

1. **System Health Monitoring**: The `EnhancedSystemHealthService` continuously monitors system metrics
2. **Load Detection**: When CPU > 85% or Memory > 80%, the system reduces rate limits
3. **Recovery**: When load is low, rate limits gradually return to normal
4. **Multiplier Adjustment**: Uses a configurable adjustment factor (default: 0.1) for smooth transitions

#### Configuration

```env
# Enable adaptive rate limiting
ADAPTIVE_RATE_LIMITING_ENABLED=true

# Thresholds
ADAPTIVE_CPU_THRESHOLD=85
ADAPTIVE_MEMORY_THRESHOLD=80

# Adjustment settings
ADAPTIVE_ADJUSTMENT_FACTOR=0.1
ADAPTIVE_MIN_MULTIPLIER=0.1
ADAPTIVE_MAX_MULTIPLIER=2.0

# Base limits
ADAPTIVE_BASE_LIMIT=100
ADAPTIVE_MAX_LIMIT=1000
ADAPTIVE_MIN_LIMIT=10
```

### 2. Rate-Limiting Analytics & Monitoring Dashboard

A secure admin-only dashboard provides real-time insights into rate limiting:

#### Endpoints

- `GET /admin/rate-limit/stats` - Get comprehensive rate limit statistics
- `GET /admin/rate-limit/system/health` - Get current system health metrics
- `GET /admin/rate-limit/adaptive/status` - Get adaptive rate limiting status

#### Protected Access

All endpoints are protected with:
- JWT Authentication (`JwtAuthGuard`)
- Admin Role Authorization (`AdminGuard`)

#### Response Data

The `/admin/rate-limit/stats` endpoint returns:

```json
{
  "systemMetrics": {
    "totalUsers": 150,
    "totalRequests": 12500,
    "totalDeniedRequests": 45,
    "averageCpuLoad": 65.2,
    "averageMemoryLoad": 72.8,
    "averageAdaptiveMultiplier": 0.85,
    "currentSystemMetrics": {
      "cpuUsage": 68.5,
      "memoryUsage": 75.2,
      "systemLoad": 1.2,
      "cores": 8
    }
  },
  "userStats": [
    {
      "userId": 123,
      "key": "user:123",
      "bucketSize": 100,
      "refillRate": 10,
      "tokensLeft": 85,
      "lastRequestTime": "2024-01-15T10:30:00Z",
      "deniedRequests": 2,
      "totalRequests": 45,
      "systemCpuLoad": 68.5,
      "systemMemoryLoad": 75.2,
      "adaptiveMultiplier": 0.85,
      "createdAt": "2024-01-15T09:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Architecture

### Core Components

1. **EnhancedSystemHealthService**: Monitors CPU, memory, and system load
2. **RateLimitMetricsStore**: In-memory store for rate limiting metrics
3. **AdminRateLimitController**: Admin-only endpoints for monitoring
4. **AdminGuard**: Role-based authorization for admin endpoints
5. **Enhanced RateLimitService**: Integrates adaptive logic and metrics recording

### Data Flow

1. **Request Processing**:
   ```
   Request → RateLimitGuard → RateLimitService → Adaptive Logic → Metrics Recording
   ```

2. **System Monitoring**:
   ```
   SystemHealthService → CPU/Memory Monitoring → Adaptive Multiplier → Rate Limit Adjustment
   ```

3. **Admin Dashboard**:
   ```
   Admin Request → JWT Auth → Admin Role Check → Metrics Retrieval → Dashboard Response
   ```

## Performance Considerations

- **Memory Usage**: Metrics store limited to 10,000 entries with automatic cleanup
- **CPU Impact**: System monitoring runs every 30 seconds with minimal overhead
- **Storage**: In-memory storage for fast access with 24-hour retention
- **Scalability**: Designed to handle high-traffic scenarios with configurable limits

## Security Features

- **Admin-Only Access**: All monitoring endpoints require admin role
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Authorization**: Explicit admin role checking
- **Input Validation**: Comprehensive DTO validation for all endpoints
- **Rate Limiting**: Admin endpoints also respect rate limits

## Usage Examples

### Enable Adaptive Rate Limiting

```typescript
// In your .env file
ADAPTIVE_RATE_LIMITING_ENABLED=true
ADAPTIVE_CPU_THRESHOLD=85
ADAPTIVE_MEMORY_THRESHOLD=80
```

### Access Admin Dashboard

```bash
# Get all rate limit statistics
curl -H "Authorization: Bearer YOUR_ADMIN_JWT" \
     http://localhost:3000/admin/rate-limit/stats

# Get system health
curl -H "Authorization: Bearer YOUR_ADMIN_JWT" \
     http://localhost:3000/admin/rate-limit/system/health

# Get adaptive status
curl -H "Authorization: Bearer YOUR_ADMIN_JWT" \
     http://localhost:3000/admin/rate-limit/adaptive/status
```

### Filter by User

```bash
# Get stats for specific user
curl -H "Authorization: Bearer YOUR_ADMIN_JWT" \
     "http://localhost:3000/admin/rate-limit/stats?userId=123&limit=50"
```

## Testing

Run the test suite to verify functionality:

```bash
npm test -- --testPathPattern=adaptive-rate-limit
```

The test suite covers:
- Adaptive rate limiting logic
- System health monitoring
- Metrics recording and retrieval
- Admin endpoint security

## Monitoring and Alerting

The system provides comprehensive monitoring capabilities:

- **Real-time Metrics**: Live system health and rate limiting statistics
- **Historical Data**: 24-hour retention of metrics for trend analysis
- **Load Detection**: Automatic detection of high system load
- **Adaptive Response**: Dynamic rate limit adjustment based on system conditions

## Future Enhancements

Potential improvements for future iterations:

1. **Database Storage**: Persistent storage for historical metrics
2. **Advanced Analytics**: Trend analysis and predictive rate limiting
3. **Custom Thresholds**: Per-user or per-endpoint adaptive thresholds
4. **Integration**: Prometheus/Grafana integration for advanced monitoring
5. **Machine Learning**: ML-based load prediction and rate limit optimization 