# StarkPulse Backend API

This repository contains the backend API for StarkPulse, a decentralized crypto news aggregator and portfolio management platform built on the StarkNet ecosystem.

## Overview

The StarkPulse backend is built with NestJS, providing a robust, scalable API that powers the StarkPulse platform. It handles data aggregation, blockchain interactions, user authentication, and serves as the bridge between the frontend application and the StarkNet blockchain.

## Key Features

- **News Aggregation Service** 📰: Collects and processes crypto news from multiple sources
- **StarkNet Integration** ⚡: Interacts with StarkNet blockchain and smart contracts
- **Transaction Monitoring** 🔍: Tracks and processes on-chain transactions
- **Portfolio Management** 📊: Stores and analyzes user portfolio data
- **User Authentication** 🔐: Secure user authentication with wallet integration
- **Webhook Notifications** 🔔: Real-time notifications for blockchain events
- **Contract Event Monitoring** 📡: Listens to and processes StarkNet smart contract events

## Event Monitoring System

The StarkPulse backend includes a powerful contract event monitoring system that listens for and processes events from StarkNet smart contracts. This system enables real-time updates and data synchronization with the blockchain.

### Features:

- **Contract Event Listener**: Monitors StarkNet blockchain for contract events
- **Event Filtering**: Ability to filter events by contract address and event type
- **Event Processing Pipeline**: Robust system to process events as they are received
- **Event Storage & Indexing**: Secures event data in PostgreSQL with efficient indexing
- **API Endpoints**: Comprehensive endpoints for retrieving and managing event data
- **Event-Triggered Actions**: Flexible system for triggering actions based on specific events

### API Endpoints:

- `GET /api/blockchain/events/contracts`: Get all registered contracts
- `POST /api/blockchain/events/contracts`: Register a new contract to monitor
- `GET /api/blockchain/events/contracts/:id`: Get a specific contract details
- `PUT /api/blockchain/events/contracts/:id`: Update contract monitoring settings
- `DELETE /api/blockchain/events/contracts/:id`: Remove a contract from monitoring
- `GET /api/blockchain/events/list`: Get contract events with filtering options
- `GET /api/blockchain/events/:id`: Get a specific event details
- `POST /api/blockchain/events/contracts/:id/sync`: Manually sync events for a contract
- `POST /api/blockchain/events/process-pending`: Process pending events

### Configuration:

```
# StarkNet Configuration in .env
STARKNET_PROVIDER_URL=https://alpha-mainnet.starknet.io
STARKNET_NETWORK=mainnet
STARKNET_POLLING_INTERVAL_MS=10000
```

## Tech Stack

- **NestJS**: Progressive Node.js framework
- **TypeScript**: Type-safe code
- **PostgreSQL**: Relational database
- **TypeORM**: Object-Relational Mapping
- **Starknet.js**: StarkNet blockchain interaction
- **Jest**: Testing framework
- **Swagger**: API documentation
- **Docker**: Containerization

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- PostgreSQL 14.0 or higher
- npm
- Git

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Pulsefy/starkPulse-backend.git
cd StarkPulse-API
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration.

4. Run database migrations:

```bash
npm run migration:run
```

5. Start the development server:

```bash
npm run start:dev
```

6. The API will be available at http://localhost:3001

## Project Structure

```
src/
├── app.module.ts                # Root module
├── main.ts                      # Application entry point
├── config/                      # Configuration
│   ├── config.module.ts
│   ├── config.service.ts
│   └── configuration.ts         # Environment variables
├── auth/                        # Authentication module
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/              # JWT and wallet strategies
│   ├── guards/                  # Auth guards
│   └── dto/                     # Data transfer objects
├── users/                       # User module
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── entities/                # Database entities
│   └── dto/
├── blockchain/                  # StarkNet integration
│   ├── blockchain.module.ts
│   ├── services/
│   │   ├── starknet.service.ts  # RPC connection
│   │   ├── event-listener.service.ts # Event monitoring
│   │   ├── event-processor.service.ts # Event processing
│   │   └── wallet.service.ts    # Wallet operations
│   ├── events/                  # Event controllers
│   ├── entities/                # Blockchain entities
│   ├── interfaces/              # Type interfaces
│   └── dto/                     # Data transfer objects
├── common/                      # Shared resources
│   ├── decorators/
│   ├── filters/                 # Exception filters
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── utils/
└── database/                    # Database configuration
    ├── database.module.ts
    └── migrations/

```

## API Endpoints Documentation

