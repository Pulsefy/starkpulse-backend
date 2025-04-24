export default () => ({
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'starkpulse',
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
      logging: process.env.DB_LOGGING === 'true',
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'dev-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
    crypto: {
      apiKeys: {
        coinMarketCap: process.env.COIN_MARKET_CAP_API_KEY || '',
        coinGecko: process.env.COIN_GECKO_API_KEY || '',
      },
    },
  });