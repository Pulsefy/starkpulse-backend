# StarkPulse Backend - Testing Infrastructure Documentation

## Overview

This document outlines the comprehensive testing infrastructure implemented for the StarkPulse backend application. The testing strategy covers unit tests, integration tests, end-to-end tests, performance tests, and automated testing pipelines.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test Types](#test-types)
3. [Test Environment Setup](#test-environment-setup)
4. [Running Tests](#running-tests)
5. [Test Data Management](#test-data-management)
6. [Performance Testing](#performance-testing)
7. [CI/CD Integration](#cicd-integration)
8. [Coverage Reports](#coverage-reports)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Testing Strategy

Our testing strategy follows the test pyramid approach with emphasis on:

- **Unit Tests (70%)**: Fast, isolated tests for individual components
- **Integration Tests (20%)**: Tests for module interactions and database operations
- **End-to-End Tests (10%)**: Complete user journey testing
- **Performance Tests**: Load and stress testing for critical endpoints

### Quality Gates

- **90%+ Code Coverage**: Enforced across all modules
- **Performance Benchmarks**: Response times < 500ms for 95% of requests
- **Error Rate**: < 1% for all test scenarios
- **Zero Critical Security Vulnerabilities**

## Test Types

### 1. Unit Tests

**Location**: `src/**/*.spec.ts`

**Purpose**: Test individual components, services, and utilities in isolation.

**Example**:

```bash
npm run test:unit
```

**Configuration**: `jest.config.js`

### 2. Integration Tests

**Location**: `test/integration/*.integration.spec.ts`

**Purpose**: Test interactions between modules, database operations, and external services.

**Key Features**:

- Database integration with TestContainers
- Redis integration testing
- Blockchain service mocking
- Cross-module communication testing

**Example**:

```bash
npm run test:integration
```

**Configuration**: `test/jest-integration.json`

### 3. End-to-End Tests

**Location**: `test/e2e/*.e2e-spec.ts`

**Purpose**: Test complete user workflows and API endpoints.

**Coverage**:

- Portfolio management flows
- Transaction monitoring
- Notification systems
- Authentication workflows
- Analytics endpoints

**Example**:

```bash
npm run test:e2e
```

**Configuration**: `test/jest-e2e.json`

### 4. Performance Tests

**Location**: `test/load-testing/`

**Tools**:

- **k6**: For load testing and performance monitoring
- **Artillery**: For complex scenario testing

**Example**:

```bash
npm run test:performance
npm run test:load
```

## Test Environment Setup

### Prerequisites

1. **Node.js 18+**
2. **Docker**: For TestContainers (PostgreSQL, Redis)
3. **k6**: For performance testing
4. **Artillery**: For load testing

### Environment Variables

Create a `.env.test` file:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=starkpulse_test
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Blockchain
STARKNET_RPC_URL=http://localhost:5050
BLOCKCHAIN_NETWORK=testnet

# JWT
JWT_SECRET=test-secret-key-for-testing-only

# API
API_PORT=3001
API_HOST=localhost
```

### Database Setup

The testing infrastructure automatically manages test databases using TestContainers:

```typescript
// Automatic database setup
const testEnvironment = new TestEnvironment();
await testEnvironment.setup(); // Creates PostgreSQL + Redis containers
```

### Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Start PostgreSQL
docker run -d --name postgres-test -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15

# Start Redis
docker run -d --name redis-test -p 6379:6379 redis:7

# Run migrations
npm run migration:run

# Seed test data
npm run test:seed
```

## Running Tests

### Quick Commands

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests for specific module
npm run test -- portfolio
npm run test -- --testPathPattern=notifications
```

### Detailed Commands

```bash
# Unit tests only
npm run test:unit

# Integration tests with database
npm run test:integration

# E2E tests (requires running application)
npm run test:e2e

# Performance tests with k6
npm run test:performance

# Load tests with Artillery
npm run test:load

# All tests with coverage report
npm run test:coverage

# Check coverage thresholds
npm run test:coverage:check

# Generate HTML coverage report
npm run coverage:report
```

### Test Execution Flow

1. **Setup Phase**:

   - Start TestContainers (PostgreSQL, Redis)
   - Run database migrations
   - Seed test data

2. **Test Execution**:

   - Run test suites in parallel
   - Collect coverage data
   - Generate reports

3. **Cleanup Phase**:
   - Clear test data
   - Stop containers
   - Generate final reports

## Test Data Management

### Test Data Factory

**Location**: `test/fixtures/test-data-factory.ts`

Provides factory methods for creating test data:

```typescript
// Create test user
const user = TestDataFactory.createUser();

// Create portfolio with assets
const { user, assets } = TestDataFactory.createUserWithAssets(userOverrides, 5);

// Create bulk data
const users = TestDataFactory.createBulkUsers(100);
```

### Database Seeder

**Location**: `test/fixtures/database-seeder.ts`

Manages test data lifecycle:

```typescript
const seeder = new DatabaseSeeder(testEnvironment);

// Seed data
await seeder.seedUser();
await seeder.seedPortfolioAssets(10, { userId: user.id });

// Clear data
await seeder.clearAll();
```

### Test Data Scenarios

**Realistic Scenarios**:

- Users with diverse portfolio compositions
- Transaction histories with various statuses
- Notification preferences and history
- Market data with historical trends

**Edge Cases**:

- Empty portfolios
- Failed transactions
- Network timeouts
- Invalid data formats

## Performance Testing

### k6 Load Testing

**Configuration**: `test/load-testing/k6-load-test.js`

**Test Scenarios**:

- Portfolio operations (40% traffic)
- Transaction monitoring (30% traffic)
- Notifications (20% traffic)
- Market data (10% traffic)

**Performance Targets**:

- Response time: 95% < 500ms
- Error rate: < 1%
- Throughput: 100+ RPS
- Concurrent users: 50+

**Run Performance Tests**:

```bash
# Default load test
npm run test:performance

# Custom k6 test
k6 run test/load-testing/k6-load-test.js

# With environment variables
BASE_URL=http://localhost:3000 k6 run test/load-testing/k6-load-test.js
```

### Artillery Load Testing

**Configuration**: `test/load-testing/artillery-config.yml`

**Advanced Scenarios**:

- Multi-phase load testing
- User journey simulation
- Performance regression testing

**Run Artillery Tests**:

```bash
# Default artillery test
npm run test:load

# Custom artillery test
artillery run test/load-testing/artillery-config.yml

# Generate HTML report
artillery run --output report.json test/load-testing/artillery-config.yml
artillery report report.json
```

## CI/CD Integration

### GitHub Actions Workflow

**Location**: `.github/workflows/ci-cd.yml`

**Pipeline Stages**:

1. **Lint and Format**: Code quality checks
2. **Unit Tests**: Fast isolated tests
3. **Integration Tests**: Database and service integration
4. **E2E Tests**: Complete workflow testing
5. **Performance Tests**: Load and stress testing (main branch only)
6. **Coverage Report**: Aggregate coverage analysis
7. **Security Scan**: Vulnerability assessment
8. **Build and Deploy**: Production deployment (main branch only)

### Pipeline Configuration

**Parallel Execution**: Tests run in parallel for faster feedback

**Service Dependencies**:

- PostgreSQL 15
- Redis 7
- Application runtime

**Environment Variables**: Configured per pipeline stage

**Artifacts**:

- Test reports
- Coverage reports
- Performance metrics
- Build artifacts

### Quality Gates

**Merge Requirements**:

- All tests must pass
- Coverage > 90%
- No lint errors
- Security scan pass
- Performance benchmarks met

## Coverage Reports

### Coverage Configuration

**Jest Configuration**: Enforces 90%+ coverage across:

- Statements: 90%
- Branches: 90%
- Functions: 90%
- Lines: 90%

### Coverage Commands

```bash
# Generate coverage report
npm run test:coverage

# Check coverage thresholds
npm run test:coverage:check

# Generate HTML report
npm run coverage:report

# View coverage in browser
open coverage/lcov-report/index.html
```

### Coverage Integration

**Codecov Integration**: Automatic upload to Codecov for tracking

**PR Comments**: Coverage changes commented on pull requests

**Badge**: Coverage badge in README

## Best Practices

### Writing Tests

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Descriptive Names**: Use clear, descriptive test names
3. **Single Responsibility**: One assertion per test when possible
4. **Mock External Dependencies**: Use proper mocking for external services
5. **Clean Setup/Teardown**: Proper test data lifecycle management

### Test Organization

1. **Logical Grouping**: Group related tests in describe blocks
2. **Shared Setup**: Use beforeAll/beforeEach for common setup
3. **Test Isolation**: Each test should be independent
4. **Resource Cleanup**: Always clean up resources after tests

### Performance Considerations

1. **Parallel Execution**: Run tests in parallel when possible
2. **Database Optimization**: Use transactions for faster rollback
3. **Mock Heavy Operations**: Mock expensive operations in unit tests
4. **Resource Limits**: Set appropriate timeouts and resource limits

### Data Management

1. **Deterministic Data**: Use consistent test data
2. **Isolation**: Isolate test data between test runs
3. **Realistic Scenarios**: Create realistic test scenarios
4. **Edge Cases**: Include edge cases and error conditions

## Troubleshooting

### Common Issues

#### Test Database Connection Errors

```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# Restart test environment
npm run test:db:restart
```

#### Redis Connection Issues

```bash
# Check Redis container
docker ps | grep redis

# Test Redis connection
redis-cli -h localhost -p 6379 ping
```

#### Performance Test Failures

```bash
# Check application startup
curl http://localhost:3000/health

# Verify test data
npm run test:seed
```

#### Coverage Threshold Failures

```bash
# Generate detailed coverage report
npm run coverage:report

# Identify uncovered code
open coverage/lcov-report/index.html
```

### Debugging Tests

#### Debug Single Test

```bash
# Run specific test file
npm run test -- test/e2e/portfolio.e2e-spec.ts

# Run with debug output
DEBUG=true npm run test -- portfolio

# Run single test case
npm run test -- --testNamePattern="should create portfolio"
```

#### Debug Test Environment

```bash
# Start test environment manually
npm run test:env:start

# Check container logs
docker logs $(docker ps -q --filter name=postgres-test)
docker logs $(docker ps -q --filter name=redis-test)

# Stop test environment
npm run test:env:stop
```

### Performance Debugging

#### Identify Slow Tests

```bash
# Run tests with timing
npm run test -- --verbose

# Profile test execution
NODE_ENV=test npm run test -- --detectSlowTests
```

#### Database Performance

```bash
# Check database query performance
npm run test:integration -- --verbose

# Optimize test data
npm run test:data:optimize
```

## Additional Resources

### Documentation Links

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TestContainers](https://testcontainers.com/)
- [k6 Documentation](https://k6.io/docs/)
- [Artillery Documentation](https://artillery.io/docs/)

### Internal Links

- [API Documentation](./API.md)
- [Development Setup](./DEVELOPMENT.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

### Support

For testing-related questions:

1. Check this documentation
2. Review existing test examples
3. Create an issue in the repository
4. Contact the development team

---

**Last Updated**: July 2025
**Version**: 1.0.0
**Maintainer**: StarkPulse Development Team