The API provides the following main endpoint groups:

- **/api/auth**: User authentication and profile management
- **/api/news**: News aggregation and filtering
- **/api/portfolio**: Portfolio tracking and analytics
- **/api/transactions**: Transaction monitoring and history
- **/api/blockchain**: StarkNet blockchain interaction
- **/api/blockchain/events**: Contract event monitoring and processing

Detailed API documentation is available via Swagger at `/api/docs` when the server is running.

## Blockchain Events API - Detailed Usage Examples

### Contract Management

#### 1. Register a New Contract for Monitoring

**Request:**
```bash
curl -X POST http://localhost:3001/api/blockchain/events/contracts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "address": "0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a",
    "name": "StarkPulse Token",
    "description": "ERC-20 token for StarkPulse platform",
    "monitoredEvents": ["Transfer", "Approval"],
    "isActive": true,
    "abi": [
      {
        "members": [
          {
            "name": "from_",
            "offset": 0,
            "type": "felt"
          },
          {
            "name": "to",
            "offset": 1,
            "type": "felt"
          },
          {
            "name": "value",
            "offset": 2,
            "type": "Uint256"
          }
        ],
        "name": "Transfer",
        "size": 3,
        "type": "event"
      },
      {
        "members": [
          {
            "name": "owner",
            "offset": 0,
            "type": "felt"
          },
          {
            "name": "spender",
            "offset": 1,
            "type": "felt"
          },
          {
            "name": "value",
            "offset": 2,
            "type": "Uint256"
          }
        ],
        "name": "Approval",
        "size": 3,
        "type": "event"
      }
    ]
  }'
```

**Response:**
```json
{
  "id": "29d310af-63b0-4f07-b5b0-fd875ce4f98c",
  "address": "0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a",
  "name": "StarkPulse Token",
  "description": "ERC-20 token for StarkPulse platform",
  "isActive": true,
  "monitoredEvents": ["Transfer", "Approval"],
  "abi": [...],
  "lastSyncedBlock": null,
  "createdAt": "2023-08-15T10:23:45.123Z",
  "updatedAt": "2023-08-15T10:23:45.123Z"
}
```

#### 2. Get All Monitored Contracts

**Request:**
```bash
curl -X GET http://localhost:3001/api/blockchain/events/contracts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
[
  {
    "id": "29d310af-63b0-4f07-b5b0-fd875ce4f98c",
    "address": "0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a",
    "name": "StarkPulse Token",
    "description": "ERC-20 token for StarkPulse platform",
    "isActive": true,
    "monitoredEvents": ["Transfer", "Approval"],
    "lastSyncedBlock": 456789,
    "createdAt": "2023-08-15T10:23:45.123Z",
    "updatedAt": "2023-08-15T10:23:45.123Z"
  },
  {
    "id": "7bc8a4f1-92e3-4d88-b0f2-167bce42a512",
    "address": "0x02356c3c529e0f6a2a1413af8982dec95ec22e848c5d1dbc4cf70932c35409b1",
    "name": "StarkPulse DEX",
    "description": "Decentralized exchange for StarkPulse platform",
    "isActive": true,
    "monitoredEvents": ["Trade", "LiquidityAdded", "LiquidityRemoved"],
    "lastSyncedBlock": 458123,
    "createdAt": "2023-08-10T14:47:32.890Z",
    "updatedAt": "2023-08-15T09:12:18.456Z"
  }
]
```

#### 3. Filter Contracts by Address or Active Status

**Request:**
```bash
curl -X GET "http://localhost:3001/api/blockchain/events/contracts?address=0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a&isActive=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
[
  {
    "id": "29d310af-63b0-4f07-b5b0-fd875ce4f98c",
    "address": "0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a",
    "name": "StarkPulse Token",
    "description": "ERC-20 token for StarkPulse platform",
    "isActive": true,
    "monitoredEvents": ["Transfer", "Approval"],
    "lastSyncedBlock": 456789,
    "createdAt": "2023-08-15T10:23:45.123Z",
    "updatedAt": "2023-08-15T10:23:45.123Z"
  }
]
```

#### 4. Get Specific Contract Details

**Request:**
```bash
curl -X GET http://localhost:3001/api/blockchain/events/contracts/29d310af-63b0-4f07-b5b0-fd875ce4f98c \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "id": "29d310af-63b0-4f07-b5b0-fd875ce4f98c",
  "address": "0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a",
  "name": "StarkPulse Token",
  "description": "ERC-20 token for StarkPulse platform",
  "isActive": true,
  "monitoredEvents": ["Transfer", "Approval"],
  "abi": [...],
  "lastSyncedBlock": 456789,
  "createdAt": "2023-08-15T10:23:45.123Z",
  "updatedAt": "2023-08-15T10:23:45.123Z"
}
```

