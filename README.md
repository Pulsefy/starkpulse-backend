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
│   │   └── wallet.service.ts    # Wallet operations
│   └── dto/
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

## API Endpoints

The API provides the following main endpoint groups:

- **/api/auth**: User authentication and profile management
- **/api/news**: News aggregation and filtering
- **/api/portfolio**: Portfolio tracking and analytics
- **/api/transactions**: Transaction monitoring and history
- **/api/blockchain**: StarkNet blockchain interaction

Detailed API documentation is available via Swagger at `/api/docs` when the server is running.

## Database Schema

The application uses PostgreSQL with the following main entities:

- **Users**: User profiles and authentication data
- **News**: Aggregated news articles and metadata
- **Portfolios**: User portfolio data and historical snapshots
- **Transactions**: Blockchain transaction records
- **Notifications**: User notification preferences and history

## Environment Variables

Key environment variables include:

```
# Application
PORT=3001
NODE_ENV=development

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=starkpulse

# JWT Authentication
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=1d

# StarkNet
STARKNET_PROVIDER_URL=https://alpha-mainnet.starknet.io
STARKNET_NETWORK=mainnet

# News API Keys
NEWS_API_KEY=your_news_api_key
```

## Scripts

- `npm run start`: Start production server
- `npm run start:dev`: Start development server with hot-reload
- `npm run build`: Build for production
- `npm run test`: Run tests
- `npm run test:e2e`: Run end-to-end tests
- `npm run migration:generate`: Generate database migrations
- `npm run migration:run`: Run database migrations

## Blockchain Integration

The backend interacts with StarkNet smart contracts for:

- User authentication
- Portfolio tracking
- Transaction monitoring
- Contract event processing

See the contracts repository for smart contract implementation details.

## Deployment

The application can be deployed using Docker:

```bash
# Build Docker image
docker build -t starkpulse-api .

# Run Docker container
docker run -p 3001:3001 starkpulse-api
```

## Contributing

We welcome contributions to StarkPulse! Please follow these steps:

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Maintainers

- Cedarich 👨‍💻
- Divineifed1 👨‍💻


---

<p align="center">
  Built with ❤️ by the StarkPulse Team
</p>
