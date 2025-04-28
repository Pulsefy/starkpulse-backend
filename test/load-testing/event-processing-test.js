import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const eventProcessingErrors = new Counter('event_processing_errors');
const eventProcessingSuccessRate = new Rate('event_processing_success_rate');
const eventProcessingTime = new Trend('event_processing_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users for 1 minute
    { duration: '30s', target: 30 },  // Ramp up to 30 users
    { duration: '1m', target: 30 },   // Stay at 30 users for 1 minute
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users for 2 minutes
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests should be below 500ms
    'event_processing_success_rate': ['rate>0.95'],  // 95% success rate
    'event_processing_time': ['p(95)<1000'],  // 95% of processing time under 1000ms
  },
};

// Authentication function
function getAuthToken() {
  const loginUrl = 'http://localhost:3001/api/auth/login';
  const payload = JSON.stringify({
    username: 'testuser',
    password: 'test-password'
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const res = http.post(loginUrl, payload, params);
  
  if (res.status === 200) {
    const body = JSON.parse(res.body);
    return body.accessToken;
  } else {
    console.log(`Login failed: ${res.status}`);
    return null;
  }
}

// Main test function
export default function() {
  // Get authentication token
  // In a real scenario, you might want to get this once per VU and reuse it
  const token = __ENV.ACCESS_TOKEN || getAuthToken();
  
  // Common headers
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // 1. Test listing events
  {
    const startTime = new Date();
    const listUrl = 'http://localhost:3001/api/blockchain/events/list?limit=20';
    const res = http.get(listUrl, { headers });
    
    check(res, {
      'list events status is 200': (r) => r.status === 200,
      'list events has data': (r) => {
        const body = JSON.parse(r.body);
        return body.events && Array.isArray(body.events);
      },
    });
    
    eventProcessingTime.add(new Date() - startTime);
    eventProcessingSuccessRate.add(res.status === 200);
    
    if (res.status !== 200) {
      eventProcessingErrors.add(1);
      console.log(`List events failed: ${res.status}, ${res.body}`);
    }
    
    // Add some think time 
    sleep(Math.random() * 1);
  }
  
  // 2. Test getting contract info
  {
    const contractIds = [
      '29d310af-63b0-4f07-b5b0-fd875ce4f98c',  // Replace with actual IDs from your test environment
      '7bc8a4f1-92e3-4d88-b0f2-167bce42a512',
      '9e7bc123-45d6-78ef-90a1-b2c3d4e5f678'
    ];
    
    const contractId = contractIds[Math.floor(Math.random() * contractIds.length)];
    const startTime = new Date();
    const contractUrl = `http://localhost:3001/api/blockchain/events/contracts/${contractId}`;
    const res = http.get(contractUrl, { headers });
    
    check(res, {
      'get contract status is 200': (r) => r.status === 200,
      'get contract has data': (r) => {
        const body = JSON.parse(r.body);
        return body.id === contractId;
      },
    });
    
    eventProcessingTime.add(new Date() - startTime);
    eventProcessingSuccessRate.add(res.status === 200);
    
    if (res.status !== 200) {
      eventProcessingErrors.add(1);
    }
    
    sleep(Math.random() * 1);
  }
  
  // 3. Test processing pending events
  {
    const startTime = new Date();
    const processUrl = 'http://localhost:3001/api/blockchain/events/process-pending';
    const res = http.post(processUrl, null, { headers });
    
    check(res, {
      'process pending status is 200': (r) => r.status === 200,
      'process pending has success': (r) => {
        const body = JSON.parse(r.body);
        return body.success === true;
      },
    });
    
    eventProcessingTime.add(new Date() - startTime);
    eventProcessingSuccessRate.add(res.status === 200);
    
    if (res.status !== 200) {
      eventProcessingErrors.add(1);
      console.log(`Process pending failed: ${res.status}, ${res.body}`);
    }
    
    // Longer sleep after processing as this is a heavier operation
    sleep(Math.random() * 2 + 1);
  }
  
  // 4. Test manual sync for a contract (less frequently)
  if (Math.random() < 0.3) {  // Only run this for ~30% of iterations
    const contractIds = [
      '29d310af-63b0-4f07-b5b0-fd875ce4f98c',  // Replace with actual IDs
      '7bc8a4f1-92e3-4d88-b0f2-167bce42a512'
    ];
    
    const contractId = contractIds[Math.floor(Math.random() * contractIds.length)];
    const startTime = new Date();
    const syncUrl = `http://localhost:3001/api/blockchain/events/contracts/${contractId}/sync`;
    const res = http.post(syncUrl, null, { headers });
    
    check(res, {
      'manual sync status is 200': (r) => r.status === 200,
      'manual sync has success': (r) => {
        const body = JSON.parse(r.body);
        return body.success === true;
      },
    });
    
    eventProcessingTime.add(new Date() - startTime);
    eventProcessingSuccessRate.add(res.status === 200);
    
    if (res.status !== 200) {
      eventProcessingErrors.add(1);
      console.log(`Manual sync failed: ${res.status}, ${res.body}`);
    }
    
    // Longer sleep after sync as this is a very heavy operation
    sleep(Math.random() * 3 + 2);
  }
} 