#### 5. Update Contract Monitoring Settings

**Request:**
```bash
curl -X PUT http://localhost:3001/api/blockchain/events/contracts/29d310af-63b0-4f07-b5b0-fd875ce4f98c \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "StarkPulse ERC20",
    "monitoredEvents": ["Transfer", "Approval", "UpdatedMetadata"],
    "isActive": true
  }'
```

**Response:**
```json
{
  "id": "29d310af-63b0-4f07-b5b0-fd875ce4f98c",
  "address": "0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a",
  "name": "StarkPulse ERC20",
  "description": "ERC-20 token for StarkPulse platform",
  "isActive": true,
  "monitoredEvents": ["Transfer", "Approval", "UpdatedMetadata"],
  "abi": [...],
  "lastSyncedBlock": 456789,
  "createdAt": "2023-08-15T10:23:45.123Z",
  "updatedAt": "2023-08-15T11:34:12.567Z"
}
```

#### 6. Delete a Contract from Monitoring

**Request:**
```bash
curl -X DELETE http://localhost:3001/api/blockchain/events/contracts/29d310af-63b0-4f07-b5b0-fd875ce4f98c \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true
}
```

### Event Management

#### 1. List Contract Events with Filtering

**Request:**
```bash
curl -X GET "http://localhost:3001/api/blockchain/events/list?contractId=29d310af-63b0-4f07-b5b0-fd875ce4f98c&name=Transfer&isProcessed=true&limit=2&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "events": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Transfer",
      "contractId": "29d310af-63b0-4f07-b5b0-fd875ce4f98c",
      "data": {
        "keys": [
          "0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9",
          "0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a",
          "0x034563724e9f2b6fa164bc9cb38279610e1526dd3f6f99bo3e984ff6de13470"
        ],
        "data": ["0x0000000000000000000000000000000000000000000000056bc75e2d63100000"]
      },
      "blockNumber": 456790,
      "blockHash": "0x5ba65aed33deac1b47a461b1c1ceec98da833c79e397238c5ce3c48115ba72d",
      "transactionHash": "0x731b11e33a3c3fb290c8d282844928ad0dabb9c8a5be3b8b4a67b2ffd9b8fb9",
      "isProcessed": true,
      "createdAt": "2023-08-15T11:45:23.456Z",
      "contract": {
        "id": "29d310af-63b0-4f07-b5b0-fd875ce4f98c",
        "address": "0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a",
        "name": "StarkPulse ERC20"
      }
    },
    {
      "id": "63f42d8f-1a9b-4d2c-b8e4-10a44f3e7a21",
      "name": "Transfer",
      "contractId": "29d310af-63b0-4f07-b5b0-fd875ce4f98c",
      "data": {
        "keys": [
          "0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9",
          "0x034563724e9f2b6fa164bc9cb38279610e1526dd3f6f99bo3e984ff6de13470",
          "0x076cd76128983e4c4649e0d5f28ed0846d57a967205b97a9debc29b478d1410"
        ],
        "data": ["0x00000000000000000000000000000000000000000000000a968163f0a57b400"]
      },
      "blockNumber": 456791,
      "blockHash": "0x1ba65aed33deac1b47a461b1c1ceec98da833c79e397238c5ce3c48115ba72d",
      "transactionHash": "0x331b11e33a3c3fb290c8d282844928ad0dabb9c8a5be3b8b4a67b2ffd9b8fb9",
      "isProcessed": true,
      "createdAt": "2023-08-15T11:45:27.123Z",
      "contract": {
        "id": "29d310af-63b0-4f07-b5b0-fd875ce4f98c",
        "address": "0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a",
        "name": "StarkPulse ERC20"
      }
    }
  ],
  "pagination": {
    "total": 24,
    "limit": 2,
    "offset": 0
  }
}
```

#### 2. Filter Events by Block Range

