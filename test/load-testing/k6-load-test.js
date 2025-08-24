import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTrend = new Trend('response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users over 2 minutes
    { duration: '5m', target: 10 }, // Stay at 10 users for 5 minutes
    { duration: '2m', target: 20 }, // Ramp up to 20 users over 2 minutes
    { duration: '5m', target: 20 }, // Stay at 20 users for 5 minutes
    { duration: '2m', target: 0 }, // Ramp down to 0 users over 2 minutes
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.1'], // Error rate should be below 10%
    errors: ['rate<0.1'], // Custom error rate should be below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const users = [
  { id: 'user1', walletAddress: '0x742d35Cc6634C0532925a3b8D3Ac65e' },
  { id: 'user2', walletAddress: '0x8ba1f109551bD432803012645Hac65e' },
  { id: 'user3', walletAddress: '0x1234567890123456789012345678901234567890' },
];

function getRandomUser() {
  return users[Math.floor(Math.random() * users.length)];
}

export default function () {
  const user = getRandomUser();

  // Test scenario 1: Get portfolio data
  testPortfolioEndpoints(user);

  // Test scenario 2: Transaction operations
  testTransactionEndpoints(user);

  // Test scenario 3: Notification operations
  testNotificationEndpoints(user);

  // Test scenario 4: Analytics endpoints
  testAnalyticsEndpoints(user);

  sleep(1); // Wait 1 second between iterations
}

function testPortfolioEndpoints(user) {
  const headers = {
    Authorization: `Bearer ${user.id}`,
    'Content-Type': 'application/json',
  };

  // Get portfolio summary
  let response = http.get(`${BASE_URL}/portfolio/${user.walletAddress}`, {
    headers,
  });

  const success = check(response, {
    'portfolio status is 200': (r) => r.status === 200,
    'portfolio response time < 500ms': (r) => r.timings.duration < 500,
    'portfolio has data': (r) => r.json('totalValueUsd') !== undefined,
  });

  errorRate.add(!success);
  responseTrend.add(response.timings.duration);

  // Get portfolio assets
  response = http.get(`${BASE_URL}/portfolio/${user.walletAddress}/assets`, {
    headers,
  });

  check(response, {
    'assets status is 200': (r) => r.status === 200,
    'assets response time < 300ms': (r) => r.timings.duration < 300,
  });
}

function testTransactionEndpoints(user) {
  const headers = {
    Authorization: `Bearer ${user.id}`,
    'Content-Type': 'application/json',
  };

  // Get transactions with pagination
  let response = http.get(`${BASE_URL}/transactions?page=1&limit=20`, {
    headers,
  });

  check(response, {
    'transactions status is 200': (r) => r.status === 200,
    'transactions response time < 400ms': (r) => r.timings.duration < 400,
    'transactions pagination works': (r) =>
      r.headers['X-Total-Count'] !== undefined,
  });

  // Get transaction analytics
  response = http.get(`${BASE_URL}/transactions/analytics`, { headers });

  check(response, {
    'analytics status is 200': (r) => r.status === 200,
    'analytics response time < 600ms': (r) => r.timings.duration < 600,
  });
}

function testNotificationEndpoints(user) {
  const headers = {
    Authorization: `Bearer ${user.id}`,
    'Content-Type': 'application/json',
  };

  // Get notifications
  let response = http.get(`${BASE_URL}/notifications`, { headers });

  check(response, {
    'notifications status is 200': (r) => r.status === 200,
    'notifications response time < 300ms': (r) => r.timings.duration < 300,
  });

  // Mark random notification as read (if any exist)
  const notifications = response.json();
  if (notifications && notifications.length > 0) {
    const notificationId = notifications[0].id;
    response = http.put(
      `${BASE_URL}/notifications/${notificationId}/read`,
      {},
      { headers },
    );

    check(response, {
      'mark as read status is 200': (r) => r.status === 200,
      'mark as read response time < 200ms': (r) => r.timings.duration < 200,
    });
  }
}

function testAnalyticsEndpoints(user) {
  const headers = {
    Authorization: `Bearer ${user.id}`,
    'Content-Type': 'application/json',
  };

  // Get portfolio analytics
  let response = http.get(
    `${BASE_URL}/analytics/portfolio/${user.walletAddress}`,
    { headers },
  );

  check(response, {
    'portfolio analytics status is 200': (r) => r.status === 200,
    'portfolio analytics response time < 800ms': (r) =>
      r.timings.duration < 800,
  });

  // Get performance metrics
  response = http.get(
    `${BASE_URL}/analytics/performance/${user.walletAddress}`,
    { headers },
  );

  check(response, {
    'performance metrics status is 200': (r) => r.status === 200,
    'performance metrics response time < 1000ms': (r) =>
      r.timings.duration < 1000,
  });
}

// Spike test scenario
export function handleSummary(data) {
  return {
    'performance-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = `
${indent}Performance Test Summary
${indent}========================
${indent}
${indent}Total Requests: ${data.metrics.http_reqs.count}
${indent}Failed Requests: ${data.metrics.http_req_failed.count} (${(data.metrics.http_req_failed.rate * 100).toFixed(2)}%)
${indent}
${indent}Response Times:
${indent}  Average: ${data.metrics.http_req_duration.avg.toFixed(2)}ms
${indent}  95th Percentile: ${data.metrics.http_req_duration['p(95)'].toFixed(2)}ms
${indent}  99th Percentile: ${data.metrics.http_req_duration['p(99)'].toFixed(2)}ms
${indent}
${indent}Virtual Users:
${indent}  Peak: ${data.metrics.vus_max.max}
${indent}  Average: ${data.metrics.vus.avg.toFixed(2)}
${indent}
${indent}Data Transfer:
${indent}  Received: ${(data.metrics.data_received.count / 1024 / 1024).toFixed(2)} MB
${indent}  Sent: ${(data.metrics.data_sent.count / 1024 / 1024).toFixed(2)} MB
`;

  return summary;
}
