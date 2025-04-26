import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(true),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  JWT_ACCESS_TOKEN_EXPIRES_IN: Joi.string().default('1d'),
  JWT_REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('1d'),
  COIN_MARKET_CAP_API_KEY: Joi.string().optional(),
  COIN_GECKO_API_KEY: Joi.string().optional(),
});