**Request:**
```bash
curl -X GET "http://localhost:3001/api/blockchain/events/list?fromBlockNumber=456790&toBlockNumber=456795&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "events": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Transfer",
      "contractId": "29d310af-63b0-4f07-b5b0-fd875ce4f98c",
      "data": {
        "keys": [
          "0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9",
          "0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a",
          "0x034563724e9f2b6fa164bc9cb38279610e1526dd3f6f99bo3e984ff6de13470"
        ],
        "data": ["0x0000000000000000000000000000000000000000000000056bc75e2d63100000"]
      },
      "blockNumber": 456790,
      "blockHash": "0x5ba65aed33deac1b47a461b1c1ceec98da833c79e397238c5ce3c48115ba72d",
      "transactionHash": "0x731b11e33a3c3fb290c8d282844928ad0dabb9c8a5be3b8b4a67b2ffd9b8fb9",
      "isProcessed": true,
      "createdAt": "2023-08-15T11:45:23.456Z"
    },
    // More events within the block range...
  ],
  "pagination": {
    "total": 18,
    "limit": 5,
    "offset": 0
  }
}
```

#### 3. Get Specific Event Details

**Request:**
```bash
curl -X GET http://localhost:3001/api/blockchain/events/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Transfer",
  "contractId": "29d310af-63b0-4f07-b5b0-fd875ce4f98c",
  "data": {
    "keys": [
      "0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9",
      "0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a",
      "0x034563724e9f2b6fa164bc9cb38279610e1526dd3f6f99bo3e984ff6de13470"
    ],
    "data": ["0x0000000000000000000000000000000000000000000000056bc75e2d63100000"],
    "decodedData": {
      "from": "0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a",
      "to": "0x034563724e9f2b6fa164bc9cb38279610e1526dd3f6f99bo3e984ff6de13470",
      "value": "100000000000000000000"
    }
  },
  "blockNumber": 456790,
  "blockHash": "0x5ba65aed33deac1b47a461b1c1ceec98da833c79e397238c5ce3c48115ba72d",
  "transactionHash": "0x731b11e33a3c3fb290c8d282844928ad0dabb9c8a5be3b8b4a67b2ffd9b8fb9",
  "isProcessed": true,
  "createdAt": "2023-08-15T11:45:23.456Z",
  "contract": {
    "id": "29d310af-63b0-4f07-b5b0-fd875ce4f98c",
    "address": "0x04a8e278e1d3543410c9604a8f3e5486b1a6306c7a89dd448e31da89c346c15a",
    "name": "StarkPulse ERC20",
    "description": "ERC-20 token for StarkPulse platform"
  }
}
```

### Action Endpoints

#### 1. Manually Sync Events for a Contract

**Request:**
```bash
curl -X POST http://localhost:3001/api/blockchain/events/contracts/29d310af-63b0-4f07-b5b0-fd875ce4f98c/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Manual sync completed successfully"
}
```

#### 2. Process Pending Events

**Request:**
```bash
curl -X POST http://localhost:3001/api/blockchain/events/process-pending \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "processedCount": 15
}
```

## Load Testing and Performance Optimization

To ensure the system can handle high event volumes efficiently, we recommend using the following approaches for load testing:

```bash
# Install k6 load testing tool
npm install -g k6

# Create a load test script
cat > event-load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users for 1 minute
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users for 1 minute
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
};

export default function () {
  const url = 'http://localhost:3001/api/blockchain/events/list';
  const params = {
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN',
    },
  };
  
  const res = http.get(url, params);
  check(res, {
    'is status 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
EOF

# Run the load test
k6 run event-load-test.js
```

## Webhook Integration

StarkPulse provides webhook notifications for blockchain events. To configure a webhook:

