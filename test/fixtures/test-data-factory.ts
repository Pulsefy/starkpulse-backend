import { faker } from '@faker-js/faker';
import { User } from '../../src/users/entities/user.entity';
import {
  PortfolioAsset,
  AssetType,
} from '../../src/portfolio/entities/portfolio-asset.entity';
import { Notification } from '../../src/notifications/entities/notification.entity';
import { Transaction } from '../../src/transactions/entities/transaction.entity';
import { Portfolio } from '../../src/portfolio/entities/portfolio.entity';
import { TokenPrice } from '../../src/price/entities/token-price.entity';

export class TestDataFactory {
  static createUser(overrides: Partial<User> = {}): User {
    const user = new User();
    user.id = faker.string.uuid();
    user.username = faker.internet.userName();
    user.walletAddress = `0x${faker.string.hexadecimal({ length: 40, prefix: '' })}`;
    user.createdAt = faker.date.past();
    user.updatedAt = faker.date.recent();

    return Object.assign(user, overrides);
  }

  static createPortfolioAsset(
    overrides: Partial<PortfolioAsset> = {},
  ): PortfolioAsset {
    const asset = new PortfolioAsset();
    asset.id = faker.string.uuid();
    asset.userId = faker.string.uuid();
    asset.assetAddress = `0x${faker.string.hexadecimal({ length: 40, prefix: '' })}`;
    asset.symbol = faker.helpers.arrayElement([
      'ETH',
      'STRK',
      'USDC',
      'USDT',
      'BTC',
    ]);
    asset.name = faker.company.name() + ' Token';
    asset.balance = faker.number
      .float({ min: 0.01, max: 1000, multipleOf: 0.01 })
      .toString();
    asset.decimals = 18;
    asset.assetType = faker.helpers.arrayElement(Object.values(AssetType));
    asset.isHidden = false;
    asset.lastUpdated = faker.date.recent();
    asset.createdAt = faker.date.past();
    asset.metadata = {
      priceUsd: faker.number.float({ min: 0.1, max: 50000, multipleOf: 0.01 }),
      valueUsd: faker.number.float({ min: 1, max: 50000, multipleOf: 0.01 }),
    };

    return Object.assign(asset, overrides);
  }

  static createNotification(
    overrides: Partial<Notification> = {},
  ): Notification {
    const notification = new Notification();
    notification.id = faker.string.uuid();
    notification.title = faker.lorem.sentence();
    notification.content = faker.lorem.paragraph();
    notification.read = faker.datatype.boolean();
    notification.channel = faker.helpers.arrayElement([
      'in_app',
      'email',
      'push',
      'sms',
    ]);
    notification.metadata = {
      source: faker.helpers.arrayElement([
        'system',
        'transaction',
        'price_alert',
      ]),
      priority: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH']),
    };
    notification.createdAt = faker.date.past();
    notification.updatedAt = faker.date.recent();

    return Object.assign(notification, overrides);
  }

  static createTransaction(overrides: Partial<Transaction> = {}): Transaction {
    const transaction = new Transaction();
    transaction.id = faker.string.uuid();
    transaction.transactionHash = `0x${faker.string.hexadecimal({ length: 64, prefix: '' })}`;
    transaction.status = faker.helpers.arrayElement([
      'pending',
      'confirmed',
      'failed',
    ]);
    transaction.blockNumber = faker.number.int({ min: 1000000, max: 2000000 });
    transaction.fromAddress = `0x${faker.string.hexadecimal({ length: 40, prefix: '' })}`;
    transaction.toAddress = `0x${faker.string.hexadecimal({ length: 40, prefix: '' })}`;
    transaction.value = faker.number.float({
      min: 0,
      max: 1000,
      multipleOf: 0.000001,
    });
    transaction.tokenSymbol = faker.finance.currencyCode();
    transaction.tokenAddress = `0x${faker.string.hexadecimal({ length: 40, prefix: '' })}`;
    transaction.blockTimestamp = faker.date.past();
    transaction.confirmations = faker.number.int({ min: 0, max: 100 });
    transaction.retries = faker.number.int({ min: 0, max: 5 });
    transaction.method = faker.helpers.arrayElement([
      'transfer',
      'approve',
      'swap',
      'stake',
    ]);
    transaction.metadata = {
      gasUsed: faker.number.int({ min: 21000, max: 500000 }),
      gasPrice: faker.number.int({ min: 1000000000, max: 100000000000 }),
    };
    transaction.createdAt = faker.date.past();
    transaction.updatedAt = faker.date.recent();

    return Object.assign(transaction, overrides);
  }