```bash
curl -X POST http://localhost:3001/api/notifications/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "url": "https://your-app.com/webhooks/blockchain-events",
    "secret": "your_webhook_secret",
    "eventTypes": ["Transfer", "Trade"],
    "contractIds": ["29d310af-63b0-4f07-b5b0-fd875ce4f98c"]
  }'
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<p align="center">
  Built with ❤️ by the StarkPulse Team
</p>

## Wallet Authentication System

The StarkPulse backend implements a secure wallet-based authentication system using StarkNet and Argent X. This system allows users to authenticate using their StarkNet wallets through a secure signature-based process.

### Authentication Flow

1. **Wallet Connection**

   ```typescript
   GET / api / auth / wallet / connect;
   ```

   - Detects and connects to Argent X wallet
   - Returns the connected wallet address

2. **Nonce Generation**

   ```typescript
   POST /api/auth/wallet/nonce
   {
     "address": "0x123...abc"
   }
   ```

   - Generates a unique nonce for signing
   - Includes rate limiting and expiration
   - Returns the nonce to be signed

3. **Signature Verification**
   ```typescript
   POST /api/auth/wallet/verify
   {
     "address": "0x123...abc",
     "signature": ["0x456...def", "0x789...ghi"],
     "nonce": "0x..."
   }
   ```
   - Verifies the wallet signature
   - Creates or retrieves user profile
   - Returns JWT tokens for API access

### Security Features

- **Nonce-based Authentication**

  - Each nonce is unique and time-based
  - Nonces expire after 5 minutes
  - Used only once and cleaned up after verification

- **Rate Limiting**

  - Maximum 3 attempts per 15 minutes
  - Prevents brute force attacks
  - Auto-reset after cooldown period

- **JWT Token Management**

  - Access tokens (1 hour validity)
  - Refresh tokens (7 days validity)
  - Separate secrets for access and refresh tokens

- **Error Handling**
  - Graceful handling of connection failures
  - Clear error messages for users
  - Proper cleanup on failures

### Protected Routes

To protect API routes with wallet authentication:

```typescript
@UseGuards(WalletAuthGuard)
@Get('protected-route')
async protectedRoute(@Wallet() walletAddress: string) {
  // Route implementation
}
```

### Environment Variables

```env
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
STARKNET_NETWORK=testnet
STARKNET_PROVIDER_URL=https://your-provider-url
STARKNET_CHAIN_ID=SN_GOERLI
```

### Dependencies

- `starknet`: ^5.19.5
- `@nestjs/jwt`: ^11.0.0
- `@nestjs/passport`: ^11.0.5

### Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

3. Run the development server:
   ```bash
   npm run start:dev
   ```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

### Security Considerations

1. Always use HTTPS in production
2. Keep JWT secrets secure and rotate regularly
3. Monitor for unusual authentication patterns
4. Regularly update dependencies
5. Follow StarkNet security best practices
## Security Features

The StarkPulse backend implements several security measures to protect against common vulnerabilities and ensure the platform's integrity:

### Input Validation

- **Comprehensive Validation**: All API endpoints use a custom validation pipe that leverages class-validator to ensure data integrity
- **Whitelist Validation**: Only explicitly allowed properties are processed, preventing parameter pollution attacks
- **Detailed Error Responses**: Validation errors return clear, structured feedback without exposing sensitive information

### CSRF Protection

- **Token-based Protection**: Implements a double-submit cookie pattern to prevent Cross-Site Request Forgery attacks
- **Path Exclusions**: Certain endpoints (like webhooks and wallet authentication) are excluded from CSRF checks
- **Safe Methods**: GET, HEAD, and OPTIONS requests are exempt from CSRF validation

### Rate Limiting

- **Authentication Protection**: Login and signup endpoints have strict rate limits to prevent brute force attacks
- **IP-based Tracking**: Rate limits are tracked by IP address and endpoint
- **Configurable Limits**: Different endpoints can have customized rate limit configurations

### Security Headers

- **Content Security Policy (CSP)**: Restricts resource loading to trusted sources
- **X-XSS-Protection**: Enables browser's built-in XSS filtering
- **X-Frame-Options**: Prevents clickjacking by disallowing framing
- **Strict-Transport-Security (HSTS)**: Enforces HTTPS connections
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **Referrer-Policy**: Controls information sent in the Referer header
- **Permissions-Policy**: Restricts browser feature usage

### Security Scanning

- **Automated Scanning**: CI/CD pipeline includes security scanning for early vulnerability detection
- **Dependency Auditing**: npm audit checks for vulnerable dependencies
- **Static Analysis**: ESLint with security plugins analyzes code for potential vulnerabilities
- **OWASP ZAP**: API endpoints are scanned for OWASP Top 10 vulnerabilities
- **Snyk Integration**: Continuous monitoring for new vulnerabilities in dependencies

### Implementation

Security features are implemented as middleware and guards in the NestJS application:

```typescript
// Security headers middleware application
consumer
  .apply(SecurityHeadersMiddleware)
  .forRoutes('*');

// CSRF protection with exclusions
consumer
  .apply(CsrfMiddleware)
  .exclude(
    { path: 'api/health', method: RequestMethod.ALL },
    { path: 'api/auth/wallet/nonce', method: RequestMethod.POST },
    { path: 'api/auth/wallet/verify', method: RequestMethod.POST }
  )
  .forRoutes('*');

// Rate limiting on authentication endpoints
@Post('login')
@HttpCode(HttpStatus.OK)
@UseGuards(RateLimitGuard)
@RateLimit({ points: 10, duration: 3600 })
async login(@Body() loginDto: LoginDto) { ... }