  static createPortfolio(overrides: Partial<Portfolio> = {}): Portfolio {
    const portfolio = new Portfolio();
    portfolio.id = faker.string.uuid();
    portfolio.walletAddress = `0x${faker.string.hexadecimal({ length: 40, prefix: '' })}`;
    portfolio.totalValueUsd = faker.number.float({
      min: 0,
      max: 1000000,
      multipleOf: 0.01,
    });
    portfolio.assetCount = faker.number.int({ min: 1, max: 100 });
    portfolio.lastUpdated = faker.date.recent();
    portfolio.createdAt = faker.date.past();
    portfolio.updatedAt = faker.date.recent();

    return Object.assign(portfolio, overrides);
  }

  static createTokenPrice(overrides: Partial<TokenPrice> = {}): TokenPrice {
    const tokenPrice = new TokenPrice();
    tokenPrice.id = faker.string.uuid();
    tokenPrice.tokenAddress = `0x${faker.string.hexadecimal({ length: 40, prefix: '' })}`;
    tokenPrice.tokenSymbol = faker.finance.currencyCode();
    tokenPrice.tokenName = faker.finance.currencyName();
    tokenPrice.priceUsd = faker.number.float({
      min: 0.000001,
      max: 10000,
      multipleOf: 0.000001,
    });
    tokenPrice.marketCap = faker.number.float({
      min: 1000000,
      max: 1000000000000,
      multipleOf: 0.01,
    });
    tokenPrice.volume24h = faker.number.float({
      min: 100000,
      max: 100000000000,
      multipleOf: 0.01,
    });
    tokenPrice.change24h = faker.number.float({
      min: -50,
      max: 50,
      multipleOf: 0.01,
    });
    tokenPrice.lastUpdated = faker.date.recent();
    tokenPrice.createdAt = faker.date.past();
    tokenPrice.updatedAt = faker.date.recent();

    return Object.assign(tokenPrice, overrides);
  }

  static createBulkUsers(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.createUser(overrides));
  }

  static createBulkPortfolioAssets(
    count: number,
    userId: string,
    overrides: Partial<PortfolioAsset> = {},
  ): PortfolioAsset[] {
    return Array.from({ length: count }, () =>
      this.createPortfolioAsset({ userId, ...overrides }),
    );
  }

  static createBulkNotifications(
    count: number,
    overrides: Partial<Notification> = {},
  ): Notification[] {
    return Array.from({ length: count }, () =>
      this.createNotification(overrides),
    );
  }

  static createBulkTransactions(
    count: number,
    overrides: Partial<Transaction> = {},
  ): Transaction[] {
    return Array.from({ length: count }, () =>
      this.createTransaction(overrides),
    );
  }

  // Realistic test scenarios
  static createRealisticPortfolio(userId: string): {
    assets: PortfolioAsset[];
  } {
    const assets = [
      this.createPortfolioAsset({
        userId,
        symbol: 'ETH',
        balance: '5.25',
        metadata: {
          priceUsd: 2000.0,
          valueUsd: 10500.0,
        },
      }),
      this.createPortfolioAsset({
        userId,
        symbol: 'STRK',
        balance: '1000.0',
        metadata: {
          priceUsd: 1.5,
          valueUsd: 1500.0,
        },
      }),
      this.createPortfolioAsset({
        userId,
        symbol: 'USDC',
        balance: '2500.0',
        metadata: {
          priceUsd: 1.0,
          valueUsd: 2500.0,
        },
      }),
    ];

    return { assets };
  }

  static createUserWithPortfolio(
    userOverrides: Partial<User> = {},
    portfolioOverrides: Partial<Portfolio> = {},
  ) {
    const user = this.createUser(userOverrides);
    const portfolio = this.createPortfolio({
      walletAddress: user.walletAddress,
      ...portfolioOverrides,
    });
    return { user, portfolio };
  }

  static createUserWithTransactions(
    userOverrides: Partial<User> = {},
    transactionCount: number = 5,
  ) {
    const user = this.createUser(userOverrides);
    const transactions = Array.from({ length: transactionCount }, () =>
      this.createTransaction({
        userId: user.id,
      }),
    );
    return { user, transactions };
  }
}
